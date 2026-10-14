import {internalMutation,internalQuery} from './_generated/server';
import type {QueryCtx,MutationCtx,ActionCtx} from './_generated/server';
import type {CheckoutPrice} from "../shared/checkoutPrice";
import type {EvidenceResponse} from "../shared/evidenceResponse";
type Snapshot=NonNullable<EvidenceResponse["shopifySnapshot"]>;
import type {Id} from './_generated/dataModel';
import {eventShape,readGroups,type StoredEvent} from './checkoutGroups';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {orderRecord,abandonedRecord} from './schema';
import {STORE,type CheckoutEvent} from '../shared/evidence';
import {PAGE_SIZE,REPORT_WINDOW_MS,REPORT_BYTES,readPages,ReportLimit,reportJSON,collectionGap} from '../shared/capacity';
import {canReadShopifyEvidence,mergeCheckoutEvents,publicCheckoutEvents} from '../shared/checkoutIdentity';
import type {MonitoringEvidence} from '../shared/monitoringHealth';
import {SYNC_FRESH_MS} from '../shared/monitoringHealth';
import {canSaveSyncedSnapshot} from '../shared/shopifySync';
import {nativePlan,NATIVE_POLL_MS} from '../shared/nativeSync';
import {stageNative,publishedVersion,versionBudget} from './nativeStore';
const kind=v.union(v.literal('orders'),v.literal('abandoned'));
async function validJob(ctx:MutationCtx,id:Id<'shopifySyncJobs'>){
 const job=await ctx.db.get(id),connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique(),state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(!job||job.store!==STORE||Date.now()-job.startedAt>=86400000||job.connectedAt!==connection?.connectedAt||!canSaveSyncedSnapshot(job.startedAt,connection?.connectedAt,state?.revokedAt))throw Error('Shopify installation changed. Reopen the app.');
 return job;
}
export const syncPlan=internalQuery({args:{startedAt:v.number()},handler:async(ctx,{startedAt})=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(!connection||!canReadShopifyEvidence(connection)||!canSaveSyncedSnapshot(startedAt,connection.connectedAt,state?.revokedAt))throw Error('Shopify installation changed. Reopen the app.');
 const running=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','running')).order('desc').first();
 const published=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','published')).order('desc').first();
 const base=published?.canonical&&published.connectedAt===connection.connectedAt?published:null;
 const health=await ctx.db.query('shopifyMonitoring').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const resumable=running?.canonical&&running.connectedAt===connection.connectedAt&&startedAt-running.startedAt<86400000;
 return {base,resume:resumable?running:null,idle:!resumable&&health?.status==='success'&&!!base&&startedAt-base.startedAt<NATIVE_POLL_MS};
}});
export const begin=internalMutation({args:{canonical:v.optional(v.boolean()),storeName:v.string(),timeZone:v.string(),currency:v.string(),periodStart:v.string(),startedAt:v.number(),connectedAt:v.number()},handler:async(ctx,args)=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(connection?.connectedAt!==args.connectedAt||!canSaveSyncedSnapshot(args.startedAt,connection?.connectedAt,state?.revokedAt))throw Error('Shopify installation changed. Reopen the app.');
 const running=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','running')).order('desc').first();
 // Failed runs resume for one day. Expired cursors start a fresh generation;
 // neither staged nor published data is destroyed.
 if(running&&!!running.canonical===!!args.canonical&&running.currency===args.currency&&running.timeZone===args.timeZone&&running.connectedAt===args.connectedAt&&args.startedAt-running.startedAt<86400000)return running._id;
 const published=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','published')).order('desc').first();
 const health=await ctx.db.query('shopifyMonitoring').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 // Reuse a still-fresh complete generation. Minute polling does not rescan
 // every Shopify record; failed reads bypass this cooldown for a real retry.
 if(health?.status==='success'&&published&&!!published.canonical===!!args.canonical&&published.connectedAt===args.connectedAt&&published.currency===args.currency&&published.timeZone===args.timeZone&&args.startedAt-published.startedAt<(args.canonical?NATIVE_POLL_MS:SYNC_FRESH_MS-60000))return published._id;
 const base=args.canonical&&published?.canonical&&published.connectedAt===args.connectedAt&&published.currency===args.currency&&published.timeZone===args.timeZone?published:null;
 const plan=args.canonical?nativePlan(args.startedAt,args.periodStart,base):null;
 return ctx.db.insert('shopifySyncJobs',{...args,...(plan?{mode:plan.mode,filterStart:plan.filterStart,...(base?{baseGeneration:base._id,lastFullAt:base.lastFullAt,...(base.deferredUntil&&base.deferredUntil>args.startedAt?{deferredUntil:base.deferredUntil}:{})}:{})}:{}),store:STORE,updatedAt:args.startedAt,status:'running',ordersCursor:null,abandonedCursor:null,ordersDone:false,abandonedDone:false,orderCount:base?.orderCount??0,abandonedCount:base?.abandonedCount??0,pages:0});
}});
export const running=internalQuery({args:{},handler:async ctx=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const job=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','running')).order('desc').first();
 return job?.connectedAt===connection?.connectedAt?job:null;
}});
export const job=internalQuery({args:{id:v.id('shopifySyncJobs')},handler:(ctx,{id})=>ctx.db.get(id)});
export const accept=internalMutation({args:{deferredUntil:v.optional(v.number()),sourceUpdatedAt:v.optional(v.array(v.number())),id:v.id('shopifySyncJobs'),kind,cursor:v.union(v.string(),v.null()),next:v.union(v.string(),v.null()),done:v.boolean(),rows:v.array(v.union(orderRecord,abandonedRecord))},handler:async(ctx,args)=>{
 const job=await validJob(ctx,args.id),field=args.kind==='orders'?'ordersCursor':'abandonedCursor',doneField=args.kind==='orders'?'ordersDone':'abandonedDone',countField=args.kind==='orders'?'orderCount':'abandonedCount';
 if(job.status!=='running'||job[doneField]||job[field]!==args.cursor)return false; // Replayed/overlapping page: no writes.
 if(args.rows.length>100||JSON.stringify(args.rows).length>128000||job.pages>=1000)throw new ReportLimit();
 if(job.canonical&&args.sourceUpdatedAt?.length!==args.rows.length)throw Error('Missing Shopify record versions.');
 if(args.deferredUntil!==undefined&&(!job.canonical||!Number.isFinite(args.deferredUntil)||args.deferredUntil<=job.startedAt))throw Error('Invalid deferred Shopify update.');
 if(!args.done){
  if(!args.next||args.next===args.cursor||await ctx.db.query('shopifySyncCursors').withIndex('by_job_kind_cursor',q=>q.eq('job',args.id).eq('kind',args.kind).eq('cursor',args.next!)).unique())throw Error('Incomplete Shopify pagination.');
  await ctx.db.insert('shopifySyncCursors',{job:args.id,kind:args.kind,cursor:args.next});
 }
 let added=0;const budget=versionBudget();
 for(const [index,row] of args.rows.entries()){
  if((args.kind==='orders')!==('paid' in row))throw Error('Unexpected Shopify records.');
  const existing=await ctx.db.query('shopifySyncRows').withIndex('by_job_kind_hash',q=>q.eq('job',args.id).eq('kind',args.kind).eq('recordHash',row.recordHash)).unique();
  if(job.canonical){
   const at=args.sourceUpdatedAt![index];
   if(!Number.isFinite(at)||at<Date.parse(row.createdAt)||at>job.startedAt)throw Error('Invalid Shopify record versions.');
   if(await stageNative(ctx,job,args.kind,row,at,budget))added++;
  }
  if(!existing){await ctx.db.insert('shopifySyncRows',{job:args.id,kind:args.kind,recordHash:row.recordHash,row});if(!job.canonical)added++;}
 }
 const finished=args.done&&(args.kind==='orders'?job.abandonedDone:job.ordersDone);
 await ctx.db.patch(args.id,{[field]:args.next,[doneField]:args.done,[countField]:job[countField]+added,updatedAt:Date.now(),pages:job.pages+1,...(args.deferredUntil!==undefined?{deferredUntil:Math.max(job.deferredUntil??0,args.deferredUntil)}:{}),...(finished?{status:'published' as const,...(job.canonical&&job.mode!=='incremental'?{lastFullAt:job.startedAt}:{})}:{})});
 if(finished){
  await ctx.scheduler.runAfter(3600000,internal.capacity.cleanSyncCache,{});
  const old=await ctx.db.query('shopifyMonitoring').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(!old||old.lastAttemptAt<=job.startedAt){const health={store:STORE as typeof STORE,status:'success' as const,lastAttemptAt:job.startedAt,lastSuccessAt:Date.now(),coverageStart:Date.parse(job.periodStart),coverageEnd:job.startedAt};if(old)await ctx.db.replace(old._id,health);else await ctx.db.insert('shopifyMonitoring',health);}
 }
 return true;
}});
export async function currentSnapshot(ctx:QueryCtx){
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const published=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','published')).order('desc').first();
 if(published&&published.connectedAt===connection?.connectedAt)return {generation:published._id,store:STORE,storeName:published.storeName,timeZone:published.timeZone,currency:published.currency,syncedAt:published.startedAt,periodStart:published.periodStart,orders:[],abandoned:[],orderCount:published.orderCount,abandonedCount:published.abandonedCount};
 const legacy=await ctx.db.query('shopifySnapshots').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 return legacy&&connection&&legacy.syncedAt>=connection.connectedAt?legacy:null;
}
// Snapshot and installation are pinned in the same database query.
export const header=internalQuery({args:{},handler:async ctx=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 return {connectedAt:connection?.connectedAt,snapshot:await currentSnapshot(ctx)};
}});
export const reportMonitoring=internalQuery({args:{connectedAt:v.optional(v.number()),generation:v.optional(v.id('shopifySyncJobs')),syncedAt:v.optional(v.number()),periodStart:v.optional(v.string())},handler:async(ctx,args):Promise<NonNullable<MonitoringEvidence['sync']>>=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const install=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(!canReadShopifyEvidence(connection)||!connection||args.connectedAt!==connection.connectedAt)throw Error('Shopify installation changed. Reopen the app.');
 const latest=await ctx.db.query('shopifyMonitoring').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const current=latest&&latest.lastAttemptAt>=connection.connectedAt?latest:null;
 let lastSuccessAt:number|undefined,coverageStart:number|undefined,coverageEnd:number|undefined;
 if(args.syncedAt!==undefined&&args.periodStart!==undefined){
  if(!canSaveSyncedSnapshot(args.syncedAt,connection.connectedAt,install?.revokedAt))throw Error('Shopify installation changed. Reopen the app.');
  if(args.generation){
   const pinned=await ctx.db.get(args.generation);
   if(!pinned||pinned.store!==STORE||pinned.status!=='published'||pinned.connectedAt!==connection.connectedAt||pinned.startedAt!==args.syncedAt||pinned.periodStart!==args.periodStart)throw Error('Pinned Shopify history is unavailable.');
   lastSuccessAt=pinned.updatedAt;
  }else lastSuccessAt=args.syncedAt; // Conservative legacy timestamp; never borrow a newer success.
  coverageStart=Date.parse(args.periodStart);coverageEnd=args.syncedAt;
 }
 // Live failures/reconnect/limit remain visible, but live success timestamps
 // cannot certify a different generation from the one returned by this report.
 const pinned=args.generation?await ctx.db.get(args.generation):null;
 return {required:true,status:current?.status,lastAttemptAt:current?.lastAttemptAt,lastSuccessAt,coverageStart,coverageEnd,...(pinned?.canonical?{reconciliationVerified:false,pendingUpdates:(pinned.deferredUntil??0)>pinned.startedAt}:{})};
}});
export const page=internalQuery({args:{dataset:v.union(v.literal('legacy'),v.literal('pixel'),v.literal('prices'),v.literal('orders'),v.literal('abandoned')),cursor:v.union(v.string(),v.null()),asOf:v.number(),start:v.number(),generation:v.optional(v.id('shopifySyncJobs'))},handler:async(ctx,args)=>{
 const options={cursor:args.cursor,numItems:PAGE_SIZE,maximumRowsRead:500,maximumBytesRead:256000};
 if(args.dataset==='orders'||args.dataset==='abandoned'){
  if(!args.generation)throw Error('Missing snapshot generation.');
  const job=await ctx.db.get(args.generation),connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(job?.status!=='published'||job.store!==STORE||job.connectedAt!==connection?.connectedAt)throw Error('Shopify installation changed.');
  if(job.canonical){
   const result=await ctx.db.query('shopifyNativeHeads').withIndex('by_install_kind_created',q=>q.eq('store',STORE).eq('connectedAt',job.connectedAt).eq('kind',args.dataset as 'orders'|'abandoned').gte('createdAt',job.periodStart).lte('createdAt',new Date(job.startedAt).toISOString())).filter(q=>q.lte(q.field('_creationTime'),args.asOf)).paginate({...options,numItems:50});
   const versions=[];const budget=versionBudget();
   for(const head of result.page)versions.push(await publishedVersion(ctx,head._id,job,budget));
   return {...result,page:versions.flatMap(version=>version?[version.row]:[]),changed:false};
  }
  const result=await ctx.db.query('shopifySyncRows').withIndex('by_job_kind',q=>q.eq('job',args.generation!).eq('kind',args.dataset as 'orders'|'abandoned')).paginate(options);
  return {...result,page:result.page.map(r=>r.row),changed:false};
 }
 if(args.dataset==='prices'){
  const result=await ctx.db.query('shopifyCheckoutPrices').withIndex('by_store_created',q=>q.eq('store',STORE).gte('createdAt',new Date(args.start).toISOString()).lte('createdAt',new Date(args.asOf).toISOString())).filter(q=>q.lte(q.field('_creationTime'),args.asOf)).paginate(options);
  return {...result,changed:result.page.some(r=>r.updatedAt>args.asOf||(r.receivedAt??0)>args.asOf),page:result.page.map(({_id,_creationTime,store,receivedAt,...price})=>price)};
 }
 // Audit-only rows and late arrivals are skipped here rather than with database filters,
 // which cost more than reading the rows; the result is the same.
 const result=args.dataset==='legacy'?await ctx.db.query('testCheckoutEvents').withIndex('by_store_timestamp',q=>q.eq('store',STORE).gte('timestamp',args.start).lte('timestamp',args.asOf)).paginate(options):await ctx.db.query('shopifyCheckoutEvents').withIndex('by_store_timestamp',q=>q.eq('store',STORE).gte('timestamp',args.start).lte('timestamp',args.asOf)).paginate(options);
 const page:StoredEvent[]=result.page;
 return {...result,changed:false,page:page.filter(r=>r._creationTime<=args.asOf&&!('auditOnly'in r&&r.auditOnly===true)).map(eventShape)};
}});
// The original start of checkouts that cross the window boundary, so an old checkout
// never becomes a fresh one. Never manufacture a start or split one checkout into a
// new denominator. Called once per batch of checkouts after the pages are read.
export const earlierStarts=internalQuery({args:{dataset:v.union(v.literal('legacy'),v.literal('pixel')),sessionIds:v.array(v.string()),asOf:v.number(),start:v.number()},handler:async(ctx,args)=>{
 const firsts=await Promise.all(args.sessionIds.map(sessionId=>args.dataset==='legacy'?ctx.db.query('testCheckoutEvents').withIndex('by_store_session_name',q=>q.eq('store',STORE).eq('sessionId',sessionId).eq('name','checkout_started')).filter(q=>q.neq(q.field('auditOnly'),true)).first():ctx.db.query('shopifyCheckoutEvents').withIndex('by_store_session_name',q=>q.eq('store',STORE).eq('sessionId',sessionId).eq('name','checkout_started')).first()));
 return firsts.flatMap(first=>first&&first.timestamp<args.start&&first._creationTime<=args.asOf?[eventShape(first)]:[]);
}});
// One checkout's events, read through its index, with the same window rules as the
// full report: events since the window start plus the checkout's original start.
export const sessionEvents=internalQuery({args:{sessionId:v.string(),asOf:v.number()},handler:async(ctx,args)=>{
 const start=args.asOf-REPORT_WINDOW_MS;
 const inWindow=(rows:StoredEvent[])=>{
  const visible=rows.filter(r=>r._creationTime<=args.asOf&&r.timestamp<=args.asOf);
  const first=visible.filter(r=>r.name==='checkout_started').sort((a,b)=>a.timestamp-b.timestamp)[0];
  return visible.filter(r=>r.timestamp>=start||r===first).map(eventShape);
 };
 const legacy=await ctx.db.query('testCheckoutEvents').withIndex('by_store_session_name',q=>q.eq('store',STORE).eq('sessionId',args.sessionId)).filter(q=>q.neq(q.field('auditOnly'),true)).take(500);
 const pixel=await ctx.db.query('shopifyCheckoutEvents').withIndex('by_store_session_name',q=>q.eq('store',STORE).eq('sessionId',args.sessionId)).take(500);
 return {legacy:inWindow(legacy),pixel:inWindow(pixel)};
}});
export const collection=internalQuery({args:{pixel:v.boolean(),start:v.number()},handler:async(ctx,args)=>{
 const state=await ctx.db.query(args.pixel?'pixelCollectionState':'testCollectionState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const since=args.pixel?connection?.connectedAt??Infinity:0;
 return {configured:args.pixel?((state?.lastReceivedAt??0)>=since||('configuredAt'in(state??{})&&(state as {configuredAt?:number})?.configuredAt!>=since)?true:undefined):process.env.SHOPIFY_TEST_COLLECTION_ENABLED==='true',firstReceivedAt:(state?.lastReceivedAt??0)>=since?state?.firstReceivedAt:undefined,lastReceivedAt:(state?.lastReceivedAt??0)>=since?state?.lastReceivedAt:undefined,limited:collectionGap(state,args.start)};
}});
// HTTP actions aggregate bounded database pages, never giant query arrays.
// A fixed creation-time watermark excludes late arrivals until the next read.
const STARTS_BATCH=250;
export async function readWindow(ctx:ActionCtx,asOf=Date.now()){
 const start=asOf-REPORT_WINDOW_MS;
 const pinned=await ctx.runQuery(internal.capacity.header,{}),metadata=pinned.snapshot;
 // Legacy fallback arrays and generation metadata consume the same source budget.
 let bytes=new TextEncoder().encode(reportJSON(metadata)).length;
 async function all<T>(dataset:'legacy'|'pixel'|'prices'|'orders'|'abandoned',generation?:Id<'shopifySyncJobs'>){
  return await readPages<T>(async cursor=>{
   const next=await ctx.runQuery(internal.capacity.page,{dataset,cursor,asOf,start,generation});
   if(next.changed)throw new ReportLimit();
   bytes+=new TextEncoder().encode(JSON.stringify(next.page)).length;if(bytes>REPORT_BYTES)throw new ReportLimit();
   return {...next,page:next.page as T[]};
  });
 }
 // The datasets are independent; read them concurrently against the same watermark and budget.
 const generation=metadata&&'generation'in metadata?metadata.generation:undefined;
 // Each source reads its grouped checkouts once their build is complete, else the event rows.
 const grouped=await ctx.runQuery(internal.checkoutGroups.ready,{});
 const events=async(dataset:'legacy'|'pixel')=>{
  if(!grouped[dataset])return await withStarts(dataset,await all<CheckoutEvent>(dataset));
  const rows=await readGroups(ctx,dataset,start,asOf);
  bytes+=new TextEncoder().encode(JSON.stringify(rows)).length;if(bytes>REPORT_BYTES)throw new ReportLimit();
  return rows;
 };
 const [legacyAll,pixelAll,prices,orders,abandoned,legacyCollection,pixelCollection]=await Promise.all([events('legacy'),events('pixel'),all<CheckoutPrice>('prices'),generation?all<Snapshot['orders'][number]>('orders',generation):null,generation?all<Snapshot['abandoned'][number]>('abandoned',generation):null,ctx.runQuery(internal.capacity.collection,{pixel:false,start}),ctx.runQuery(internal.capacity.collection,{pixel:true,start})]);
 // Each checkout's earliest start, looked up in a few large batches rather than per page.
 async function withStarts(dataset:'legacy'|'pixel',rows:CheckoutEvent[]){
  const ids=[...new Set(rows.map(r=>r.sessionId))],batches=[];
  for(let i=0;i<ids.length;i+=STARTS_BATCH)batches.push(ids.slice(i,i+STARTS_BATCH));
  const starts=(await Promise.all(batches.map(sessionIds=>ctx.runQuery(internal.capacity.earlierStarts,{dataset,sessionIds,asOf,start})))).flat();
  bytes+=new TextEncoder().encode(JSON.stringify(starts)).length;if(bytes>REPORT_BYTES)throw new ReportLimit();
  return [...rows,...starts];
 }
 const legacy=[...new Map(legacyAll.map(e=>[e.eventId,e])).values()],pixel=[...new Map(pixelAll.map(e=>[e.eventId,e])).values()];
 // Legacy snapshots remain untouched and readable during staged migration.
 const snapshot=metadata&&'generation'in metadata?{...metadata,orders:orders!,abandoned:abandoned!}:metadata;
 const result={legacy:{store:STORE,events:legacy,totalStored:legacy.length,truncated:false,collection:legacyCollection},pixel:{events:pixel,totalStored:pixel.length,truncated:false,collection:pixelCollection},prices,snapshot,truncated:false,historyUnavailable:false,start,asOf,syncHeader:{connectedAt:pinned.connectedAt,generation:metadata&&'generation'in metadata?metadata.generation:undefined,syncedAt:metadata?.syncedAt,periodStart:metadata?.periodStart}};
 // Include envelopes, collection metadata and fallback structures, too.
 reportJSON(result);return result;
}

// One checkout's events for its details, with the same audience rules as readEvidence.
export async function readCheckout(ctx:ActionCtx,audience:'merchant'|'public',sessionId:string,asOf:number){
 const {legacy,pixel}=await ctx.runQuery(internal.capacity.sessionEvents,{sessionId,asOf});
 return audience==='merchant'?mergeCheckoutEvents(legacy,pixel):publicCheckoutEvents(legacy,pixel);
}
// One evidence read for every route. Merchants see merged private and pixel events
// with their server completion facts; the public demo sees only already-public
// identities and no facts. `orphan` flags events whose start lies outside the window.
export async function readEvidence(ctx:ActionCtx,audience:'merchant'|'public'){
 const window=await readWindow(ctx);
 const events=audience==='merchant'?mergeCheckoutEvents(window.legacy.events,window.pixel.events):publicCheckoutEvents(window.legacy.events,window.pixel.events);
 const started=new Set(events.filter(e=>e.name==='checkout_started').map(e=>e.sessionId));
 const facts=audience==='merchant'?{orders:window.snapshot?.orders??[],prices:window.prices}:{};
 return {window,events,facts,orphan:events.some(e=>!started.has(e.sessionId))};
}

// Only derived sync caches are temporary. Original events, prices and legacy
// snapshots are never deleted. Keep two complete generations and a one-hour
// read grace; expired unfinished jobs cannot publish after their one-day lease.
export const cleanSyncCache=internalMutation({args:{},handler:async ctx=>{
 const keep=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','published')).order('desc').take(2);
 const oldest=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','published')).filter(q=>q.neq(q.field('canonicalCacheCleaned'),true)).order('asc').first();
 const expired=await ctx.db.query('shopifySyncJobs').withIndex('by_store_status',q=>q.eq('store',STORE).eq('status','running')).filter(q=>q.neq(q.field('canonicalCacheCleaned'),true)).order('asc').first();
 const target=expired&&Date.now()-expired.startedAt>=86400000?expired:oldest&&!keep.some(j=>j._id===oldest._id)&&Date.now()-oldest.updatedAt>=3600000?oldest:null;
 if(!target)return;
 const rows=await ctx.db.query('shopifySyncRows').withIndex('by_job_kind',q=>q.eq('job',target._id)).take(200);
 for(const row of rows)await ctx.db.delete(row._id);
 const cursors=await ctx.db.query('shopifySyncCursors').withIndex('by_job_kind_cursor',q=>q.eq('job',target._id)).take(200);
 for(const row of cursors)await ctx.db.delete(row._id);
 if(!rows.length&&!cursors.length){
  // Canonical version visibility depends on this immutable publication header.
  if(target.canonical)await ctx.db.patch(target._id,{canonicalCacheCleaned:true});else await ctx.db.delete(target._id);
 }
 await ctx.scheduler.runAfter(0,internal.capacity.cleanSyncCache,{});
}});
