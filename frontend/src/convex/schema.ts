import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    user_id: v.string(), // ID externo (e.g. de Clerk)
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("client"), v.literal("barber")),
    picture: v.optional(v.string()),
    credits: v.optional(v.number()),
    phone: v.optional(v.string()),
    referred_by: v.optional(v.string()), // ID del usuario que invitó
    // Perfil avanzado exclusivo para barbero
    barber_profile: v.optional(
      v.object({
        bio: v.string(),
        rating: v.number(),
        address: v.string(),
        offers_home_service: v.boolean(),
        home_service_fee: v.optional(v.number()),
        location: v.optional(
          v.object({
            type: v.literal("Point"),
            coordinates: v.array(v.number()) // [lng, lat]
          })
        ),
        // Horario semanal recurrente: claves "1" (lunes) a "7" (domingo)
        weekly_schedule: v.optional(v.any()),
        // Excepciones por fecha: "YYYY-MM-DD" -> { available, start_hour, end_hour }
        custom_schedule: v.optional(v.any()),
        // Subscription / monetization
        subscription_status: v.optional(v.union(
          v.literal("trial"),
          v.literal("active"),
          v.literal("expired"),
          v.literal("cancelled")
        )),
        subscription_plan: v.optional(v.union(
          v.literal("personal_basic"),
          v.literal("personal_pro"),
          v.literal("business_basic"),
          v.literal("business_pro")
        )),
        trial_end_date: v.optional(v.string()),
        subscription_end_date: v.optional(v.string()),
        stripe_customer_id: v.optional(v.string()),
        stripe_subscription_id: v.optional(v.string()),
      })
    )
  }).index("by_email", ["email"]).index("by_role", ["role"]).index("by_user_id", ["user_id"]),

  bookings: defineTable({
    client_id: v.string(), 
    barber_id: v.string(), 
    service_id: v.string(),
    service_name: v.string(), 
    barber_name: v.string(),
    client_name: v.string(),
    date: v.string(),
    time: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled")),
    total_amount: v.number(),
    payment_method: v.string(), // "card" o "cash" o "app"
    stripe_payment_intent_id: v.optional(v.string()),
    reservation_fee: v.optional(v.number()),
  }).index("by_client", ["client_id"]).index("by_barber", ["barber_id"]),

  services: defineTable({
    barber_id: v.string(),
    name: v.string(),
    price: v.number(),
    duration: v.number()
  }).index("by_barber", ["barber_id"]),

  portfolio_items: defineTable({
    barber_id: v.string(),
    description: v.optional(v.string()),
    url: v.optional(v.string()), // Retrocompatibilidad
    format: v.optional(v.string()), 
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    boosted_until: v.optional(v.string()), // ISO date — post aparece primero en el feed
    media: v.optional(
      v.array(
        v.object({
          url: v.string(),
          storageId: v.optional(v.id("_storage")),
          type: v.string(), // "image" o "video"
        })
      )
    )
  }).index("by_barber", ["barber_id"]),

  reviews: defineTable({
    barber_id: v.string(),
    booking_id: v.string(),
    client_id: v.string(),
    client_name: v.string(),
    client_picture: v.optional(v.string()),
    rating: v.number(),
    comment: v.optional(v.string()),
    reply: v.optional(v.string()),
    created_at: v.string() // ISO Date string
  }).index("by_barber", ["barber_id"]),
  
  saved_styles: defineTable({
    client_id: v.string(),
    portfolio_item_id: v.id("portfolio_items"),
    created_at: v.string()
  }).index("by_client", ["client_id"])
});
