import {summarize,type CheckoutEvent} from './evidence.ts';
import type {OutcomeFacts} from './checkoutOutcome.ts';
export const funnelFilters=['all','mobile','desktop','express'] as const;
export type FunnelFilter=typeof funnelFilters[number];
export const funnelLabels={all:'All checkouts',mobile:'Mobile',desktop:'Desktop',express:'Express pay'};
type Journey=ReturnType<typeof summarize>['journeys'][number];
export function checkoutFunnel(events:CheckoutEvent[],facts:OutcomeFacts={},filter:FunnelFilter='all'){
 return journeyFunnel(summarize(events,facts).journeys,filter);
}
// Same model from journeys already summarised, so several segments share one pass.
export function journeyFunnel(journeys:Journey[],filter:FunnelFilter='all'){
 const all=journeys.filter(j=>j.started);
 const category=(rows:CheckoutEvent[])=>{
  const devices=new Set(rows.map(e=>e.deviceClass).filter(Boolean));
  return devices.size===1?[...devices][0]:undefined;
 };
 const sessions=all.filter(j=>filter==='all'||(filter==='express'?j.events.some(e=>e.expressPay===true):category(j.events)===filter));
 const steps=[
  {label:'Checkout started',event:'checkout_started'},
  {label:'Contact submitted',event:'checkout_contact_info_submitted'},
  {label:'Shipping selected',event:'checkout_shipping_info_submitted'},
  {label:'Payment submitted',event:'payment_info_submitted'},
  {label:'Order placed',event:'checkout_completed'},
 ];
 const stages=steps.map((step,index)=>({label:step.label,ids:sessions.filter(j=>index===4?j.completed:j.events.some(e=>e.name===step.event)).map(j=>j.id)}));
 const rows=stages.map((stage,index)=>{
  const previous=stages[index-1];
  // Compare observed counts, including skipped stages; this is not a causal loss rate.
  const drop=previous?.ids.length?Math.round((previous.ids.length-stage.ids.length)/previous.ids.length*100):null;
  return {...stage,count:stage.ids.length,percent:sessions.length?stage.ids.length/sessions.length*100:0,drop};
 });
 return {rows,count:sessions.length,total:all.length,unknownDevice:all.filter(j=>!category(j.events)).length,completed:stages[4].ids.length};
}
// What each segment covers, including the limits of the device and wallet signals.
export function funnelScope(model:{count:number;total:number;unknownDevice:number},filter:FunnelFilter){
 const share=`${model.count.toLocaleString()} of ${model.total.toLocaleString()} started checkouts`;
 if(filter==='all')return `${model.total.toLocaleString()} started checkouts. Each stage counts checkouts with that step recorded; a skipped step isn’t counted as a drop-off.`;
 if(filter==='express')return `${share} used express pay. Express pay details may arrive only when the order is placed, so earlier stages can be undercounted.`;
 return `${share} on ${filter}. Tablets and ${model.unknownDevice.toLocaleString()} checkouts with an unknown device are excluded.`;
}
