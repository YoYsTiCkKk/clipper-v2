import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getBarberServices = query({
  args: { barber_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("services")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .collect();
  }
});

export const addService = mutation({
  args: { name: v.string(), price: v.number(), duration: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado en Convex");
    return await ctx.db.insert("services", {
      barber_id: identity.subject,
      name: args.name,
      price: args.price,
      duration: args.duration
    });
  }
});

export const removeService = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    const service = await ctx.db.get(args.id);
    if (!service || service.barber_id !== identity.subject) throw new Error("Acceso denegado");
    await ctx.db.delete(args.id);
  }
});
