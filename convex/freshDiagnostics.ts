import {internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {STORE} from '../shared/evidence';
import {canReadShopifyEvidence} from '../shared/checkoutIdentity';
import {canSaveSyncedSnapshot} from '../shared/shopifySync';
import {sha256} from 'js-sha256';
import {publishedVersion,versionBudget} from './nativeStore';

// Fixed October 9 QA cases only. No session/token/native-ID input, public API,
// broad collection reads, Shopify requests, or database writes are supported.
const cases=[
 {kind:'orders' as const,nativeId:'18937951617250',sessionId:'b12c3b946293d92562181b91fcd3eed117b8a5a8e170988a8972089550a5c80f'},
 {kind:'abandoned' as const,nativeId:'66832565436642',sessionId:'fc92b53c02a7befd28e6b27584dadbc0fd01a405c83524b010eeba20267b1945'},
];
export const read=internalQuery({args:{generation:v.id('shopifySyncJobs')},handler:async(ctx,{generation})=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const job=await ctx.db.get(generation);
 if(!connection||!canReadShopifyEvidence(connection)||!job||job.store!==STORE||job.status!=='published'||job.connectedAt!==connection.connectedAt||!canSaveSyncedSnapshot(job.startedAt,connection.connectedAt,state?.revokedAt))throw Error('Pinned test publication is unavailable for this installation.');
 const records=[];const budget=versionBudget();
 for(const testCase of cases){
  const price=await ctx.db.query('shopifyCheckoutPrices').withIndex('by_store_session',q=>q.eq('store',STORE).eq('sessionId',testCase.sessionId)).unique();
  // Prices are mutable/latest, separate from the immutable pinned native scan.
  const currentPrice=price&&price.receivedAt!==undefined&&price.receivedAt>=connection.connectedAt?price:null;
  records.push({source:'signed-price' as const,kind:testCase.kind,sessionId:testCase.sessionId,present:!!currentPrice,...(currentPrice?{currency:currentPrice.currency,subtotalCents:currentPrice.subtotalCents,totalCents:currentPrice.totalCents,createdAt:currentPrice.createdAt,updatedAt:currentPrice.updatedAt,receivedAt:currentPrice.receivedAt,recovered:currentPrice.recovered,...(currentPrice.completedAt!==undefined?{completedAt:currentPrice.completedAt}:{})}:{})});
  const recordHash=sha256(`${STORE}:${testCase.kind==='orders'?'order':'abandoned-gql'}:gid://shopify/${testCase.kind==='orders'?'Order':'AbandonedCheckout'}/${testCase.nativeId}`);
  let row;let sourceUpdatedAt:number|undefined;
  if(job.canonical){
   const head=await ctx.db.query('shopifyNativeHeads').withIndex('by_install_kind_hash',q=>q.eq('store',STORE).eq('connectedAt',connection.connectedAt).eq('kind',testCase.kind).eq('recordHash',recordHash)).unique();
   const version=head?await publishedVersion(ctx,head._id,job,budget):null;
   row=version?.row;sourceUpdatedAt=version?.sourceUpdatedAt;
  }else{
   const saved=await ctx.db.query('shopifySyncRows').withIndex('by_job_kind_hash',q=>q.eq('job',generation).eq('kind',testCase.kind).eq('recordHash',recordHash)).unique();
   row=saved?.row;
  }
  if(row&&(row.recordHash!==recordHash||('paid' in row)!==(testCase.kind==='orders')))throw Error('Unexpected test record identity.');
  // A retained canonical identity can outlive the pinned reporting window.
  if(row&&(row.createdAt<job.periodStart||Date.parse(row.createdAt)>job.startedAt))row=undefined;
  records.push({source:'native-publication' as const,kind:testCase.kind,nativeId:testCase.nativeId,recordHash,present:!!row,...(row?{currency:job.currency,createdAt:row.createdAt,subtotalCents:row.subtotalCents,...(row.totalCents!==undefined?{totalCents:row.totalCents}:{}),...(sourceUpdatedAt!==undefined?{sourceUpdatedAt}:{}),...(row.sessionId?{sessionId:row.sessionId,matchesExpectedSession:row.sessionId===testCase.sessionId}:{matchesExpectedSession:null}),...('paid' in row?{paid:row.paid,test:row.test,cancelled:row.cancelled,...(row.orderId?{orderId:row.orderId}:{}),...(row.orderName?{orderName:row.orderName}:{})}:{recovered:row.recovered})}:{})});
 }
 return {store:STORE,generation,syncedAt:job.startedAt,readAt:Date.now(),canonical:!!job.canonical,pendingUpdates:(job.deferredUntil??0)>job.startedAt,reconciliationVerified:false,records};
}});
