import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { eventFields } from "./schema";
import { STORE, parseTestEvent, EVIDENCE_EVENT_LIMIT } from "../shared/evidence";
import type { CheckoutEvent } from "../shared/evidence";

export const recordTestEvent = internalMutation({
  args: eventFields,
  returns: v.union(v.literal("recorded"), v.literal("duplicate"), v.literal("full"), v.literal("invalid")),
  handler: async (ctx, args) => {
    if (!parseTestEvent(args, Date.now())) return "invalid";
    const existing = await ctx.db.query("testCheckoutEvents").withIndex("by_store_event", q => q.eq("store", STORE).eq("eventId", args.eventId)).unique();
    if (existing) return "duplicate";
    const state = await ctx.db.query("testCollectionState").withIndex("by_store", q => q.eq("store", STORE)).unique();
    if ((state?.eventCount ?? 0) >= 10000) return "full";
    await ctx.db.insert("testCheckoutEvents", { ...args, store: STORE, receivedAt: Date.now() });
    if (state) await ctx.db.patch(state._id, { eventCount: state.eventCount + 1 });
    else await ctx.db.insert("testCollectionState", { store: STORE, eventCount: 1 });
    return "recorded";
  },
});

export const readTestEvidence = internalQuery({
  args: {},
  returns: v.object({ store: v.literal("build-sprint-demo.myshopify.com"), totalStored: v.number(), events: v.array(v.object(eventFields)), truncated: v.boolean() }),
  handler: async (ctx): Promise<{ store: typeof STORE; totalStored: number; events: CheckoutEvent[]; truncated: boolean }> => {
    const rows = await ctx.db.query("testCheckoutEvents").withIndex("by_store_timestamp", q => q.eq("store", STORE)).filter(q=>q.neq(q.field("auditOnly"),true)).order("desc").take(EVIDENCE_EVENT_LIMIT + 1);
    return {
      store: STORE, totalStored: (await ctx.db.query("testCheckoutEvents").withIndex("by_store_timestamp",q=>q.eq("store",STORE)).filter(q=>q.neq(q.field("auditOnly"),true)).collect()).length, truncated: rows.length > EVIDENCE_EVENT_LIMIT,
      events: rows.slice(0, EVIDENCE_EVENT_LIMIT).map(({ eventId, sessionId, name, timestamp, category, shippingBlocker }) => ({ eventId, sessionId, name, timestamp, category, ...(shippingBlocker?{shippingBlocker}:{}) })),
    };
  },
});
