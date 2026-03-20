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

export const addPortfolioImage = mutation({
  args: { url: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    return await ctx.db.insert("portfolio_items", {
      barber_id: identity.subject,
      url: args.url,
      description: args.description
    });
  }
});

export const deletePortfolioImage = mutation({
  args: { id: v.id("portfolio_items") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    const item = await ctx.db.get(args.id);
    if (item?.barber_id !== identity.subject) throw new Error("Acceso denegado");
    await ctx.db.delete(args.id);
  }
});
