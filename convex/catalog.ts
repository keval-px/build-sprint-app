import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { catalogFields } from './schema';
import { CATALOG_PLAN, modelCatalog } from '../shared/catalog';

export const saveInspectedPlan = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    modelCatalog(CATALOG_PLAN);
    const existing = await ctx.db.query('catalogScenarios').withIndex('by_store',q=>q.eq('store',CATALOG_PLAN.store)).unique();
    if (existing) await ctx.db.patch(existing._id,CATALOG_PLAN);
    else await ctx.db.insert('catalogScenarios',CATALOG_PLAN);
    return null;
  },
});
export const read = internalQuery({
  args: {}, returns: v.union(v.object(catalogFields),v.null()),
  handler: async ctx => {
    const row = await ctx.db.query('catalogScenarios').withIndex('by_store',q=>q.eq('store',CATALOG_PLAN.store)).unique();
    if (!row) return null;
    const {_id,_creationTime,...model}=row;
    return model;
  },
});
