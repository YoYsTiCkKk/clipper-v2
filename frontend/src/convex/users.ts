import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Sincronizar usuario desde Clerk al iniciar sesión o registrarse
export const storeUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("client"), v.literal("barber")),
    picture: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("No autenticado en Clerk");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();

    if (existingUser) {
      let changed = false;
      const upd: any = {};
      if (existingUser.name !== args.name) { upd.name = args.name; changed = true; }
      if (existingUser.picture !== args.picture) { upd.picture = args.picture; changed = true; }
      // Permitir upgrade a barbero
      if (existingUser.role === "client" && args.role === "barber") {
        upd.role = "barber";
        if (!existingUser.barber_profile) {
          upd.barber_profile = { bio: "", rating: 0, address: "", offers_home_service: false };
        }
        changed = true;
      }
      
      if (changed) {
        await ctx.db.patch(existingUser._id, upd);
      }
      return existingUser._id;
    }

    // Crear nuevo
    return await ctx.db.insert("users", {
      user_id: identity.subject,
      email: args.email,
      name: args.name,
      role: args.role,
      picture: args.picture,
      credits: 0,
      barber_profile: args.role === "barber" ? {
        bio: "",
        rating: 0,
        address: "",
        offers_home_service: false
      } : undefined
    });
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();

    if (user) {
      const savedStyles = await ctx.db
        .query("saved_styles")
        .withIndex("by_client", q => q.eq("client_id", identity.subject))
        .collect();
      return { ...user, saved_styles: savedStyles.map(s => s.portfolio_item_id) };
    }
    return null;
  },
});

// Obtener todos los barberos para el explorador
export const getBarbers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "barber"))
      .collect();
  },
});

// Actualizar Perfil de Barbero
export const updateBarberProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    address: v.optional(v.string()),
    offers_home_service: v.optional(v.boolean()),
    home_service_fee: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();

    if (!user || user.role !== "barber") throw new Error("Acceso denegado");

    const upd: any = {};
    if (args.name) upd.name = args.name;
    if (args.phone) upd.phone = args.phone;

    let profile = user.barber_profile || { bio: "", rating: 5, address: "", offers_home_service: false };
    
    if (args.bio !== undefined) profile.bio = args.bio;
    if (args.address !== undefined) profile.address = args.address;
    if (args.offers_home_service !== undefined) profile.offers_home_service = args.offers_home_service;
    if (args.home_service_fee !== undefined) profile.home_service_fee = args.home_service_fee;
    
    if (args.lat !== undefined && args.lng !== undefined) {
      profile.location = {
        type: "Point",
        coordinates: [args.lng, args.lat]
      };
    }

    upd.barber_profile = profile;

    await ctx.db.patch(user._id, upd);
    return true;
  }
});

export const getBarber = query({
  args: { barber_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.barber_id))
      .first();
  }
});

// Guardar horario semanal completo (lunes=1 a domingo=7)
export const updateWeeklySchedule = mutation({
  args: {
    // Objeto con claves "1"-"7", each { available, start_hour, end_hour }
    schedule: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");
    const user = await ctx.db.query("users").withIndex("by_user_id", q => q.eq("user_id", identity.subject)).first();
    if (!user || user.role !== "barber") throw new Error("Acceso denegado");
    
    const profile = user.barber_profile || { bio: "", rating: 0, address: "", offers_home_service: false };
    profile.weekly_schedule = args.schedule;
    
    await ctx.db.patch(user._id, { barber_profile: profile });
  }
});

// Agregar/modificar excepción de fecha específica (festivo, día libre, horario especial)
export const updateDateOverride = mutation({
  args: {
    date: v.string(), // YYYY-MM-DD
    available: v.boolean(),
    start_hour: v.optional(v.number()),
    end_hour: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");
    const user = await ctx.db.query("users").withIndex("by_user_id", q => q.eq("user_id", identity.subject)).first();
    if (!user || user.role !== "barber") throw new Error("Acceso denegado");
    
    const profile = user.barber_profile || { bio: "", rating: 0, address: "", offers_home_service: false };
    const custom_schedule = profile.custom_schedule || {};
    
    if (args.available) {
      custom_schedule[args.date] = {
        available: true,
        start_hour: args.start_hour ?? 9,
        end_hour: args.end_hour ?? 19,
      };
    } else {
      custom_schedule[args.date] = { available: false };
    }
    
    profile.custom_schedule = custom_schedule;
    await ctx.db.patch(user._id, { barber_profile: profile });
  }
});

// Eliminar excepción de fecha (vuelve al horario semanal por defecto)
export const removeDateOverride = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    const user = await ctx.db.query("users").withIndex("by_user_id", q => q.eq("user_id", identity.subject)).first();
    if (!user || user.role !== "barber") return;
    
    const profile = user.barber_profile || { bio: "", rating: 0, address: "", offers_home_service: false };
    if (profile.custom_schedule && profile.custom_schedule[args.date]) {
      const custom_schedule = profile.custom_schedule;
      delete custom_schedule[args.date];
      profile.custom_schedule = custom_schedule;
      await ctx.db.patch(user._id, { barber_profile: profile });
    }
  }
});

// Obtener el horario completo de un barbero (weekly + overrides)
export const getBarberSchedule = query({
  args: { barber_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.barber_id))
      .first();
    if (!user || !user.barber_profile) return null;
    return {
      weekly_schedule: user.barber_profile.weekly_schedule || {},
      custom_schedule: user.barber_profile.custom_schedule || {},
    };
  }
});

// ==================== SUBSCRIPTION SYSTEM ====================

const PLAN_LIMITS: Record<string, { bookings: number; portfolio: number }> = {
  trial:          { bookings: Infinity, portfolio: 5 },
  expired:        { bookings: 15,       portfolio: 3 },
  personal_basic: { bookings: 40,       portfolio: 15 },
  personal_pro:   { bookings: 120,      portfolio: Infinity },
  business_basic: { bookings: 300,      portfolio: Infinity },
  business_pro:   { bookings: Infinity, portfolio: Infinity },
};

function getPlanKey(bp: any): string {
  const status = bp?.subscription_status;
  if (!status || status === "trial") return "trial";
  if (status === "expired" || status === "cancelled") return "expired";
  if (status === "active" && bp?.subscription_plan) return bp.subscription_plan;
  return "expired";
}

// Set 30-day trial when a barber registers
export const setTrialOnRegistration = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();

    if (!user || user.role !== "barber") throw new Error("Acceso denegado");

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const profile = user.barber_profile || { bio: "", rating: 0, address: "", offers_home_service: false };
    profile.subscription_status = "trial";
    profile.trial_end_date = trialEnd.toISOString().split("T")[0];

    await ctx.db.patch(user._id, { barber_profile: profile });
    return { trial_end_date: profile.trial_end_date };
  },
});

// Get full subscription status + usage for the current barber
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();

    if (!user || user.role !== "barber") return null;

    const bp = user.barber_profile;
    const planKey = getPlanKey(bp);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.expired;

    // Count bookings this calendar month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_barber", (q) => q.eq("barber_id", user.user_id))
      .collect();
    const monthlyBookings = allBookings.filter(
      (b) => b.date >= monthStart && b.status !== "cancelled"
    ).length;

    // Count portfolio items
    const portfolioCount = (
      await ctx.db
        .query("portfolio_items")
        .withIndex("by_barber", (q) => q.eq("barber_id", user.user_id))
        .collect()
    ).length;

    // Days remaining in trial
    let trialDaysLeft: number | null = null;
    if (bp?.subscription_status === "trial" && bp?.trial_end_date) {
      const end = new Date(bp.trial_end_date);
      trialDaysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
    }

    return {
      status: bp?.subscription_status || "trial",
      plan: bp?.subscription_plan || null,
      planKey,
      trial_end_date: bp?.trial_end_date || null,
      subscription_end_date: bp?.subscription_end_date || null,
      trialDaysLeft,
      limits: {
        bookings: limits.bookings === Infinity ? null : limits.bookings,
        portfolio: limits.portfolio === Infinity ? null : limits.portfolio,
      },
      usage: {
        bookings: monthlyBookings,
        portfolio: portfolioCount,
      },
    };
  },
});

// Called on dashboard load — expire trial if past end date
export const checkAndExpireTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();

    if (!user || user.role !== "barber") return;

    const bp = user.barber_profile;
    if (bp?.subscription_status !== "trial" || !bp?.trial_end_date) return;

    const today = new Date().toISOString().split("T")[0];
    if (today > bp.trial_end_date) {
      bp.subscription_status = "expired";
      await ctx.db.patch(user._id, { barber_profile: bp });
    }
  },
});

// Called after Stripe webhook confirms subscription payment
export const activateSubscription = mutation({
  args: {
    plan: v.union(
      v.literal("personal_basic"),
      v.literal("personal_pro"),
      v.literal("business_basic"),
      v.literal("business_pro")
    ),
    stripe_customer_id: v.optional(v.string()),
    stripe_subscription_id: v.optional(v.string()),
    end_date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();

    if (!user || user.role !== "barber") throw new Error("Acceso denegado");

    const bp = user.barber_profile || { bio: "", rating: 0, address: "", offers_home_service: false };
    bp.subscription_status = "active";
    bp.subscription_plan = args.plan;
    if (args.stripe_customer_id) bp.stripe_customer_id = args.stripe_customer_id;
    if (args.stripe_subscription_id) bp.stripe_subscription_id = args.stripe_subscription_id;
    if (args.end_date) bp.subscription_end_date = args.end_date;

    await ctx.db.patch(user._id, { barber_profile: bp });
    return true;
  },
});

// One-time migration: give all existing barbers a 30-day trial from today
export const migrateExistingBarbers = mutation({
  args: {},
  handler: async (ctx) => {
    const barbers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "barber"))
      .collect();

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    const trialEndStr = trialEnd.toISOString().split("T")[0];

    let migrated = 0;
    for (const barber of barbers) {
      const bp = barber.barber_profile;
      if (!bp?.subscription_status) {
        const updated = {
          ...bp,
          bio: bp?.bio || "",
          rating: bp?.rating || 0,
          address: bp?.address || "",
          offers_home_service: bp?.offers_home_service || false,
          subscription_status: "trial" as const,
          trial_end_date: trialEndStr,
        };
        await ctx.db.patch(barber._id, { barber_profile: updated });
        migrated++;
      }
    }
    return { migrated };
  },
});

// Utility: get plan limits for a barber_id (used by bookings/portfolio mutations)
export const getBarberPlanLimits = query({
  args: { barber_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.barber_id))
      .first();
    if (!user) return null;
    const planKey = getPlanKey(user.barber_profile);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.expired;
    return {
      planKey,
      bookingLimit: limits.bookings === Infinity ? null : limits.bookings,
      portfolioLimit: limits.portfolio === Infinity ? null : limits.portfolio,
    };
  },
});
