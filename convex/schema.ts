import {deployment} from '../shared/deployment.ts';
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const eventFields = {
  deviceClass:v.optional(v.union(v.literal('mobile'),v.literal('desktop'),v.literal('tablet'))),
  expressPay:v.optional(v.literal(true)),
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
  store: v.literal(deployment.store), currency: v.literal("USD"), checkedOn: v.string(), recoveryPercent: v.number(),
  products: v.array(v.object({id:v.string(),name:v.string(),handle:v.string(),priceCents:v.number()})),
  baskets: v.array(v.object({weight:v.number(),items:v.array(v.object({productId:v.string(),quantity:v.number()}))})),
};

export const observedPurchaseFields = {
  store:v.literal(deployment.store),currency:v.literal("USD"),source:v.literal("shopify-admin-csv-test-orders"),
  importedOn:v.string(),periodStart:v.string(),periodEnd:v.string(),orderCount:v.number(),totalProductCents:v.number(),
  baskets:v.array(v.object({label:v.string(),orderCount:v.number(),itemCount:v.number(),totalProductCents:v.number()})),
};

export const abandonedFields={importedOn:v.string(),emailSent:v.number(),emailNotSent:v.number(),records:v.array(v.object({recordHash:v.string(),sessionId:v.union(v.string(),v.null()),subtotalCents:v.number(),currency:v.literal("USD"),recovered:v.boolean()}))};
export const capturedItems=v.array(v.object({itemHash:v.string(),quantity:v.number(),minor:v.number(),currency:v.string()}));
export const fixCounts=v.object({checkouts:v.number(),affected:v.number(),completed:v.number()});
export const checkoutPriceFields={completedAt:v.optional(v.number()),sessionId:v.string(),currency:v.string(),createdAt:v.string(),updatedAt:v.number(),subtotalCents:v.union(v.number(),v.null()),totalCents:v.union(v.number(),v.null()),recovered:v.boolean()};
export const orderRecord=v.object({recordHash:v.string(),conversion:v.optional(v.object({shopMinor:v.number(),buyerMinor:v.number(),buyerCurrency:v.string()})),sessionId:v.optional(v.string()),orderName:v.optional(v.string()),orderId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),test:v.boolean(),paid:v.boolean(),cancelled:v.boolean()});
export const abandonedRecord=v.object({recordHash:v.string(),sessionId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),recovered:v.boolean()});
export default defineSchema({
  shopifySyncJobs:defineTable({deferredUntil:v.optional(v.number()),canonicalCacheCleaned:v.optional(v.boolean()),canonical:v.optional(v.boolean()),baseGeneration:v.optional(v.id('shopifySyncJobs')),mode:v.optional(v.union(v.literal('backfill'),v.literal('incremental'),v.literal('reconcile'))),filterStart:v.optional(v.string()),lastFullAt:v.optional(v.number()),store:v.literal(deployment.store),connectedAt:v.number(),startedAt:v.number(),updatedAt:v.number(),periodStart:v.string(),storeName:v.string(),timeZone:v.string(),currency:v.string(),status:v.union(v.literal('running'),v.literal('published')),ordersCursor:v.union(v.string(),v.null()),abandonedCursor:v.union(v.string(),v.null()),ordersDone:v.boolean(),abandonedDone:v.boolean(),orderCount:v.number(),abandonedCount:v.number(),pages:v.number()}).index('by_store_status',['store','status','startedAt']),
  shopifyNativeHeads:defineTable({store:v.literal(deployment.store),connectedAt:v.number(),kind:v.union(v.literal('orders'),v.literal('abandoned')),recordHash:v.string(),createdAt:v.string()}).index('by_install_kind_hash',['store','connectedAt','kind','recordHash']).index('by_install_kind_created',['store','connectedAt','kind','createdAt']),
  shopifyNativeVersions:defineTable({head:v.id('shopifyNativeHeads'),job:v.id('shopifySyncJobs'),revision:v.number(),currency:v.string(),sourceUpdatedAt:v.number(),row:v.union(orderRecord,abandonedRecord)}).index('by_head_updated',['head','sourceUpdatedAt','revision']).index('by_job_head',['job','head']),
  shopifySyncRows:defineTable({job:v.id('shopifySyncJobs'),kind:v.union(v.literal('orders'),v.literal('abandoned')),recordHash:v.string(),row:v.union(orderRecord,abandonedRecord)}).index('by_job_kind',['job','kind']).index('by_job_kind_hash',['job','kind','recordHash']),
  shopifySyncCursors:defineTable({job:v.id('shopifySyncJobs'),kind:v.union(v.literal('orders'),v.literal('abandoned')),cursor:v.string()}).index('by_job_kind_cursor',['job','kind','cursor']),

  promisedDiscountOffers:defineTable({store:v.literal(deployment.store),code:v.string(),codeHash:v.string(),currency:v.string(),minimumCents:v.number(),startsAt:v.number(),endsAt:v.number(),verifiedAt:v.number(),source:v.literal('demo-browser-verified-offer')}).index('by_code',['codeHash']),
  pixelCollectionState:defineTable({configuredAt:v.optional(v.number()),firstReceivedAt:v.optional(v.number()),lastReceivedAt:v.optional(v.number()),lastCapAt:v.optional(v.number()),resumedAt:v.optional(v.number()),store:v.literal(deployment.store),eventCount:v.number()}).index("by_store",["store"]),
  shopifyCheckoutPrices:defineTable({...checkoutPriceFields,receivedAt:v.optional(v.number()),store:v.literal(deployment.store)}).index("by_store_session",["store","sessionId"]).index("by_store_created",["store","createdAt"]),
  actionFixHistory:defineTable({scope:v.string(),missionId:v.string(),signal:v.optional(v.literal("shipping_unavailable")),appliedAt:v.number(),baseline:fixCounts,affectedIds:v.array(v.string()),partial:v.boolean(),active:v.boolean(),retestedAt:v.optional(v.number()),withdrawnAt:v.optional(v.number())}).index("by_scope",["scope"]),
  actionFixes:defineTable({scope:v.string(),missionId:v.string(),signal:v.optional(v.literal("shipping_unavailable")),appliedAt:v.number(),baseline:fixCounts,affectedIds:v.array(v.string()),partial:v.boolean(),active:v.boolean(),retestedAt:v.optional(v.number())}).index("by_scope",["scope"]),
  shopifyCheckoutEvents:defineTable({...eventFields,items:v.optional(capturedItems),subtotalCents:v.optional(v.number()),currency:v.optional(v.literal("USD")),store:v.literal(deployment.store),receivedAt:v.number()}).index("by_event",["eventId"]).index("by_timestamp",["timestamp"]).index("by_store_timestamp",["store","timestamp"]).index("by_store_session_name",["store","sessionId","name","timestamp"]),
  shopifyInstallState: defineTable({store:v.literal(deployment.store),revokedAt:v.number()}).index("by_store",["store"]),
  shopifyConnections: defineTable({store:v.literal(deployment.store), accessToken:v.string(), refreshToken:v.optional(v.string()), expiresAt:v.optional(v.number()), refreshExpiresAt:v.optional(v.number()), scopes:v.array(v.string()), connectedAt:v.number()}).index("by_store",["store"]),
  shopifyMonitoring:defineTable({store:v.literal(deployment.store),status:v.union(v.literal('success'),v.literal('failed'),v.literal('limit'),v.literal('reconnect')),lastAttemptAt:v.number(),lastSuccessAt:v.optional(v.number()),coverageStart:v.optional(v.number()),coverageEnd:v.optional(v.number())}).index('by_store',['store']),
  shopifySnapshots: defineTable({storeName:v.optional(v.string()),timeZone:v.optional(v.string()),currency:v.optional(v.string()),store:v.literal(deployment.store), syncedAt:v.number(), periodStart:v.string(), orders:v.array(v.object({recordHash:v.string(),conversion:v.optional(v.object({shopMinor:v.number(),buyerMinor:v.number(),buyerCurrency:v.string()})),sessionId:v.optional(v.string()),orderName:v.optional(v.string()),orderId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),test:v.boolean(),paid:v.boolean(),cancelled:v.boolean()})), abandoned:v.array(v.object({recordHash:v.string(),sessionId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),recovered:v.boolean()}))}).index("by_store",["store"]),
  shopifyLifecycleEvents: defineTable({eventId:v.string(),receivedAt:v.number()}).index("by_event",["eventId"]),
  demoAbandonedSnapshots:defineTable(abandonedFields),
  demoPurchaseSnapshots: defineTable(observedPurchaseFields).index("by_store",["store"]),
  catalogScenarios: defineTable(catalogFields).index("by_store", ["store"]),
  demoActionProgress: defineTable({ viewerId: v.string(), completed: v.array(v.string()), updatedAt: v.number(), assumptions: v.optional(projectionValue) }).index("by_viewer", ["viewerId"]),
  testCheckoutEvents: defineTable({ subtotalCents:v.optional(v.number()),currency:v.optional(v.literal("USD")), simulated:v.optional(v.literal(true)), ...eventFields, auditOnly:v.optional(v.boolean()), store: v.literal(deployment.store), receivedAt: v.number() })
    .index("by_store_timestamp", ["store", "timestamp"])
    .index("by_store_event", ["store", "eventId"]).index("by_store_session_name",["store","sessionId","name","timestamp"]),
  testCollectionState: defineTable({firstReceivedAt:v.optional(v.number()),lastReceivedAt:v.optional(v.number()),lastCapAt:v.optional(v.number()),resumedAt:v.optional(v.number()), store: v.literal(deployment.store), eventCount: v.number() })
    .index("by_store", ["store"]),
});
