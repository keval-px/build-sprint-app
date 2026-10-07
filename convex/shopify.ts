import {internalMutation, internalQuery} from './_generated/server';
import {internal} from './_generated/api';
import type {ActionCtx} from './_generated/server';
import {v} from 'convex/values';
import {STORE} from '../shared/evidence';
import {checkoutIdentity} from '../shared/checkoutIdentity';
import {readCheckoutLinks,nativeCheckoutSession} from './lib/checkoutMatching';
import {moneyMinor,currencyScale} from '../shared/money';
import {usdCents, recordDigest} from '../shared/shopifyRecords';
import {exchangeMerchant, refreshMerchant, verifyMerchant, REQUIRED_SCOPES} from './lib/shopifyAuth';
import {identityQuery, abandonedQuery, ordersQuery} from './lib/shopifyQueries';
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
export const saveSnapshot = internalMutation({args:{currency:v.optional(v.string()),syncedAt:v.number(),periodStart:v.string(),orders:v.array(v.object({recordHash:v.string(),conversion:v.optional(v.object({shopMinor:v.number(),buyerMinor:v.number(),buyerCurrency:v.string()})),sessionId:v.optional(v.string()),orderName:v.optional(v.string()),orderId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),test:v.boolean(),paid:v.boolean(),cancelled:v.boolean()})),abandoned:v.array(v.object({recordHash:v.string(),sessionId:v.optional(v.string()),totalCents:v.optional(v.union(v.number(),v.null())),createdAt:v.string(),subtotalCents:v.union(v.number(),v.null()),recovered:v.boolean()}))},handler:async(ctx,args)=>{
  const state=await ctx.db.query('shopifyInstallState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(state && args.syncedAt <= state.revokedAt)throw Error('Shopify installation changed. Reopen the app.');
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
  const startedAt=Date.now(), access=await authorizedAccess(ctx,idToken);
  const identity=await adminRead<{shop:{myshopifyDomain:string;currencyCode:string};currentAppInstallation:{accessScopes:{handle:string}[]}}>(access,identityQuery);
  if(identity.shop.myshopifyDomain!==STORE || REQUIRED_SCOPES.some(s=>!identity.currentAppInstallation.accessScopes.some(x=>x.handle===s)))throw Error('Unexpected store or missing Shopify permissions.');
  const currency=identity.shop.currencyCode;if(currencyScale(currency)===null)throw Error('Store currency is not supported.');
  const periodStart=new Date(startedAt-30*86400000).toISOString();
  const filter=`created_at:>=${periodStart}`;
  const [orders,abandoned]=await Promise.all([pages(access,ordersQuery,'orders',filter),pages(access,abandonedQuery,'abandonedCheckouts',filter)]);
  const storeMinor=(money:Money|undefined)=>money?.currencyCode===currency?moneyMinor(money.amount,currency):null;
  const safeOrders=await Promise.all(orders.map(async row=>({recordHash:await recordDigest('order',row.id),...(typeof row.checkoutToken==='string'&&row.checkoutToken.length&&typeof row.name==='string'&&row.name.length ? {sessionId:checkoutIdentity(row.checkoutToken),orderName:row.name,...(/^gid:\/\/shopify\/Order\/[1-9]\d*$/.test(row.id)?{orderId:row.id.split('/').at(-1)!}:{})} : {}),createdAt:row.createdAt,totalCents:storeMinor(row.currentTotalPriceSet?.shopMoney),subtotalCents:storeMinor(row.currentSubtotalPriceSet?.shopMoney),...(row.currentSubtotalPriceSet?.presentmentMoney&&storeMinor(row.currentSubtotalPriceSet.shopMoney)!==null&&moneyMinor(row.currentSubtotalPriceSet.presentmentMoney.amount,row.currentSubtotalPriceSet.presentmentMoney.currencyCode)!==null?{conversion:{shopMinor:storeMinor(row.currentSubtotalPriceSet.shopMoney)!,buyerMinor:moneyMinor(row.currentSubtotalPriceSet.presentmentMoney.amount,row.currentSubtotalPriceSet.presentmentMoney.currencyCode)!,buyerCurrency:row.currentSubtotalPriceSet.presentmentMoney.currencyCode}}:{}),test:row.test===true,paid:row.displayFinancialStatus==='PAID',cancelled:!!row.cancelledAt})));
  // This fixed development store already uses the legacy compatibility reader.
  // It supplies the original token missing from GraphQL, never recovery URL guesses.
  const checkoutLinks=currency==='USD'?await readCheckoutLinks(access):[];
  const safeAbandoned=await Promise.all(abandoned.map(async row=>{
    const sessionId=await nativeCheckoutSession(row.id,checkoutLinks);
    return {recordHash:await recordDigest('abandoned-gql',row.id),...(sessionId?{sessionId}:{}),createdAt:row.createdAt,totalCents:storeMinor(row.totalPriceSet?.shopMoney),subtotalCents:storeMinor(row.subtotalPriceSet?.shopMoney),recovered:!!row.completedAt};
  }));
  await ctx.runMutation(internal.shopify.saveSnapshot,{currency,syncedAt:startedAt,periodStart,orders:safeOrders,abandoned:safeAbandoned});
  return{store:STORE,syncedAt:startedAt,orders:safeOrders.length,abandoned:safeAbandoned.length};
}
