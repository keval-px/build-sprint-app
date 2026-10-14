import {summarize,type CheckoutEvent} from './evidence.ts';
import {checkoutOutcome,type OutcomeFacts} from './checkoutOutcome.ts';
export type TrendId='completion-drop'|'device-gap'|'shipping-drop';
export interface CheckoutTrend {id:TrendId;title:string;state:'collecting'|'review'|'stable';waitingFor?:'tracking'|'sample';detail:string;next:string;sessionIds:string[];current:{count:number;total:number};comparison:{count:number;total:number}}
const HOUR=3600000,MIN=20;
export function checkoutTrends(events:CheckoutEvent[],facts:OutcomeFacts,range:{start:number;end:number},healthy:boolean,now=Date.now()):CheckoutTrend[]{
 const asOf=Math.min(now,facts.asOf??now),end=Math.min(range.end,asOf-HOUR),middle=range.start+(end-range.start)/2;
 const sessions=summarize(events,{...facts,asOf}).journeys.filter(j=>j.started).map(j=>{
  const start=Math.min(...j.events.filter(e=>e.name==='checkout_started').map(e=>e.timestamp));
  const rows=j.events.filter(e=>e.timestamp>=start&&e.timestamp<=start+HOUR);
  const completed=checkoutOutcome(j.id,rows,{...facts,asOf:start+HOUR}).completed;
  const devices=new Set(rows.map(e=>e.deviceClass).filter(Boolean));
  const shipping=rows.some(e=>e.name==='checkout_shipping_info_submitted');
  const payment=rows.some(e=>e.name==='payment_info_submitted');
  return {id:j.id,start,completed,shipping,stopped:shipping&&!payment&&!completed,device:devices.size===1?[...devices][0]:undefined};
 }).filter(j=>j.start>=range.start&&j.start<end);
 const previous=sessions.filter(j=>j.start<middle),current=sessions.filter(j=>j.start>=middle);
 const mobile=sessions.filter(j=>j.device==='mobile'),desktop=sessions.filter(j=>j.device==='desktop');
 const counts=(rows:typeof sessions,shipping=false)=>({count:rows.filter(j=>shipping?j.stopped:j.completed).length,total:rows.length});
 const pct=(c:{count:number;total:number})=>c.total?Math.round(c.count/c.total*100):0;
 const format=(c:{count:number;total:number})=>`${c.count} of ${c.total}${c.total?` (${pct(c)}%)`:''}`;
 const build=(id:TrendId,title:string,a:typeof sessions,b:typeof sessions,shipping:boolean,next:string):CheckoutTrend=>{
  const x=counts(a,shipping),y=counts(b,shipping);
  const ready=healthy&&end>range.start&&a.length>=MIN&&b.length>=MIN;
  const difference=a.length&&b.length?(shipping?x.count/x.total-y.count/y.total:y.count/y.total-x.count/x.total):0;
  const gap=id==='device-gap'?Math.abs(difference):difference;
  const state=!ready?'collecting':gap>=0.1?'review':'stable';
  const affected=id==='device-gap'&&difference<0?b:a;
  const detail=id==='device-gap'?`Completed within one hour: Mobile ${format(x)}; Desktop ${format(y)}. Unknown devices and tablets are excluded.`:
   `${shipping?'No payment or completion within one hour after starting checkout, with shipping selected':'Completed within one hour'}: recent half ${format(x)}; earlier half ${format(y)}.`;
  return {id,title,state,...(state==='collecting'?{waitingFor:!healthy?'tracking' as const:'sample' as const}:{}),current:x,comparison:y,detail:`${detail} ${!healthy?'Waiting for current, complete tracking data.':!ready?'At least 20 checkouts in each group are needed.':state==='review'?`${Math.round(gap*100)} percentage points apart; investigate before assuming a cause.`:'No difference of 10 percentage points or more was found in the direction checked.'}`,next,
   sessionIds:state==='review'?affected.filter(j=>shipping?j.stopped:!j.completed).map(j=>j.id):[]};
 };
 return [build('completion-drop','Checkout completion rate',current,previous,false,'Open the checkouts below and look for shared payment or shipping errors. Check whether traffic sources changed before changing your store.'),
  build('device-gap','Mobile vs desktop',mobile,desktop,false,'Try the same checkout on mobile and desktop. Compare payment options and shipping steps; a difference alone does not prove a device problem.'),
  build('shipping-drop','Activity after shipping',current.filter(j=>j.shipping),previous.filter(j=>j.shipping),true,'Retry one of these baskets with the same destination. Check available shipping methods, prices and delivery estimates. Missing activity alone does not prove a shipping problem.')];
}
