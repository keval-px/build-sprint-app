import {sha256} from 'js-sha256';
import type {CheckoutEvent} from './evidence.ts';
// Pure JavaScript SHA-256: no crypto/TextEncoder globals required by the pixel sandbox.
export function checkoutIdentity(raw:string){return sha256(`build-sprint-demo.myshopify.com:${raw}`);}
export function mergeCheckoutEvents(legacy:CheckoutEvent[],pixel:CheckoutEvent[]){
  // The app pixel has the same event identity plus optional price evidence.
  return [...new Map([...legacy,...pixel].map(event=>[event.eventId,event])).values()];
}
export function canReadShopifyEvidence(connection:{scopes:string[]}|null){
  return !!connection&&connection.scopes.includes('read_orders')&&connection.scopes.includes('read_customer_events');
}

export function publicCheckoutEvents(legacy:CheckoutEvent[],pixel:CheckoutEvent[]){
 const observed=new Map(pixel.map(event=>[event.eventId,event]));
 const corrected=legacy.map(event=>{
  const current=observed.get(event.eventId);
  if(!current||current.sessionId!==event.sessionId)return event;
  const {shippingBlocker:previous,...base}=event;
  return {...base,category:current.category,...(current.discountOfferCode?{discountOfferCode:current.discountOfferCode}:{}),...(current.shippingBlocker?{shippingBlocker:current.shippingBlocker}:{})};
 });
 // New anonymous app-failure events can join only a checkout already public.
 const publicIds=new Set(legacy.map(event=>event.sessionId));
 const eventIds=new Set(corrected.map(event=>event.eventId));
 return [...corrected,...pixel.filter(event=>event.name==='ui_extension_errored'&&publicIds.has(event.sessionId)&&!eventIds.has(event.eventId)).map(({eventId,sessionId,name,timestamp,category,extensionAppHash,extensionAppName})=>({eventId,sessionId,name,timestamp,category,extensionAppHash,...(extensionAppName?{extensionAppName}:{})}))];
}
