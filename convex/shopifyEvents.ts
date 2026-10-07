import {internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {currencyScale} from '../shared/money';
import {eventFields,capturedItems} from './schema';
import {STORE,parseTestEvent} from '../shared/evidence';
export const pixelFields={...eventFields,items:v.optional(capturedItems),subtotalCents:v.optional(v.number()),currency:v.optional(v.literal('USD'))};
export const record=internalMutation({args:pixelFields,handler:async(ctx,args)=>{
  const {subtotalCents,currency,items,...event}=args;
  if(items&&(items.length>20||items.some(i=>!/^[a-f0-9]{64}$/.test(i.itemHash)||!Number.isSafeInteger(i.quantity)||i.quantity<1||!Number.isSafeInteger(i.minor)||i.minor<0||currencyScale(i.currency)===null)||new Set(items.map(i=>i.itemHash)).size!==items.length))return 'invalid';
  if(!parseTestEvent(event,Date.now())||(subtotalCents!==undefined&&(!Number.isSafeInteger(subtotalCents)||subtotalCents<0||currency!=='USD')))return 'invalid';
  if(await ctx.db.query('shopifyCheckoutEvents').withIndex('by_event',q=>q.eq('eventId',args.eventId)).unique())return 'duplicate';
  if((await ctx.db.query('shopifyCheckoutEvents').take(10001)).length>=10000)return 'full';
  await ctx.db.insert('shopifyCheckoutEvents',{...args,store:STORE,receivedAt:Date.now()});return 'recorded';
}});
export const read=internalQuery({args:{},handler:async ctx=>{
  const rows=await ctx.db.query('shopifyCheckoutEvents').withIndex('by_timestamp').order('desc').take(1001);
  return{events:rows.slice(0,1000).map(({eventId,sessionId,name,timestamp,category,shippingBlocker,subtotalCents,currency,items})=>({eventId,sessionId,name,timestamp,category,...(shippingBlocker===undefined?{}:{shippingBlocker}),...(items===undefined?{}:{items}),...(subtotalCents===undefined?{}:{subtotalCents,currency})})),truncated:rows.length>1000};
}});
