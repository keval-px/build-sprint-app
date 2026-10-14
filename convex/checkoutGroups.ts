import {internalMutation,internalQuery,type MutationCtx,type ActionCtx} from './_generated/server';
import type {Doc} from './_generated/dataModel';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {STORE,type CheckoutEvent} from '../shared/evidence';
import {readPages} from '../shared/capacity';

// Reports read one record per checkout instead of every event row: reading ~1,400 grouped
// records takes a fraction of the time of ~7,000 event rows. Each record is rebuilt from
// the original rows after every write, so those rows stay the only source of truth.
export type Dataset='legacy'|'pixel';
const dataset=v.union(v.literal('legacy'),v.literal('pixel'));
export type StoredEvent=Doc<'testCheckoutEvents'>|Doc<'shopifyCheckoutEvents'>;
// The event fields the page reads; storage fields stay on the server.
export function eventShape({eventId,sessionId,name,timestamp,category,...row}:StoredEvent){
 return {eventId,sessionId,name,timestamp,category,...('simulated'in row&&row.simulated?{simulated:true as const}:{}),...(row.deviceClass?{deviceClass:row.deviceClass}:{}),...(row.expressPay?{expressPay:row.expressPay}:{}),...('discountOfferCode'in row&&row.discountOfferCode?{discountOfferCode:row.discountOfferCode}:{}),...(row.extensionAppName?{extensionAppName:row.extensionAppName}:{}),...(row.extensionAppHash?{extensionAppHash:row.extensionAppHash}:{}),...(row.shippingBlocker?{shippingBlocker:row.shippingBlocker}:{}),...('items'in row&&row.items?{items:row.items}:{}),...('subtotalCents'in row&&row.subtotalCents!==undefined?{subtotalCents:row.subtotalCents,currency:'USD' as const}:{})};
}

// Rebuild the grouped records of these checkouts from their original rows. Audit-only rows
// are left out, as reports exclude them. Call after inserting or changing event rows.
export async function regroup(ctx:MutationCtx,source:Dataset,sessionIds:Iterable<string>){
 for(const sessionId of new Set(sessionIds)){
  const rows:StoredEvent[]=source==='legacy'
   ?(await ctx.db.query('testCheckoutEvents').withIndex('by_store_session_name',q=>q.eq('store',STORE).eq('sessionId',sessionId)).collect()).filter(r=>r.auditOnly!==true)
   :await ctx.db.query('shopifyCheckoutEvents').withIndex('by_store_session_name',q=>q.eq('store',STORE).eq('sessionId',sessionId)).collect();
  const existing=await ctx.db.query('checkoutGroups').withIndex('by_session',q=>q.eq('store',STORE).eq('dataset',source).eq('sessionId',sessionId)).unique();
  if(!rows.length){if(existing)await ctx.db.delete(existing._id);continue;}
  // Same order as the timestamp index: time, then arrival.
  rows.sort((a,b)=>a.timestamp-b.timestamp||a._creationTime-b._creationTime);
  const record={store:STORE,dataset:source,sessionId,lastAt:rows.at(-1)!.timestamp,events:rows.map(r=>({...eventShape(r),createdAt:r._creationTime}))};
  if(existing)await ctx.db.replace(existing._id,record);else await ctx.db.insert('checkoutGroups',record);
 }
}

// One-time build from existing events, a page at a time. Writes during the build regroup
// their own checkouts, and rebuilding a checkout twice gives the same record.
export const buildStep=internalMutation({args:{dataset},handler:async(ctx,args)=>{
 const state=await ctx.db.query('checkoutGroupBuild').withIndex('by_dataset',q=>q.eq('store',STORE).eq('dataset',args.dataset)).unique();
 if(!state||state.ready)return;
 const options={cursor:state.cursor,numItems:100,maximumRowsRead:200,maximumBytesRead:256000};
 const page=args.dataset==='legacy'?await ctx.db.query('testCheckoutEvents').withIndex('by_store_timestamp',q=>q.eq('store',STORE)).paginate(options):await ctx.db.query('shopifyCheckoutEvents').withIndex('by_store_timestamp',q=>q.eq('store',STORE)).paginate(options);
 await regroup(ctx,args.dataset,page.page.map(r=>r.sessionId));
 await ctx.db.patch(state._id,{cursor:page.continueCursor,ready:page.isDone,updatedAt:Date.now()});
 if(!page.isDone)await ctx.scheduler.runAfter(0,internal.checkoutGroups.buildStep,{dataset:args.dataset});
}});
// Runs every minute: starts the build once, and resumes it if a step stopped.
export const ensureBuilt=internalMutation({args:{},handler:async ctx=>{
 for(const source of ['legacy','pixel'] as const){
  const state=await ctx.db.query('checkoutGroupBuild').withIndex('by_dataset',q=>q.eq('store',STORE).eq('dataset',source)).unique();
  if(state?.ready||state&&Date.now()-state.updatedAt<5*60000)continue;
  if(state)await ctx.db.patch(state._id,{updatedAt:Date.now()});else await ctx.db.insert('checkoutGroupBuild',{store:STORE,dataset:source,cursor:null,ready:false,updatedAt:Date.now()});
  await ctx.scheduler.runAfter(0,internal.checkoutGroups.buildStep,{dataset:source});
 }
}});
export const ready=internalQuery({args:{},handler:async ctx=>{
 const rows=await ctx.db.query('checkoutGroupBuild').withIndex('by_dataset',q=>q.eq('store',STORE)).collect();
 return {legacy:rows.some(r=>r.dataset==='legacy'&&r.ready),pixel:rows.some(r=>r.dataset==='pixel'&&r.ready)};
}});

export const groupPage=internalQuery({args:{dataset,cursor:v.union(v.string(),v.null()),start:v.number()},handler:async(ctx,args)=>{
 const result=await ctx.db.query('checkoutGroups').withIndex('by_last',q=>q.eq('store',STORE).eq('dataset',args.dataset).gte('lastAt',args.start)).paginate({cursor:args.cursor,numItems:100,maximumRowsRead:200,maximumBytesRead:256000});
 return {...result,page:result.page.map(g=>g.events)};
}});
// The same events, in the same order, as reading the event rows: events in the window that
// arrived by `asOf`, sorted by time then arrival, then each checkout's original start when
// it falls before the window. Never manufacture a start or split one checkout in two.
export async function readGroups(ctx:ActionCtx,source:Dataset,start:number,asOf:number):Promise<CheckoutEvent[]> {
 const groups=await readPages(cursor=>ctx.runQuery(internal.checkoutGroups.groupPage,{dataset:source,cursor,start}));
 const rows:(CheckoutEvent&{createdAt:number})[]=[],first=new Map<string,CheckoutEvent&{createdAt:number}>();
 for(const events of groups){
  const inWindow=events.filter(e=>e.timestamp>=start&&e.timestamp<=asOf&&e.createdAt<=asOf);
  if(!inWindow.length)continue;
  rows.push(...inWindow);
  const started=events.find(e=>e.name==='checkout_started');
  if(started)first.set(started.sessionId,started);
 }
 rows.sort((a,b)=>a.timestamp-b.timestamp||a.createdAt-b.createdAt);
 const starts=[...new Set(rows.map(e=>e.sessionId))].flatMap(id=>{const s=first.get(id);return s&&s.timestamp<start&&s.createdAt<=asOf?[s]:[];});
 return [...rows,...starts].map(({createdAt,...event})=>event as CheckoutEvent);
}
