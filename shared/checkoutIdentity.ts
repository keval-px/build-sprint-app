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
