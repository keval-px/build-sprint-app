import {internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {abandonedFields} from './schema';
import {STORE} from '../shared/evidence';
import {matchCheckoutLinks} from './lib/checkoutMatching';
const value=v.object(abandonedFields);
export const saveSnapshot=internalMutation({args:{snapshot:value},handler:async(ctx,{snapshot})=>{const ids=new Set<string>();const sessions=new Set<string>();for(const r of snapshot.records){if(!/^[a-f0-9]{64}$/.test(r.recordHash)||ids.has(r.recordHash)||!Number.isSafeInteger(r.subtotalCents)||r.subtotalCents<0)throw Error('Invalid record');ids.add(r.recordHash);if(r.sessionId){if(!/^[a-f0-9]{64}$/.test(r.sessionId)||sessions.has(r.sessionId))throw Error('Ambiguous match');sessions.add(r.sessionId);}}const old=await ctx.db.query('demoAbandonedSnapshots').unique();if(old)await ctx.db.patch(old._id,snapshot);else await ctx.db.insert('demoAbandonedSnapshots',snapshot);}});
export const read=internalQuery({args:{},returns:v.union(value,v.null()),handler:async ctx=>{const row=await ctx.db.query('demoAbandonedSnapshots').unique();if(!row)return null;const{_id,_creationTime,...snapshot}=row;return snapshot;}});
// Resolve against the latest snapshot and evidence in one transaction. Failed batches
// preserve the entire saved snapshot, including the existing controlled audit link.
export const applyVerifiedLinks=internalMutation({args:{links:abandonedFields.records},handler:async(ctx,{links})=>{
  const snapshot=await ctx.db.query('demoAbandonedSnapshots').unique();
  if(!snapshot)throw Error('Import the demo abandoned snapshot first');
  const rows=await ctx.db.query('testCheckoutEvents').withIndex('by_store_timestamp',q=>q.eq('store',STORE)).filter(q=>q.and(q.neq(q.field('auditOnly'),true),q.eq(q.field('name'),'checkout_started'))).collect();
  const result=matchCheckoutLinks(snapshot,links,rows.map(row=>row.sessionId));
  await ctx.db.patch(snapshot._id,{records:result.records});
  return{added:result.added,matched:result.matched,unmatched:result.unmatched};
}});
// Retain audit events for inspection, exclude them from shopper evidence. Never delete.
export const markAuditEvents=internalMutation({args:{eventIds:v.array(v.string()),protectedIds:v.array(v.string())},handler:async(ctx,{eventIds,protectedIds})=>{const protectedSet=new Set(protectedIds);let marked=0;for(const id of eventIds){if(protectedSet.has(id))throw Error('Original event protected');const row=await ctx.db.query('testCheckoutEvents').withIndex('by_store_event',q=>q.eq('store',STORE).eq('eventId',id)).unique();if(!row||row.name==='checkout_completed'||row.name==='payment_info_submitted')throw Error('Unexpected audit event');await ctx.db.patch(row._id,{auditOnly:true});marked++;}return marked;}});
