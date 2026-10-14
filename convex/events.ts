import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { eventFields } from "./schema";
import { STORE, parseTestEvent } from "../shared/evidence";

export const recordTestEvent = internalMutation({
  args: eventFields,
  returns: v.union(v.literal("recorded"), v.literal("duplicate"), v.literal("full"), v.literal("invalid")),
  handler: async (ctx, args) => {
    if (!parseTestEvent(args, Date.now())) return "invalid";
    const existing = await ctx.db.query("testCheckoutEvents").withIndex("by_store_event", q => q.eq("store", STORE).eq("eventId", args.eventId)).unique();
    if (existing) return "duplicate";
    const state = await ctx.db.query("testCollectionState").withIndex("by_store", q => q.eq("store", STORE)).unique();
    await ctx.db.insert("testCheckoutEvents", { ...args, store: STORE, receivedAt: Date.now() });
    if (state) await ctx.db.patch(state._id, { eventCount: state.eventCount + 1,...(state.lastCapAt&&!state.resumedAt?{resumedAt:Date.now()}:{}),firstReceivedAt:state.firstReceivedAt??Date.now(),lastReceivedAt:Date.now() });
    else await ctx.db.insert("testCollectionState", { store: STORE, eventCount: 1,firstReceivedAt:Date.now(),lastReceivedAt:Date.now() });
    return "recorded";
  },
});

