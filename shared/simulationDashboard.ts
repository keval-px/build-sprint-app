import {summarize,type CheckoutEvent} from './evidence.ts';
import {journeyPrice} from './journeyPrice.ts';
import type {EvidenceResponse} from './evidenceResponse.ts';
export function simulationRecords(events:CheckoutEvent[],asOf:number,data?:EvidenceResponse){
 const journeys=summarize(events,{asOf,orders:data?.shopifySnapshot?.orders,prices:data?.checkoutPrices}).journeys.filter(j=>j.started);
 const rows=journeys.map(j=>{
  const start=Math.min(...j.events.filter(e=>e.name==='checkout_started').map(e=>e.timestamp));
  const price=journeyPrice(j.id,j.completed,j.events,'USD',data?.shopifySnapshot?.orders??[],data?.shopifySnapshot?.abandoned??[],(data?.abandonedCheckouts?.records??[]).flatMap(r=>r.sessionId?[{...r,sessionId:r.sessionId}]:[]),data?.checkoutPrices??[])??null;
  return {recordHash:j.id,sessionId:j.id,createdAt:new Date(start).toISOString(),subtotalCents:price,totalCents:price,recovered:j.completed};
 });
 // For chart aggregation only: these are recorded completions, never server facts.
 const orders=journeys.filter(j=>j.completed).map(j=>({recordHash:j.id,createdAt:new Date(j.outcome.completedAt!).toISOString(),paid:true,cancelled:false,test:true}));
 return {orders,abandoned:rows.filter(r=>!r.recovered),start:rows.length?Math.min(...rows.map(r=>Date.parse(r.createdAt))):asOf};
}
export function simulationBasketCents(sessionId:string){return 1500+(parseInt(sessionId.slice(0,8),16)%36)*500;}
