import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ACTION_STEPS, isActionStep, isViewerId } from "../shared/actions";


const result = v.object({ completed: v.array(v.string()), updatedAt: v.union(v.number(), v.null()) });
export const read = internalQuery({
  args: { viewerId: v.string() }, returns: result,
  handler: async (ctx, { viewerId }) => {
    if (!isViewerId(viewerId)) return { completed: [], updatedAt: null };
    const row = await ctx.db.query("demoActionProgress").withIndex("by_viewer", q => q.eq("viewerId", viewerId)).unique();
    return { completed: row?.completed ?? [], updatedAt: row?.updatedAt ?? null };
  },
});
export const setStep = internalMutation({
  args: { viewerId: v.string(), stepId: v.string(), completed: v.boolean() },
  returns: v.object({ completed: v.array(v.string()), updatedAt: v.union(v.number(), v.null()), error: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    if (!isViewerId(args.viewerId) || !isActionStep(args.stepId)) return { completed: [], updatedAt: null, error: "Invalid progress update." };
    const row = await ctx.db.query("demoActionProgress").withIndex("by_viewer", q => q.eq("viewerId", args.viewerId)).unique();
    // Public demo progress is bounded and contains no identity or merchant changes.
    if (!row && (await ctx.db.query("demoActionProgress").take(1000)).length >= 1000) return { completed: [], updatedAt: null, error: "Demo progress storage is full." };
    const done = new Set(row?.completed ?? []);
    if (args.completed) done.add(args.stepId); else done.delete(args.stepId);
    const completed = ACTION_STEPS.filter(step => done.has(step));
    const updatedAt = Date.now();
    if (row) await ctx.db.patch(row._id, { completed, updatedAt });
    else await ctx.db.insert("demoActionProgress", { viewerId: args.viewerId, completed, updatedAt });
    return { completed, updatedAt, error: null };
  },
});
