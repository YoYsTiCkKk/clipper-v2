import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getBarberReviews = query({
  args: { barber_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_barber", (q) => q.eq("barber_id", args.barber_id))
      .collect();
  }
});

export const addReview = mutation({
  args: { booking_id: v.string(), barber_id: v.string(), rating: v.number(), comment: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No auth");
    
    return await ctx.db.insert("reviews", {
      barber_id: args.barber_id,
      booking_id: args.booking_id,
      client_id: identity.subject,
      client_name: identity.name || "Client",
      client_picture: identity.pictureUrl,
      rating: args.rating,
      comment: args.comment,
      created_at: new Date().toISOString()
    });
  }
});
