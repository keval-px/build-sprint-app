import {internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {eventFields} from './schema';
import {parseTestEvent,STORE} from '../shared/evidence';
import {simulationBasketCents} from '../shared/simulationDashboard';
import {assertSimulationAllowed} from './lib/deployment';
import {regroup} from './checkoutGroups';
function localOnly(){assertSimulationAllowed(String(STORE));}
export const ingest=internalMutation({args:{events:v.array(v.object(eventFields))},handler:async(ctx,{events})=>{
 localOnly();
 if(events.length>150)throw Error('Simulation chunk too large.');
 let inserted=0;const changed=new Set<string>();
 for(const event of events){
  if(!parseTestEvent(event,Date.now()))throw Error('Invalid simulation event.');
  const existing=await ctx.db.query('testCheckoutEvents').withIndex('by_store_event',q=>q.eq('store',STORE).eq('eventId',event.eventId)).unique();
  if(existing){if(!existing.simulated)throw Error('Simulation event identity conflict.');if(existing.subtotalCents===undefined){await ctx.db.patch(existing._id,{subtotalCents:simulationBasketCents(event.sessionId),currency:'USD'});changed.add(event.sessionId);}continue;}
  await ctx.db.insert('testCheckoutEvents',{...event,store:STORE,simulated:true,subtotalCents:simulationBasketCents(event.sessionId),currency:'USD',receivedAt:Date.now()});inserted++;changed.add(event.sessionId);
 }
 await regroup(ctx,'legacy',changed);
 const state=await ctx.db.query('testCollectionState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(inserted){if(state)await ctx.db.patch(state._id,{eventCount:state.eventCount+inserted,lastReceivedAt:Date.now()});else await ctx.db.insert('testCollectionState',{store:STORE,eventCount:inserted,firstReceivedAt:Date.now(),lastReceivedAt:Date.now()});}
 return {inserted};
}});
export const verify=internalQuery({args:{ids:v.array(v.string())},handler:async(ctx,{ids})=>{
 localOnly();if(ids.length>120)throw Error('Too many sessions');
 let found=0;
 for(const id of ids){const row=await ctx.db.query('testCheckoutEvents').withIndex('by_store_session_name',q=>q.eq('store',STORE).eq('sessionId',id).eq('name','checkout_started')).first();if(row?.simulated)found++;}
 return {sessions:found};
}});
