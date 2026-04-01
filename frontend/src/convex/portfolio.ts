import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    const items = await ctx.db.query("portfolio_items").order("desc").take(50);
    const result = await Promise.all(items.map(async (item) => {
      const barber = await ctx.db.query("users").withIndex("by_user_id", q => q.eq("user_id", item.barber_id)).first();
      let mainUrl = item.url || "";
      if (!mainUrl && item.media && item.media.length > 0) {
        mainUrl = item.media[0].url;
      }
      return {
        ...item,
        image_id: item._id,
        url: mainUrl,
        barber_name: barber?.name || "Barbero",
        barber_avatar: barber?.picture || "",
      };
    }));
    return result;
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
