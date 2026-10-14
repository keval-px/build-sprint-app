import {currentSnapshot} from './capacity';
import {nextSyncHealth} from '../shared/monitoringHealth';
import {orderHistoryStart} from '../shared/orderPattern';
import {canSaveSyncedSnapshot} from '../shared/shopifySync';
import {nativePlan,nativeFilter} from '../shared/nativeSync';
import {internalAction,internalMutation, internalQuery} from './_generated/server';
import {internal} from './_generated/api';
import type {ActionCtx} from './_generated/server';
import {v} from 'convex/values';
import {STORE} from '../shared/evidence';
import {checkoutIdentity} from '../shared/checkoutIdentity';
import {persistedNativeCheckoutSession} from './lib/checkoutMatching';
import {moneyMinor,currencyScale} from '../shared/money';
import { recordDigest} from '../shared/shopifyRecords';
import {exchangeMerchant, refreshMerchant, verifyMerchant, REQUIRED_SCOPES} from './lib/shopifyAuth';
import {identityQuery, abandonedQuery, ordersQuery,abandonedUpdatesQuery,ordersUpdatesQuery,checkoutSubscriptionsQuery,checkoutSubscriptionCreate,checkoutSubscriptionDelete} from './lib/shopifyQueries';
import type {Session} from '@shopify/shopify-api';
import {shopifyOrigin} from './lib/deployment';
import {deployment} from '../shared/deployment';
import {pixelQuery,pixelCreate,pixelUpdate,checkoutSubscriptionUpdate} from './lib/shopifyQueries';

export const connection = internalQuery({args:{}, handler:ctx => ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique()});
export const legacySnapshot = internalQuery({args:{},handler:ctx=>ctx.db.query('shopifySnapshots').withIndex('by_store',q=>q.eq('store',STORE)).unique()});
export const snapshot = internalQuery({args:{}, handler:currentSnapshot});
export const saveConnection = internalMutation({args:{accessToken:v.string(),refreshToken:v.optional(v.string()),expiresAt:v.optional(v.number()),refreshExpiresAt:v.optional(v.number()),scopes:v.array(v.string()),issuedAt:v.number()},handler:async(ctx,args)=>{
  const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(state && args.issuedAt <= state.revokedAt) throw Error('Shopify installation changed. Reopen the app.');
  const old=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(old&&args.issuedAt<old.connectedAt)throw Error('Shopify installation changed. Reopen the app.');
  const {issuedAt,...values}=args;
  // connectedAt identifies an installation, not a credential refresh.
  const connectedAt=old&&(!state||old.connectedAt>state.revokedAt)?old.connectedAt:Date.now();
  if(old)await ctx.db.replace(old._id,{...values,store:STORE,connectedAt});
  else await ctx.db.insert('shopifyConnections',{...values,store:STORE,connectedAt:Date.now()});
}});
export const saveSnapshot = internalMutation({args:{storeName:v.optional(v.string()),timeZone:v.optional(v.string()),currency:v.optional(v.string()),syncedAt:v.number(),periodStart:v.string(),orders:v.array(v.object({recordHash:v.string(),conversion:v.optional(v.object({shopMinor:v.number(),buyerMinor:v.number(),buyerCurrency:v.string()})),sessionId:v.optional(v.string()),orderName:v.optional(v.string()),orderId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),test:v.boolean(),paid:v.boolean(),cancelled:v.boolean()})),abandoned:v.array(v.object({recordHash:v.string(),sessionId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),recovered:v.boolean()}))},handler:async(ctx,args)=>{
  const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  const liveConnection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(!canSaveSyncedSnapshot(args.syncedAt,liveConnection?.connectedAt,state?.revokedAt))throw Error('Shopify installation changed. Reopen the app.');
  const old=await ctx.db.query('shopifySnapshots').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(old && old.syncedAt>args.syncedAt)return;
  if(old)await ctx.db.replace(old._id,{...args,store:STORE});else await ctx.db.insert('shopifySnapshots',{...args,store:STORE});
}});
export const revoke = internalMutation({args:{eventId:v.string(),triggeredAt:v.number()},handler:async(ctx,args)=>{
  if(await ctx.db.query('shopifyLifecycleEvents').withIndex('by_event',q=>q.eq('eventId',args.eventId)).unique())return;
  await ctx.db.insert('shopifyLifecycleEvents',{eventId:args.eventId,receivedAt:Date.now()});
  const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(state && state.revokedAt>=args.triggeredAt)return;
  if(state)await ctx.db.patch(state._id,{revokedAt:args.triggeredAt});else await ctx.db.insert('shopifyInstallState',{store:STORE,revokedAt:args.triggeredAt});
  const old=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(old && old.connectedAt<=args.triggeredAt)await ctx.db.delete(old._id);
}});
async function storeSession(ctx:ActionCtx,session:Session,issuedAt:number){
  if(session.shop!==STORE || !session.accessToken)throw Error('Shopify returned an unexpected installation.');
  const scopes=(session.scope??'').split(',').filter(Boolean);
  if(REQUIRED_SCOPES.some(scope=>!scopes.includes(scope)))throw Error('Install the requested Shopify permissions first.');
  await ctx.runMutation(internal.shopify.saveConnection,{accessToken:session.accessToken,refreshToken:session.refreshToken,expiresAt:session.expires?.getTime(),refreshExpiresAt:session.refreshTokenExpires?.getTime(),scopes,issuedAt});
  return session.accessToken;
}
export async function authorizedAccess(ctx:ActionCtx,idToken:string):Promise<string>{
  await verifyMerchant(idToken);
  if(deployment.kind==='local' && process.env.LOCAL_CONNECTION_ENABLED!=='true')throw Error('Development installation is not enabled yet.');
  const issuedAt=Date.now();
  const saved=await ctx.runQuery(internal.shopify.connection,{});
  if(saved && saved.expiresAt && saved.expiresAt>Date.now()+60000 && REQUIRED_SCOPES.every(s=>saved.scopes.includes(s)))return saved.accessToken;
  if(saved?.refreshToken && saved.refreshExpiresAt && saved.refreshExpiresAt>Date.now()+60000){
    try{return await storeSession(ctx,await refreshMerchant(saved.refreshToken),issuedAt);}catch{/* Re-authorize only with a valid merchant session. */}
  }
  return storeSession(ctx,await exchangeMerchant(idToken),issuedAt);
}
export async function adminRead<T>(accessToken:string,query:string,variables:Record<string,unknown>={}):Promise<T>{
  const operation=query===abandonedQuery||query===abandonedUpdatesQuery?'abandoned checkouts':query===ordersQuery||query===ordersUpdatesQuery?'orders':'app settings';
  try{
    const response=await fetch(`https://${STORE}/admin/api/2026-10/graphql.json`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':accessToken},body:JSON.stringify({query,variables})});
    if(!response.ok)throw Error();
    const text=await response.text();if(text.length>1500000)throw Error();
    const result=JSON.parse(text);
    if(result.errors?.length){
      const protectedData=result.errors.some((e:{message?:unknown})=>typeof e.message==='string'&&/protected customer|approved.*customer|customer data/i.test(e.message));
      const denied=result.errors.some((e:{extensions?:{code?:unknown}})=>e.extensions?.code==='ACCESS_DENIED');
      throw Error(`Shopify blocked ${operation}: ${protectedData?'protected customer data approval required':denied?'access denied':'query rejected'}.`);
    }
    if(!result.data)throw Error();
    return result.data as T;
  }catch(error){
    if(error instanceof Error && /^Shopify blocked (abandoned checkouts|orders|app settings): (protected customer data approval required|access denied|query rejected)\.$/.test(error.message))throw error;
    throw Error('Shopify could not return data. Check permissions and retry; previous results are retained.');
  }
}
const priceWebhookDestination=()=>`${shopifyOrigin()}/api/shopify/webhooks`;
const priceWebhookFields=['token','created_at','updated_at','currency','subtotal_price','total_price','completed_at'];
async function ensureCheckoutSubscriptions(access:string){
 const result=await adminRead<{webhookSubscriptions:{nodes:{id:string;topic:string;uri:string;includeFields:string[]}[];pageInfo:{hasNextPage:boolean}}}>(access,checkoutSubscriptionsQuery);
 if(result.webhookSubscriptions.pageInfo.hasNextPage)throw Error('Too many checkout subscriptions. Previous results are retained.');
 for(const topic of ['CHECKOUTS_CREATE','CHECKOUTS_UPDATE']){
  const existing=result.webhookSubscriptions.nodes.filter(s=>s.topic===topic&&s.uri===priceWebhookDestination());
  if(existing.length){
   if(!existing.some(s=>s.includeFields.length===priceWebhookFields.length&&priceWebhookFields.every(f=>s.includeFields.includes(f))))throw Error('Checkout notification fields need attention.');
   continue;
  }
  if(deployment.kind==='local'){
   const old=result.webhookSubscriptions.nodes.filter(s=>s.topic===topic&&/^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/api\/shopify\/webhooks$/.test(s.uri)&&s.includeFields.length===priceWebhookFields.length&&priceWebhookFields.every(f=>s.includeFields.includes(f)));
   if(old.length>1)throw Error('Multiple development notification destinations need attention.');
   if(old.length===1){
    const updated=await adminRead<{webhookSubscriptionUpdate:{webhookSubscription:{id:string}|null;userErrors:unknown[]}}>(access,checkoutSubscriptionUpdate,{id:old[0].id,subscription:{uri:priceWebhookDestination()}});
    if(updated.webhookSubscriptionUpdate.userErrors.length||updated.webhookSubscriptionUpdate.webhookSubscription?.id!==old[0].id)throw Error('Development notification update failed.');
    continue;
   }
  }
  const saved=await adminRead<{webhookSubscriptionCreate:{webhookSubscription:{id:string}|null;userErrors:unknown[]}}>(access,checkoutSubscriptionCreate,{topic,subscription:{uri:priceWebhookDestination(),format:'JSON',includeFields:priceWebhookFields}});
  if(deployment.kind==='local'&&saved.webhookSubscriptionCreate.userErrors.length){
   // The request contains only public topic/destination/field names, no secrets.
   const reasons=saved.webhookSubscriptionCreate.userErrors.map(error=>error&&typeof error==='object'&&'message' in error?String(error.message).slice(0,350):'Request rejected').join('; ');
   throw Error(`Development checkout notifications rejected: ${reasons}`);
  }
  if(!saved.webhookSubscriptionCreate.webhookSubscription||saved.webhookSubscriptionCreate.userErrors.length)throw Error('Checkout notifications could not be enabled. Check Shopify permissions.');
 }
 return {topics:2,fields:priceWebhookFields.length};
}
export async function enableLocalPixel(ctx:ActionCtx,access:string){
 if(deployment.kind!=='local')throw Error('Development-only operation.');
 const settings=JSON.stringify({endpoint:`${shopifyOrigin()}/api/shopify/pixel-events`});
 let current:{id:string;settings:unknown}|null=null;
 // An unconfigured Shopify pixel query can return an explicit not-found error.
 try{current=(await adminRead<{webPixel:{id:string;settings:unknown}|null}>(access,pixelQuery)).webPixel;}catch{}
 if(current){
  const result=await adminRead<{webPixelUpdate:{webPixel:{id:string}|null;userErrors:unknown[]}}>(access,pixelUpdate,{id:current.id,settings});
  if(result.webPixelUpdate.userErrors.length||result.webPixelUpdate.webPixel?.id!==current.id)throw Error('Development pixel update failed.');
 }else{
  const result=await adminRead<{webPixelCreate:{webPixel:{id:string}|null;userErrors:unknown[]}}>(access,pixelCreate,{settings});
  if(result.webPixelCreate.userErrors.length||!result.webPixelCreate.webPixel)throw Error('Development pixel activation failed.');
 }
 await ctx.runMutation(internal.shopifyEvents.configured,{});
 return {enabled:true};
}
export const refreshLocalDestinations=internalAction({args:{},handler:async(ctx):Promise<{status:string}>=>{
 if(deployment.kind!=='local'||process.env.LOCAL_CONNECTION_ENABLED!=='true')throw Error('Development installation is disabled.');
 const connection=await ctx.runQuery(internal.shopify.connection,{});
 if(!connection)return {status:'open-the-app-to-connect'};
 if(!REQUIRED_SCOPES.every(scope=>connection.scopes.includes(scope)))throw Error('Development installation permissions are incomplete.');
 let access=connection.accessToken;
 if(connection.expiresAt!==undefined&&connection.expiresAt<=Date.now()+60000){
  if(!connection.refreshToken||!connection.refreshExpiresAt||connection.refreshExpiresAt<=Date.now()+60000)return {status:'open-the-app-to-connect'};
  access=await storeSession(ctx,await refreshMerchant(connection.refreshToken),Date.now());
 }
 await enableLocalPixel(ctx,access);
 await ensureCheckoutSubscriptions(access);
 return {status:'updated'};
}});
export const checkoutPriceStatus=internalAction({args:{},handler:async(ctx):Promise<{activeTopics:string[];requestedFields:string[];destination:string}>=>{
 const connection=await ctx.runQuery(internal.shopify.connection,{});
 if(!connection)throw Error('Open the Shopify app to connect first.');
 const result=await adminRead<{webhookSubscriptions:{nodes:{topic:string;uri:string;includeFields:string[]}[];pageInfo:{hasNextPage:boolean}}}>(connection.accessToken,checkoutSubscriptionsQuery);
 return {activeTopics:result.webhookSubscriptions.nodes.filter(s=>s.uri===priceWebhookDestination()).map(s=>s.topic),requestedFields:priceWebhookFields,destination:priceWebhookDestination()};
}});
// Undo only the exact checkout-price subscriptions at our own destination.
export const stopCheckoutPrices=internalAction({args:{},handler:async(ctx):Promise<{removed:number}>=>{
 const connection=await ctx.runQuery(internal.shopify.connection,{});
 if(!connection)throw Error('Open the Shopify app to connect first.');
 const result=await adminRead<{webhookSubscriptions:{nodes:{id:string;topic:string;uri:string;includeFields:string[]}[];pageInfo:{hasNextPage:boolean}}}>(connection.accessToken,checkoutSubscriptionsQuery);
 if(result.webhookSubscriptions.pageInfo.hasNextPage)throw Error('Incomplete subscription list.');
 const own=result.webhookSubscriptions.nodes.filter(s=>s.uri===priceWebhookDestination()&&s.includeFields.length===priceWebhookFields.length&&priceWebhookFields.every(f=>s.includeFields.includes(f)));
 for(const s of own){
  const deleted=await adminRead<{webhookSubscriptionDelete:{deletedWebhookSubscriptionId:string|null;userErrors:unknown[]}}>(connection.accessToken,checkoutSubscriptionDelete,{id:s.id});
  if(deleted.webhookSubscriptionDelete.deletedWebhookSubscriptionId!==s.id||deleted.webhookSubscriptionDelete.userErrors.length)throw Error('Could not stop checkout notifications.');
 }
 return {removed:own.length};
}});
// Owner-run installation check; credentials remain within the backend action.
export const enableCheckoutPrices=internalAction({args:{},handler:async (ctx):Promise<{topics:number;fields:number}>=>{
 const connection=await ctx.runQuery(internal.shopify.connection,{});
 if(!connection||!connection.scopes.includes('read_orders'))throw Error('Open the Shopify app to connect first.');
 return ensureCheckoutSubscriptions(connection.accessToken);
}});
type Money={amount:string;currencyCode:string};
type NativeRecord={id:string;name?:string;checkoutToken?:string|null;currentTotalPriceSet?:{shopMoney:Money};totalPriceSet?:{shopMoney:Money};createdAt:string;updatedAt:string;completedAt?:string|null;currentSubtotalPriceSet?:{shopMoney:Money;presentmentMoney?:Money};subtotalPriceSet?:{shopMoney:Money};test?:boolean;cancelledAt?:string|null;displayFinancialStatus?:string};
export async function syncStore(ctx:ActionCtx,idToken:string){
  return syncWithAccess(ctx,await authorizedAccess(ctx,idToken));
}
async function syncWithAccess(ctx:ActionCtx,access:string){
 const attemptedAt=Date.now();
 try{return await performSync(ctx,access,attemptedAt);}catch(error){
  const job=await ctx.runQuery(internal.capacity.running,{});
  await ctx.runMutation(internal.shopify.saveSyncHealth,{status:error instanceof Error&&(error.message==='Incomplete Shopify pagination.'||error.message.startsWith('Reporting exceeds'))?'limit':'failed',lastAttemptAt:job&&job.startedAt<=attemptedAt?job.startedAt:attemptedAt});
  throw error;
 }
}
async function performSync(ctx:ActionCtx,access:string,startedAt:number){
 const connection=await ctx.runQuery(internal.shopify.connection,{});if(!connection)throw Error('Open the Shopify app to connect first.');
 const planned=await ctx.runQuery(internal.capacity.syncPlan,{startedAt});
 if(planned.idle&&planned.base)return {store:STORE,status:'synced',syncedAt:planned.base.startedAt,orders:planned.base.orderCount,abandoned:planned.base.abandonedCount};
 const metadata=planned.resume??planned.base;
 let currency=metadata?.currency,timeZone=metadata?.timeZone,storeName=metadata?.storeName;
 // Metadata is persisted too; ordinary incremental polling avoids an identity
 // API round trip. Initial imports/reconciliation re-verify the store/scopes.
 if(!planned.resume&&(!planned.base||nativePlan(startedAt,orderHistoryStart(startedAt,timeZone!),planned.base).mode!=='incremental')){
  const identity=await adminRead<{shop:{name:string;myshopifyDomain:string;currencyCode:string;ianaTimezone:string};currentAppInstallation:{app:{id:string;title:string};accessScopes:{handle:string}[]}}>(access,identityQuery);
  if(identity.shop.myshopifyDomain!==STORE||REQUIRED_SCOPES.some(s=>!identity.currentAppInstallation.accessScopes.some(x=>x.handle===s)))throw Error('Unexpected store or missing Shopify permissions.');
  currency=identity.shop.currencyCode;timeZone=identity.shop.ianaTimezone;storeName=identity.shop.name;
 }
 if(!currency||!timeZone||!storeName||currencyScale(currency)===null)throw Error('Store currency is not supported.');
 const id=await ctx.runMutation(internal.capacity.begin,{canonical:true,connectedAt:connection.connectedAt,startedAt,periodStart:orderHistoryStart(startedAt,timeZone),storeName,timeZone,currency});
 const initial=await ctx.runQuery(internal.capacity.job,{id});if(!initial)throw Error('Missing sync job.');
 const storeMinor=(money:Money|undefined)=>money?.currencyCode===initial.currency?moneyMinor(money.amount,initial.currency):null;
 const normalizeOrder=async(row:NativeRecord)=>({recordHash:await recordDigest('order',row.id),...(typeof row.checkoutToken==='string'&&row.checkoutToken.length&&typeof row.name==='string'&&row.name.length ? {sessionId:checkoutIdentity(row.checkoutToken),orderName:row.name,...(/^gid:\/\/shopify\/Order\/[1-9]\d*$/.test(row.id)?{orderId:row.id.split('/').at(-1)!}:{})} : {}),createdAt:row.createdAt,totalCents:storeMinor(row.currentTotalPriceSet?.shopMoney),subtotalCents:storeMinor(row.currentSubtotalPriceSet?.shopMoney),...(row.currentSubtotalPriceSet?.presentmentMoney&&storeMinor(row.currentSubtotalPriceSet.shopMoney)!==null&&moneyMinor(row.currentSubtotalPriceSet.presentmentMoney.amount,row.currentSubtotalPriceSet.presentmentMoney.currencyCode)!==null?{conversion:{shopMinor:storeMinor(row.currentSubtotalPriceSet.shopMoney)!,buyerMinor:moneyMinor(row.currentSubtotalPriceSet.presentmentMoney.amount,row.currentSubtotalPriceSet.presentmentMoney.currencyCode)!,buyerCurrency:row.currentSubtotalPriceSet.presentmentMoney.currencyCode}}:{}),test:row.test===true,paid:row.displayFinancialStatus==='PAID',cancelled:!!row.cancelledAt});
 // Keep verified historical links from the original snapshot. It is never deleted.
 const previous=await ctx.runQuery(internal.shopify.legacySnapshot,{});
 // Existing compatibility imports also hold exact numeric-ID/token links.
 // Reuse them locally; no new Shopify fields, scopes or recovery URLs.
 const verifiedLinks=await ctx.runQuery(internal.abandoned.read,{});
 try{
  for(let step=0;step<4;step++){
   const job=await ctx.runQuery(internal.capacity.job,{id});if(!job)throw Error('Missing sync job.');
   if(job.status==='published')return {store:STORE,syncedAt:job.startedAt,orders:job.orderCount,abandoned:job.abandonedCount,status:'synced'};
   const kind=job.ordersDone?'abandoned':'orders',field=kind==='orders'?'orders':'abandonedCheckouts',cursor=kind==='orders'?job.ordersCursor:job.abandonedCursor;
   // Freeze scan bounds; later updates belong to the next overlapping scan.
   const filter=nativeFilter(job.mode??'backfill',job.filterStart??job.periodStart,job.startedAt);
   const query=kind==='orders'?(job.mode==='incremental'?ordersUpdatesQuery:ordersQuery):(job.mode==='incremental'?abandonedUpdatesQuery:abandonedQuery);
   const data=await adminRead<Record<string,{nodes:NativeRecord[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}>>(access,query,{after:cursor,filter});
   const batch=data[field];if(!batch||!Array.isArray(batch.nodes)||batch.nodes.length>100||!batch.pageInfo||typeof batch.pageInfo.hasNextPage!=='boolean')throw Error('Unexpected Shopify records.');
   let deferredUntil=job.deferredUntil??0;
   const included=batch.nodes.filter(row=>{
    if(typeof row.id!=='string'||!new RegExp(`^gid://shopify/${kind==='orders'?'Order':'AbandonedCheckout'}/[1-9]\\d*$`).test(row.id)||!Number.isFinite(Date.parse(row.createdAt))||Date.parse(row.createdAt)<0||(job.mode!=='incremental'&&Date.parse(row.createdAt)<Date.parse(job.periodStart))||Date.parse(row.createdAt)>job.startedAt||!Number.isFinite(Date.parse(row.updatedAt))||Date.parse(row.updatedAt)<Date.parse(row.createdAt)||(job.mode==='incremental'&&Date.parse(row.updatedAt)<Date.parse(job.filterStart!)))throw Error('Invalid Shopify records.');
    if(Date.parse(row.updatedAt)>job.startedAt){
     deferredUntil=Math.max(deferredUntil,Date.parse(row.updatedAt));return false;
    }
    return true;
   });
   // A record may change after the frozen start. Advance the
   // cursor without publishing that future version; overlap imports it next.
   const rows=await Promise.all(included.map(async row=>{
    row={...row,createdAt:new Date(row.createdAt).toISOString()};
    if(kind==='orders')return normalizeOrder(row);
    const recordHash=await recordDigest('abandoned-gql',row.id),sessionId=await persistedNativeCheckoutSession(row.id,recordHash,previous?.abandoned??[],verifiedLinks?.records??[]);
    return {recordHash,...(sessionId?{sessionId}:{}),createdAt:row.createdAt,totalCents:storeMinor(row.totalPriceSet?.shopMoney),subtotalCents:storeMinor(row.subtotalPriceSet?.shopMoney),recovered:!!row.completedAt};
   }));
   await ctx.runMutation(internal.capacity.accept,{id,kind,cursor,next:batch.pageInfo.endCursor,done:!batch.pageInfo.hasNextPage,rows,sourceUpdatedAt:included.map(row=>Date.parse(row.updatedAt)),...(deferredUntil>job.startedAt?{deferredUntil}:{})});
  }
  const job=await ctx.runQuery(internal.capacity.job,{id});
  if(job?.status==='published')return {store:STORE,syncedAt:job.startedAt,orders:job.orderCount,abandoned:job.abandonedCount,status:'synced'};
  // Continuations carry no credentials; they recheck/renew the offline installation.
  await ctx.scheduler.runAfter(0,internal.shopify.syncAutomatically,{});
  return {store:STORE,status:'syncing',orders:job?.orderCount??0,abandoned:job?.abandonedCount??0};
 }catch(error){
  await ctx.runMutation(internal.shopify.saveSyncHealth,{status:error instanceof Error&&error.message==='Incomplete Shopify pagination.'?'limit':'failed',lastAttemptAt:initial.startedAt});
  throw error;
 }
}

// Convex runs this with the existing offline installation, never browser tokens.
export const syncAutomatically=internalAction({args:{},handler:async(ctx):Promise<{status:string}>=>{
 if(deployment.kind==='local' && process.env.LOCAL_SYNC_ENABLED!=='true')return {status:'paused'};
 const saved=await ctx.runQuery(internal.shopify.connection,{});
 if(!saved||!REQUIRED_SCOPES.every(s=>saved.scopes.includes(s)))return {status:'disconnected'};
 let access=saved.accessToken;
 if(saved.expiresAt!==undefined&&saved.expiresAt<=Date.now()+60000){
  if(!saved.refreshToken||!saved.refreshExpiresAt||saved.refreshExpiresAt<=Date.now()+60000){await ctx.runMutation(internal.shopify.saveSyncHealth,{status:'reconnect',lastAttemptAt:Date.now()});return {status:'reconnect_required'};}
  const issuedAt=Date.now();
  try{access=await storeSession(ctx,await refreshMerchant(saved.refreshToken),issuedAt);}
  catch{await ctx.runMutation(internal.shopify.saveSyncHealth,{status:'reconnect',lastAttemptAt:Date.now()});return {status:'reconnect_required'};}
 }
 try{const result=await syncWithAccess(ctx,access);return {status:result.status};}
 catch{throw Error('Automatic Shopify sync failed; previous figures retained.');}
}});

// Safe owner diagnostics: no credentials or order/customer fields returned.
export const automaticSyncStatus=internalQuery({args:{},handler:async(ctx)=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const snapshot=await currentSnapshot(ctx);
 return {connected:!!connection,accessExpiresAt:connection?.expiresAt??null,refreshAvailable:!!connection?.refreshToken,syncedAt:snapshot?.syncedAt??null,orderCount:snapshot&&'orderCount'in snapshot?snapshot.orderCount:snapshot?.orders.length??0};
}});

// Private, installation-scoped monitoring metadata; no raw API errors or credentials.
export const saveSyncHealth=internalMutation({args:{status:v.union(v.literal('success'),v.literal('failed'),v.literal('limit'),v.literal('reconnect')),lastAttemptAt:v.number(),lastSuccessAt:v.optional(v.number()),coverageStart:v.optional(v.number()),coverageEnd:v.optional(v.number())},handler:async(ctx,args)=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const install=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const old=await ctx.db.query('shopifyMonitoring').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const next=nextSyncHealth(old,args,connection?.connectedAt,install?.revokedAt);if(!next)return;
 if(old)await ctx.db.replace(old._id,{...next,store:STORE});else await ctx.db.insert('shopifyMonitoring',{...next,store:STORE});
}});
export const monitoring=internalQuery({args:{},handler:async ctx=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const row=await ctx.db.query('shopifyMonitoring').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(!connection||!row||row.lastAttemptAt<connection.connectedAt)return {required:true};
 return {required:true,status:row.status,lastAttemptAt:row.lastAttemptAt,lastSuccessAt:row.lastSuccessAt,coverageStart:row.coverageStart,coverageEnd:row.coverageEnd};
}});
