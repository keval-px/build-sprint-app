import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const eventFields = {
  eventId: v.string(),
  sessionId: v.string(),
  name: v.union(
    v.literal("checkout_started"), v.literal("checkout_contact_info_submitted"),
    v.literal("checkout_address_info_submitted"), v.literal("checkout_shipping_info_submitted"),
    v.literal("payment_info_submitted"), v.literal("checkout_completed"), v.literal("alert_displayed"),
  ),
  timestamp: v.number(),
  category: v.union(v.null(), v.literal("discount"), v.literal("payment"), v.literal("delivery"), v.literal("validation")),
};

export default defineSchema({
  testCheckoutEvents: defineTable({ ...eventFields, store: v.literal("build-sprint-demo.myshopify.com"), receivedAt: v.number() })
    .index("by_store_timestamp", ["store", "timestamp"])
    .index("by_store_event", ["store", "eventId"]),
  testCollectionState: defineTable({ store: v.literal("build-sprint-demo.myshopify.com"), eventCount: v.number() })
    .index("by_store", ["store"]),
});
