import {orderHistoryStart} from '../shared/orderPattern';
import {canSaveSyncedSnapshot} from '../shared/shopifySync';
import {internalAction,internalMutation, internalQuery} from './_generated/server';
import {internal} from './_generated/api';
import type {ActionCtx} from './_generated/server';
import {v} from 'convex/values';
import {STORE} from '../shared/evidence';
import {checkoutIdentity} from '../shared/checkoutIdentity';
import {savedCheckoutSession} from '../shared/checkoutPrice';
import {moneyMinor,currencyScale} from '../shared/money';
import {usdCents, recordDigest} from '../shared/shopifyRecords';
import {exchangeMerchant, refreshMerchant, verifyMerchant, REQUIRED_SCOPES} from './lib/shopifyAuth';
import {identityQuery, abandonedQuery, ordersQuery,checkoutSubscriptionsQuery,checkoutSubscriptionCreate,checkoutSubscriptionDelete} from './lib/shopifyQueries';
import type {Session} from '@shopify/shopify-api';

export const connection = internalQuery({args:{}, handler:ctx => ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique()});
export const snapshot = internalQuery({args:{}, handler:ctx => ctx.db.query('shopifySnapshots').withIndex('by_store',q=>q.eq('store',STORE)).unique()});
export const saveConnection = internalMutation({args:{accessToken:v.string(),refreshToken:v.optional(v.string()),expiresAt:v.optional(v.number()),refreshExpiresAt:v.optional(v.number()),scopes:v.array(v.string()),issuedAt:v.number()},handler:async(ctx,args)=>{
  const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(state && args.issuedAt <= state.revokedAt) throw Error('Shopify installation changed. Reopen the app.');
  const old=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  const {issuedAt,...values}=args;
  if(old)await ctx.db.replace(old._id,{...values,store:STORE,connectedAt:Date.now()});
  else await ctx.db.insert('shopifyConnections',{...values,store:STORE,connectedAt:Date.now()});
}});
export const saveSnapshot = internalMutation({args:{timeZone:v.optional(v.string()),currency:v.optional(v.string()),syncedAt:v.number(),periodStart:v.string(),orders:v.array(v.object({recordHash:v.string(),conversion:v.optional(v.object({shopMinor:v.number(),buyerMinor:v.number(),buyerCurrency:v.string()})),sessionId:v.optional(v.string()),orderName:v.optional(v.string()),orderId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),test:v.boolean(),paid:v.boolean(),cancelled:v.boolean()})),abandoned:v.array(v.object({recordHash:v.string(),sessionId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),recovered:v.boolean()}))},handler:async(ctx,args)=>{
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
  const issuedAt=Date.now();
  const saved=await ctx.runQuery(internal.shopify.connection,{});
  if(saved && saved.expiresAt && saved.expiresAt>Date.now()+60000 && REQUIRED_SCOPES.every(s=>saved.scopes.includes(s)))return saved.accessToken;
  if(saved?.refreshToken && saved.refreshExpiresAt && saved.refreshExpiresAt>Date.now()+60000){
    try{return await storeSession(ctx,await refreshMerchant(saved.refreshToken),issuedAt);}catch{/* Re-authorize only with a valid merchant session. */}
  }
  return storeSession(ctx,await exchangeMerchant(idToken),issuedAt);
}
export async function adminRead<T>(accessToken:string,query:string,variables:Record<string,unknown>={}):Promise<T>{
  const operation=query===abandonedQuery?'abandoned checkouts':query===ordersQuery?'orders':'app settings';
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
const priceWebhookUri='https://neighborly-nightingale-843.convex.site/api/shopify/webhooks';
const priceWebhookFields=['token','created_at','updated_at','currency','subtotal_price','total_price','completed_at'];
async function ensureCheckoutSubscriptions(access:string){
 const result=await adminRead<{webhookSubscriptions:{nodes:{topic:string;uri:string;includeFields:string[]}[];pageInfo:{hasNextPage:boolean}}}>(access,checkoutSubscriptionsQuery);
 if(result.webhookSubscriptions.pageInfo.hasNextPage)throw Error('Too many checkout subscriptions. Previous results are retained.');
 for(const topic of ['CHECKOUTS_CREATE','CHECKOUTS_UPDATE']){
  const existing=result.webhookSubscriptions.nodes.filter(s=>s.topic===topic&&s.uri===priceWebhookUri);
  if(existing.length){
   if(!existing.some(s=>s.includeFields.length===priceWebhookFields.length&&priceWebhookFields.every(f=>s.includeFields.includes(f))))throw Error('Checkout notification fields need attention.');
   continue;
  }
  const saved=await adminRead<{webhookSubscriptionCreate:{webhookSubscription:{id:string}|null;userErrors:unknown[]}}>(access,checkoutSubscriptionCreate,{topic,subscription:{uri:priceWebhookUri,format:'JSON',includeFields:priceWebhookFields}});
  if(!saved.webhookSubscriptionCreate.webhookSubscription||saved.webhookSubscriptionCreate.userErrors.length)throw Error('Checkout notifications could not be enabled. Check Shopify permissions.');
 }
 return {topics:2,fields:priceWebhookFields.length};
}
export const checkoutPriceStatus=internalAction({args:{},handler:async(ctx):Promise<{activeTopics:string[];requestedFields:string[];destination:string}>=>{
 const connection=await ctx.runQuery(internal.shopify.connection,{});
 if(!connection)throw Error('Open the Shopify app to connect first.');
 const result=await adminRead<{webhookSubscriptions:{nodes:{topic:string;uri:string;includeFields:string[]}[];pageInfo:{hasNextPage:boolean}}}>(connection.accessToken,checkoutSubscriptionsQuery);
 return {activeTopics:result.webhookSubscriptions.nodes.filter(s=>s.uri===priceWebhookUri).map(s=>s.topic),requestedFields:priceWebhookFields,destination:priceWebhookUri};
}});
// Undo only the exact checkout-price subscriptions at our own destination.
export const stopCheckoutPrices=internalAction({args:{},handler:async(ctx):Promise<{removed:number}>=>{
 const connection=await ctx.runQuery(internal.shopify.connection,{});
 if(!connection)throw Error('Open the Shopify app to connect first.');
 const result=await adminRead<{webhookSubscriptions:{nodes:{id:string;topic:string;uri:string;includeFields:string[]}[];pageInfo:{hasNextPage:boolean}}}>(connection.accessToken,checkoutSubscriptionsQuery);
 if(result.webhookSubscriptions.pageInfo.hasNextPage)throw Error('Incomplete subscription list.');
 const own=result.webhookSubscriptions.nodes.filter(s=>s.uri===priceWebhookUri&&s.includeFields.length===priceWebhookFields.length&&priceWebhookFields.every(f=>s.includeFields.includes(f)));
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
type NativeRecord={id:string;name?:string;checkoutToken?:string|null;currentTotalPriceSet?:{shopMoney:Money};totalPriceSet?:{shopMoney:Money};createdAt:string;completedAt?:string|null;currentSubtotalPriceSet?:{shopMoney:Money;presentmentMoney?:Money};subtotalPriceSet?:{shopMoney:Money};test?:boolean;cancelledAt?:string|null;displayFinancialStatus?:string};
async function pages(accessToken:string,query:string,field:'orders'|'abandonedCheckouts',filter:string):Promise<NativeRecord[]>{
  const rows:NativeRecord[]=[];let after:string|null=null;const cursors=new Set<string>();const ids=new Set<string>();
  for(let page=0;page<20;page++){
    const data:Record<string,{nodes:NativeRecord[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}>=await adminRead(accessToken,query,{after,filter});
    const batch=data[field];if(!batch || !Array.isArray(batch.nodes) || batch.nodes.length>100)throw Error('Unexpected Shopify records.');
    for(const row of batch.nodes){if(typeof row.id!=='string'||ids.has(row.id)||!Number.isFinite(Date.parse(row.createdAt)))throw Error('Invalid Shopify records.');ids.add(row.id);rows.push(row);}
    if(!batch.pageInfo.hasNextPage)return rows;
    after=batch.pageInfo.endCursor;if(!after||cursors.has(after))throw Error('Incomplete Shopify pagination.');cursors.add(after);
  }throw Error('Too many Shopify records. Previous results are retained.');
}
export async function syncStore(ctx:ActionCtx,idToken:string){
  return syncWithAccess(ctx,await authorizedAccess(ctx,idToken));
}
async function syncWithAccess(ctx:ActionCtx,access:string){
  const startedAt=Date.now();
  const identity=await adminRead<{shop:{myshopifyDomain:string;currencyCode:string;ianaTimezone:string};currentAppInstallation:{accessScopes:{handle:string}[]}}>(access,identityQuery);
  if(identity.shop.myshopifyDomain!==STORE || REQUIRED_SCOPES.some(s=>!identity.currentAppInstallation.accessScopes.some(x=>x.handle===s)))throw Error('Unexpected store or missing Shopify permissions.');
  const currency=identity.shop.currencyCode;if(currencyScale(currency)===null)throw Error('Store currency is not supported.');
  const timeZone=identity.shop.ianaTimezone;
  const periodStart=orderHistoryStart(startedAt,timeZone);
  const filter=`created_at:>=${periodStart}`;
  const [orders,abandoned]=await Promise.all([pages(access,ordersQuery,'orders',filter),pages(access,abandonedQuery,'abandonedCheckouts',filter)]);
  const storeMinor=(money:Money|undefined)=>money?.currencyCode===currency?moneyMinor(money.amount,currency):null;
  const safeOrders=await Promise.all(orders.map(async row=>({recordHash:await recordDigest('order',row.id),...(typeof row.checkoutToken==='string'&&row.checkoutToken.length&&typeof row.name==='string'&&row.name.length ? {sessionId:checkoutIdentity(row.checkoutToken),orderName:row.name,...(/^gid:\/\/shopify\/Order\/[1-9]\d*$/.test(row.id)?{orderId:row.id.split('/').at(-1)!}:{})} : {}),createdAt:row.createdAt,totalCents:storeMinor(row.currentTotalPriceSet?.shopMoney),subtotalCents:storeMinor(row.currentSubtotalPriceSet?.shopMoney),...(row.currentSubtotalPriceSet?.presentmentMoney&&storeMinor(row.currentSubtotalPriceSet.shopMoney)!==null&&moneyMinor(row.currentSubtotalPriceSet.presentmentMoney.amount,row.currentSubtotalPriceSet.presentmentMoney.currencyCode)!==null?{conversion:{shopMinor:storeMinor(row.currentSubtotalPriceSet.shopMoney)!,buyerMinor:moneyMinor(row.currentSubtotalPriceSet.presentmentMoney.amount,row.currentSubtotalPriceSet.presentmentMoney.currencyCode)!,buyerCurrency:row.currentSubtotalPriceSet.presentmentMoney.currencyCode}}:{}),test:row.test===true,paid:row.displayFinancialStatus==='PAID',cancelled:!!row.cancelledAt})));
  // Preserve verified historical identities. GraphQL has no checkout token on
  // AbandonedCheckout; future exact prices arrive through signed notifications.
  const previous=await ctx.runQuery(internal.shopify.snapshot,{});
  const safeAbandoned=await Promise.all(abandoned.map(async row=>{
    const recordHash=await recordDigest('abandoned-gql',row.id);
    const sessionId=savedCheckoutSession(recordHash,previous?.abandoned??[]);
    return {recordHash,...(sessionId?{sessionId}:{}),createdAt:row.createdAt,totalCents:storeMinor(row.totalPriceSet?.shopMoney),subtotalCents:storeMinor(row.subtotalPriceSet?.shopMoney),recovered:!!row.completedAt};
  }));
  await ctx.runMutation(internal.shopify.saveSnapshot,{timeZone,currency,syncedAt:startedAt,periodStart,orders:safeOrders,abandoned:safeAbandoned});
  return{store:STORE,syncedAt:startedAt,orders:safeOrders.length,abandoned:safeAbandoned.length};
}

// Convex runs this with the existing offline installation, never browser tokens.
export const syncAutomatically=internalAction({args:{},handler:async(ctx):Promise<{status:string}>=>{
 const saved=await ctx.runQuery(internal.shopify.connection,{});
 if(!saved||!REQUIRED_SCOPES.every(s=>saved.scopes.includes(s)))return {status:'disconnected'};
 let access=saved.accessToken;
 if(saved.expiresAt!==undefined&&saved.expiresAt<=Date.now()+60000){
  if(!saved.refreshToken||!saved.refreshExpiresAt||saved.refreshExpiresAt<=Date.now()+60000)return {status:'reconnect_required'};
  const issuedAt=Date.now();
  try{access=await storeSession(ctx,await refreshMerchant(saved.refreshToken),issuedAt);}
  catch{return {status:'reconnect_required'};}
 }
 try{await syncWithAccess(ctx,access);return {status:'synced'};}
 catch{throw Error('Automatic Shopify sync failed; previous figures retained.');}
}});

// Safe owner diagnostics: no credentials or order/customer fields returned.
export const automaticSyncStatus=internalQuery({args:{},handler:async(ctx)=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 const snapshot=await ctx.db.query('shopifySnapshots').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 return {connected:!!connection,accessExpiresAt:connection?.expiresAt??null,refreshAvailable:!!connection?.refreshToken,syncedAt:snapshot?.syncedAt??null,orderCount:snapshot?.orders.length??0};
}});
