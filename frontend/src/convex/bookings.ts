import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const PLAN_LIMITS: Record<string, number> = {
  trial:          Infinity,
  expired:        15,
  personal_basic: 40,
  personal_pro:   120,
  business_basic: 300,
  business_pro:   Infinity,
};

function getBarberPlanKey(bp: any): string {
  const status = bp?.subscription_status;
  if (!status || status === "trial") return "trial";
  if (status === "expired" || status === "cancelled") return "expired";
  if (status === "active" && bp?.subscription_plan) return bp.subscription_plan;
  return "expired";
}

// Crear una reserva
export const createBooking = mutation({
  args: {
    barber_id: v.string(),
    service_id: v.string(),
    date: v.string(),
    time: v.string(),
    payment_method: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");

    const client = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();

    if (!client) throw new Error("Cliente no encontrado");

    const barber = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.barber_id))
      .first();

    if (!barber) throw new Error("Barbero no encontrado");

    // Check barber's monthly booking limit
    const planKey = getBarberPlanKey(barber.barber_profile);
    const bookingLimit = PLAN_LIMITS[planKey] ?? 15;
    if (bookingLimit !== Infinity) {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthBookings = await ctx.db
        .query("bookings")
        .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
        .collect();
      const count = monthBookings.filter(
        (b) => b.date >= monthStart && b.status !== "cancelled"
      ).length;
      if (count >= bookingLimit) {
        throw new Error(`BOOKING_LIMIT_REACHED:${bookingLimit}`);
      }
    }

    // NOTA: Para MVP simplificado, mockeamos el servicio
    const service_name = "Corte Básico";
    const total_amount = 15;

    return await ctx.db.insert("bookings", {
      client_id: client.user_id,
      barber_id: barber.user_id,
      service_id: args.service_id,
      service_name: service_name,
      barber_name: barber.name,
      client_name: client.name,
      date: args.date,
      time: args.time,
      status: args.payment_method === "cash" ? "pending" : "confirmed",
      total_amount: total_amount,
      payment_method: args.payment_method
    });
  }
});

// Obtener Mis Reservas (reactivo)
export const getMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();
      
    if (!user) return [];

    const field = user.role === "barber" ? "by_barber" : "by_client";
    const matchField = user.role === "barber" ? "barber_id" : "client_id";

    // Convex actualizará automáticamente la UI del cliente o barbero al haber cambios
    return await ctx.db
      .query("bookings")
      .withIndex(field, (q) => q.eq(matchField, user.user_id))
      .collect();
  }
});

// Actualizar estado (para barbero o cliente cancelar)
export const updateStatus = mutation({
  args: {
    booking_id: v.id("bookings"),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");

    const booking = await ctx.db.get(args.booking_id);
    if (!booking) throw new Error("Reserva no encontrada");

    // Seguridad base (podemos mejorar comprobando IDs exactos)
    await ctx.db.patch(args.booking_id, { status: args.status });
    return true;
  }
});
