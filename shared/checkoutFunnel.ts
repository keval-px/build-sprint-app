import {summarize,type CheckoutEvent} from './evidence.ts';
import type {OutcomeFacts} from './checkoutOutcome.ts';
export const funnelFilters=['all','mobile','desktop','express'] as const;
export type FunnelFilter=typeof funnelFilters[number];
export const funnelLabels={all:'All sessions',mobile:'Mobile',desktop:'Desktop',express:'Express pay'};
export function checkoutFunnel(events:CheckoutEvent[],facts:OutcomeFacts={},filter:FunnelFilter='all'){
 const all=summarize(events,facts).journeys.filter(j=>j.started);
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
