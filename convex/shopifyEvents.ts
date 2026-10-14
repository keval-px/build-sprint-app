import {regroup} from './checkoutGroups';
import {collectionReceipt} from '../shared/monitoringHealth';
import {promisedDiscount} from '../shared/discountOffer';
import {appDisplayName,appIdentityHashes} from '../shared/extensionApp';
import {internalMutation} from './_generated/server';
import {v} from 'convex/values';
import {currencyScale} from '../shared/money';
import {eventFields,capturedItems} from './schema';
import {STORE,parseTestEvent} from '../shared/evidence';
export const pixelFields={...eventFields,appliedDiscountCount:v.optional(v.number()),items:v.optional(capturedItems),subtotalCents:v.optional(v.number()),currency:v.optional(v.literal('USD'))};
export const record=internalMutation({args:pixelFields,handler:async(ctx,args)=>{
  const {subtotalCents,currency,items,appliedDiscountCount,...event}=args;
  if(items&&(items.length>20||items.some(i=>!/^[a-f0-9]{64}$/.test(i.itemHash)||!Number.isSafeInteger(i.quantity)||i.quantity<1||!Number.isSafeInteger(i.minor)||i.minor<0||currencyScale(i.currency)===null)||new Set(items.map(i=>i.itemHash)).size!==items.length))return 'invalid';
  if(!parseTestEvent(event,Date.now())||(subtotalCents!==undefined&&(!Number.isSafeInteger(subtotalCents)||subtotalCents<0||currency!=='USD')))return 'invalid';
  if(await ctx.db.query('shopifyCheckoutEvents').withIndex('by_event',q=>q.eq('eventId',args.eventId)).unique())return 'duplicate';
  const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  if(!connection)return 'unavailable';
  const state=await ctx.db.query('pixelCollectionState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
  const count=state?.eventCount??0;
  if(appliedDiscountCount!==undefined&&(!Number.isSafeInteger(appliedDiscountCount)||appliedDiscountCount<0||appliedDiscountCount>20))return 'invalid';
  const offer=event.discountCodeHash?await ctx.db.query('promisedDiscountOffers').withIndex('by_code',q=>q.eq('codeHash',event.discountCodeHash!)).unique():null;
  const code=promisedDiscount(offer??undefined,event.timestamp,subtotalCents,currency,appliedDiscountCount);
  const {appliedDiscountCount:discard,...safe}=args;
  await ctx.db.insert('shopifyCheckoutEvents',{...safe,...(code?{discountOfferCode:code}:{}),store:STORE,receivedAt:Date.now()});
  await regroup(ctx,'pixel',[event.sessionId]);
  if(state)await ctx.db.patch(state._id,{eventCount:count+1,...(state.lastCapAt&&!state.resumedAt?{resumedAt:Date.now()}:{}),...collectionReceipt(state,Date.now(),connection.connectedAt)});
  else await ctx.db.insert('pixelCollectionState',{store:STORE,eventCount:count+1,lastReceivedAt:Date.now(),firstReceivedAt:Date.now()});
  return 'recorded';
}});
// Resolve historical name-less events only by the installed app's exact identity.
// Never assign this app's name to another app's failures.
export const labelInstalledApp=internalMutation({args:{appId:v.string(),name:v.string()},handler:async(ctx,args)=>{
 const name=appDisplayName(args.name),hashes=appIdentityHashes(args.appId);
 if(!name||!hashes.length)return;
 const rows=await ctx.db.query('shopifyCheckoutEvents').withIndex('by_timestamp').order('desc').take(1000);
 const changed=new Set<string>();
 for(const row of rows)if(row.name==='ui_extension_errored'&&!row.extensionAppName&&row.extensionAppHash&&hashes.includes(row.extensionAppHash)){await ctx.db.patch(row._id,{extensionAppName:name});changed.add(row.sessionId);}
 await regroup(ctx,'pixel',changed);
}});

export const configured=internalMutation({args:{},handler:async ctx=>{
 const connection=await ctx.db.query('shopifyConnections').withIndex('by_store',q=>q.eq('store',STORE)).unique();if(!connection)return;
 const state=await ctx.db.query('pixelCollectionState').withIndex('by_store',q=>q.eq('store',STORE)).unique();
 if(state)await ctx.db.patch(state._id,{configuredAt:Date.now()});else await ctx.db.insert('pixelCollectionState',{store:STORE,eventCount:0,configuredAt:Date.now()});
}});
