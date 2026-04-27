import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const PORTFOLIO_LIMITS: Record<string, number> = {
  trial:          5,
  expired:        3,
  personal_basic: 15,
  personal_pro:   Infinity,
  business_basic: Infinity,
  business_pro:   Infinity,
};

function getPlanKey(bp: any): string {
  const status = bp?.subscription_status;
  if (!status || status === "trial") return "trial";
  if (status === "expired" || status === "cancelled") return "expired";
  if (status === "active" && bp?.subscription_plan) return bp.subscription_plan;
  return "expired";
}

export const getBarberPortfolio = query({
  args: { barber_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("portfolio_items")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .collect();
  }
});

export const getGlobalFeed = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("portfolio_items").order("desc").take(100);
    const now = new Date().toISOString();
    const result = await Promise.all(items.map(async (item) => {
      const barber = await ctx.db.query("users").withIndex("by_user_id", q => q.eq("user_id", item.barber_id)).first();
      let mainUrl = item.url || "";
      if (!mainUrl && item.media && item.media.length > 0) {
        mainUrl = item.media[0].url;
      }
      const isBoosted = !!(item.boosted_until && item.boosted_until > now);
      return {
        ...item,
        image_id: item._id,
        url: mainUrl,
        barber_name: barber?.name || "Barbero",
        barber_avatar: barber?.picture || "",
        is_boosted: isBoosted,
        boosted_until: item.boosted_until || null,
      };
    }));
    // Boosted posts first, then by creation order (desc)
    return result.sort((a, b) => {
      if (a.is_boosted && !b.is_boosted) return -1;
      if (!a.is_boosted && b.is_boosted) return 1;
      return 0;
    });
  }
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    return await ctx.storage.generateUploadUrl();
  },
});

export const addPortfolioPost = mutation({
  args: {
    description: v.optional(v.string()),
    media: v.array(
      v.object({
        storageId: v.optional(v.id("_storage")),
        url: v.optional(v.string()),
        type: v.string(),
      })
    )
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");

    // Check portfolio limit
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
      .first();
    if (user) {
      const planKey = getPlanKey(user.barber_profile);
      const limit = PORTFOLIO_LIMITS[planKey] ?? 3;
      if (limit !== Infinity) {
        const existing = await ctx.db
          .query("portfolio_items")
          .withIndex("by_barber", (q) => q.eq("barber_id", identity.subject))
          .collect();
        if (existing.length >= limit) {
          throw new Error(`PORTFOLIO_LIMIT_REACHED:${limit}`);
        }
      }
    }

    const processedMedia = await Promise.all(
      args.media.map(async (m) => {
        if (m.storageId) {
          const url = await ctx.storage.getUrl(m.storageId);
          if (!url) throw new Error(`Storage URL no generada para ${m.storageId}`);
          return { url, storageId: m.storageId, type: m.type };
        }
        if (m.url) {
           return { url: m.url, type: m.type };
        }
        throw new Error("Falta url o storageId");
      })
    );

    return await ctx.db.insert("portfolio_items", {
      barber_id: identity.subject,
      description: args.description,
      media: processedMedia
    });
  }
});

// Boost a specific post — sets boosted_until = now + 7 days
// (Payment is handled client-side via Stripe; this is called after payment confirmed)
export const boostPost = mutation({
  args: { post_id: v.id("portfolio_items") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    const item = await ctx.db.get(args.post_id);
    if (!item) throw new Error("Post no encontrado");
    if (item.barber_id !== identity.subject) throw new Error("Acceso denegado");
    const boostedUntil = new Date();
    boostedUntil.setDate(boostedUntil.getDate() + 7);
    await ctx.db.patch(args.post_id, { boosted_until: boostedUntil.toISOString() });
    return { boosted_until: boostedUntil.toISOString() };
  },
});

export const deletePortfolioImage = mutation({
  args: { id: v.id("portfolio_items") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    const item = await ctx.db.get(args.id);
    if (!item) return;
    if (item.barber_id !== identity.subject) throw new Error("Acceso denegado");
    
    // Eliminar archivos de storage si existen
    if (item.media) {
      for (const m of item.media) {
        if (m.storageId) {
          await ctx.storage.delete(m.storageId);
        }
      }
    }
    
    await ctx.db.delete(args.id);
  }
});

export const toggleSaveStyle = mutation({
  args: { image_id: v.id("portfolio_items") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    
    const existing = await ctx.db
      .query("saved_styles")
      .withIndex("by_client", q => q.eq("client_id", identity.subject))
      .filter(q => q.eq(q.field("portfolio_item_id"), args.image_id))
      .first();
      
    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    } else {
      await ctx.db.insert("saved_styles", {
        client_id: identity.subject,
        portfolio_item_id: args.image_id,
        created_at: new Date().toISOString()
      });
      return { saved: true };
    }
  }
});
