import {internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {observedPurchaseFields} from './schema';
import {observedAverageOrderValue} from '../shared/purchases';
const value=v.object(observedPurchaseFields);
export const saveSnapshot=internalMutation({
  args:{snapshot:value},returns:v.null(),
  handler:async(ctx,{snapshot})=>{
    observedAverageOrderValue(snapshot);
    const previous=await ctx.db.query('demoPurchaseSnapshots').withIndex('by_store',q=>q.eq('store',snapshot.store)).unique();
    if(previous) await ctx.db.patch(previous._id,snapshot);
    else await ctx.db.insert('demoPurchaseSnapshots',snapshot);
    return null;
  },
});
export const read=internalQuery({
  args:{},returns:v.union(value,v.null()),
  handler:async ctx=>{
    const row=await ctx.db.query('demoPurchaseSnapshots').withIndex('by_store',q=>q.eq('store','build-sprint-demo.myshopify.com')).unique();
    if(!row)return null;
    const {_id,_creationTime,...snapshot}=row;return snapshot;
  },
});
