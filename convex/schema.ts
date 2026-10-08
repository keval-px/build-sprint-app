import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const eventFields = {
  discountCodeHash:v.optional(v.string()),
  discountOfferCode:v.optional(v.string()),
  extensionAppHash: v.optional(v.string()),
  extensionAppName: v.optional(v.string()),
  shippingBlocker: v.optional(v.literal("no_shipping_available")),
  eventId: v.string(),
  sessionId: v.string(),
  name: v.union(
    v.literal("checkout_started"), v.literal("checkout_contact_info_submitted"),
    v.literal("checkout_address_info_submitted"), v.literal("checkout_shipping_info_submitted"),
    v.literal("payment_info_submitted"), v.literal("checkout_completed"), v.literal("alert_displayed"), v.literal("ui_extension_errored"),
  ),
  timestamp: v.number(),
  category: v.union(v.null(), v.literal("discount"), v.literal("payment"), v.literal("delivery"), v.literal("validation"), v.literal("inventory"), v.literal("extension")),
};

// Historical model/checklist tables remain solely to preserve existing data.
// Their removed feature functions and HTTP endpoints are no longer deployed.
// Legacy optional assumptions remain readable for existing demo rows only.
// The calculator API and UI have been removed; these values are no longer used.
const projectionFields = { averageOrderValue: v.number(), currency: v.string(), recoveryPercent: v.number() };
const projectionValue = v.union(v.object(projectionFields), v.null());

export const catalogFields = {
  store: v.literal("build-sprint-demo.myshopify.com"), currency: v.literal("USD"), checkedOn: v.string(), recoveryPercent: v.number(),
  products: v.array(v.object({id:v.string(),name:v.string(),handle:v.string(),priceCents:v.number()})),
  baskets: v.array(v.object({weight:v.number(),items:v.array(v.object({productId:v.string(),quantity:v.number()}))})),
};

export const observedPurchaseFields = {
  store:v.literal("build-sprint-demo.myshopify.com"),currency:v.literal("USD"),source:v.literal("shopify-admin-csv-test-orders"),
  importedOn:v.string(),periodStart:v.string(),periodEnd:v.string(),orderCount:v.number(),totalProductCents:v.number(),
  baskets:v.array(v.object({label:v.string(),orderCount:v.number(),itemCount:v.number(),totalProductCents:v.number()})),
};

export const abandonedFields={importedOn:v.string(),emailSent:v.number(),emailNotSent:v.number(),records:v.array(v.object({recordHash:v.string(),sessionId:v.union(v.string(),v.null()),subtotalCents:v.number(),currency:v.literal("USD"),recovered:v.boolean()}))};
export const capturedItems=v.array(v.object({itemHash:v.string(),quantity:v.number(),minor:v.number(),currency:v.string()}));
export const fixCounts=v.object({checkouts:v.number(),affected:v.number(),completed:v.number()});
export const checkoutPriceFields={sessionId:v.string(),currency:v.string(),createdAt:v.string(),updatedAt:v.number(),subtotalCents:v.union(v.number(),v.null()),totalCents:v.union(v.number(),v.null()),recovered:v.boolean()};
export default defineSchema({
  promisedDiscountOffers:defineTable({store:v.literal("build-sprint-demo.myshopify.com"),code:v.string(),codeHash:v.string(),currency:v.string(),minimumCents:v.number(),startsAt:v.number(),endsAt:v.number(),verifiedAt:v.number(),source:v.literal('demo-browser-verified-offer')}).index('by_code',['codeHash']),
  pixelCollectionState:defineTable({store:v.literal("build-sprint-demo.myshopify.com"),eventCount:v.number()}).index("by_store",["store"]),
  shopifyCheckoutPrices:defineTable({...checkoutPriceFields,store:v.literal("build-sprint-demo.myshopify.com")}).index("by_store_session",["store","sessionId"]).index("by_store_created",["store","createdAt"]),
  actionFixHistory:defineTable({scope:v.string(),missionId:v.string(),signal:v.optional(v.literal("shipping_unavailable")),appliedAt:v.number(),baseline:fixCounts,affectedIds:v.array(v.string()),partial:v.boolean(),active:v.boolean(),retestedAt:v.optional(v.number()),withdrawnAt:v.optional(v.number())}).index("by_scope",["scope"]),
  actionFixes:defineTable({scope:v.string(),missionId:v.string(),signal:v.optional(v.literal("shipping_unavailable")),appliedAt:v.number(),baseline:fixCounts,affectedIds:v.array(v.string()),partial:v.boolean(),active:v.boolean(),retestedAt:v.optional(v.number())}).index("by_scope",["scope"]),
  shopifyCheckoutEvents:defineTable({...eventFields,items:v.optional(capturedItems),subtotalCents:v.optional(v.number()),currency:v.optional(v.literal("USD")),store:v.literal("build-sprint-demo.myshopify.com"),receivedAt:v.number()}).index("by_event",["eventId"]).index("by_timestamp",["timestamp"]),
  shopifyInstallState: defineTable({store:v.literal("build-sprint-demo.myshopify.com"),revokedAt:v.number()}).index("by_store",["store"]),
  shopifyConnections: defineTable({store:v.literal("build-sprint-demo.myshopify.com"), accessToken:v.string(), refreshToken:v.optional(v.string()), expiresAt:v.optional(v.number()), refreshExpiresAt:v.optional(v.number()), scopes:v.array(v.string()), connectedAt:v.number()}).index("by_store",["store"]),
  shopifySnapshots: defineTable({storeName:v.optional(v.string()),timeZone:v.optional(v.string()),currency:v.optional(v.string()),store:v.literal("build-sprint-demo.myshopify.com"), syncedAt:v.number(), periodStart:v.string(), orders:v.array(v.object({recordHash:v.string(),conversion:v.optional(v.object({shopMinor:v.number(),buyerMinor:v.number(),buyerCurrency:v.string()})),sessionId:v.optional(v.string()),orderName:v.optional(v.string()),orderId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),test:v.boolean(),paid:v.boolean(),cancelled:v.boolean()})), abandoned:v.array(v.object({recordHash:v.string(),sessionId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),recovered:v.boolean()}))}).index("by_store",["store"]),
  shopifyLifecycleEvents: defineTable({eventId:v.string(),receivedAt:v.number()}).index("by_event",["eventId"]),
  demoAbandonedSnapshots:defineTable(abandonedFields),
  demoPurchaseSnapshots: defineTable(observedPurchaseFields).index("by_store",["store"]),
  catalogScenarios: defineTable(catalogFields).index("by_store", ["store"]),
  demoActionProgress: defineTable({ viewerId: v.string(), completed: v.array(v.string()), updatedAt: v.number(), assumptions: v.optional(projectionValue) }).index("by_viewer", ["viewerId"]),
  testCheckoutEvents: defineTable({ ...eventFields, auditOnly:v.optional(v.boolean()), store: v.literal("build-sprint-demo.myshopify.com"), receivedAt: v.number() })
    .index("by_store_timestamp", ["store", "timestamp"])
    .index("by_store_event", ["store", "eventId"]),
  testCollectionState: defineTable({ store: v.literal("build-sprint-demo.myshopify.com"), eventCount: v.number() })
    .index("by_store", ["store"]),
});
