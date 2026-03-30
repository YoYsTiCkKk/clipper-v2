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
    return items;
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
