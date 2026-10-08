import {summarize,type CheckoutEvent,type ErrorCategory} from './evidence.ts';
import {checkoutCohort} from './dateRange.ts';

const categories:ErrorCategory[]=['payment','delivery','inventory','discount','validation'];
export const issueLabels:Record<string,string>={extension:'Checkout app failed',payment:'Payment alerts',delivery:'Shipping alerts',inventory:'Item availability',discount:'Discount or gift-card',validation:'Form errors',shipping_blocker:'Shipping unavailable'};
const ordered=(events:CheckoutEvent[])=>summarize(events).journeys.flatMap(j=>j.events).sort((a,b)=>a.timestamp-b.timestamp);
export function lastObservedStep(events:CheckoutEvent[]) {
 const rows=ordered(events);const completed=rows.find(e=>e.name==='checkout_completed');
 if(completed)return 'Completed';
 const labels:Partial<Record<CheckoutEvent['name'],string>>={checkout_started:'Started',checkout_contact_info_submitted:'Contact',checkout_address_info_submitted:'Address',checkout_shipping_info_submitted:'Shipping',payment_info_submitted:'Payment'};
 return labels[rows.filter(e=>labels[e.name]).at(-1)?.name??'alert_displayed']??'Not observed';
}
export interface StepTiming {step:string;seconds:number|null;note:string}
export function stepTimings(events:CheckoutEvent[]):StepTiming[] {
 const rows=ordered(events),start=rows.find(e=>e.name==='checkout_started');
 if(!start)return ['Contact','Shipping','Payment'].map(step=>({step,seconds:null,note:'Start not observed'}));
 const complete=rows.find(e=>e.name==='checkout_completed'&&e.timestamp>=start.timestamp);
 const end=complete?.timestamp??rows.at(-1)!.timestamp;
 const milestone=(name:CheckoutEvent['name'],after:number)=>rows.find(e=>e.name===name&&e.timestamp>=after&&e.timestamp<=end)?.timestamp;
 const contact=milestone('checkout_contact_info_submitted',start.timestamp);
 const shipping=milestone('checkout_shipping_info_submitted',contact??start.timestamp);
 const span=(step:string,from:number|undefined,to:number|undefined,laterObserved:boolean):StepTiming=>{
  if(from===undefined)return {step,seconds:null,note:laterObserved?'Transition not observed':'Not reached in recorded events'};
  if(to!==undefined)return {step,seconds:Math.floor((to-from)/1000),note:'Between first recorded submissions'};
  if(laterObserved)return {step,seconds:null,note:'Transition not observed'};
  return {step,seconds:Math.max(0,Math.floor((end-from)/1000)),note:'Observed until last event'};
 };
 const paymentObserved=rows.some(e=>e.name==='payment_info_submitted'&&e.timestamp>=start.timestamp&&e.timestamp<=end);
 const payment=!complete&&!paymentObserved?{step:'Payment',seconds:null,note:'Payment activity not observed'}:span('Payment',shipping,complete?.timestamp,false);
 return [span('Contact',start.timestamp,contact,shipping!==undefined||!!complete),span('Shipping',contact,shipping,!!complete),payment];
}
export function durationText(seconds:number|null){return seconds===null?'Unknown':`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
// The preceding submission is context, not proof of the field or root cause.
// Strictly earlier timestamps avoid inventing ordering for simultaneous events.
export function recordedFindings(events:CheckoutEvent[]) {
 const groups=new Map<string,{key:string;category:string;label:string;step:string;alerts:CheckoutEvent[];sessionIds:string[];repeatedCheckouts:number;completedAfter:number;lastSeen:number}>();
 const stepNames:Partial<Record<CheckoutEvent['name'],string>>={checkout_started:'Checkout started',checkout_contact_info_submitted:'Contact submitted',checkout_address_info_submitted:'Address submitted',checkout_shipping_info_submitted:'Shipping submitted',payment_info_submitted:'Payment submitted',checkout_completed:'Checkout completed'};
 const journeys=summarize(events).journeys;
 for(const journey of journeys)for(const alert of journey.events){
  if(!alert.category)continue;
  const category=alert.shippingBlocker?'shipping_blocker':alert.category;
  const before=journey.events.filter(e=>stepNames[e.name]&&e.timestamp<alert.timestamp);
  const latest=before.at(-1)?.timestamp;
  const tied=[...new Set(before.filter(e=>e.timestamp===latest).map(e=>e.name))].sort();
  const step=tied.join('+')||'unknown';
  const stepLabel=tied.length>1?`${tied.map(name=>stepNames[name]).join(' / ')} (same time)`:stepNames[tied[0]]??'Earlier step not recorded';
  const key=`${category}:${step}`;
  const group=groups.get(key)??{key,category,label:issueLabels[category],step:stepLabel,alerts:[],sessionIds:[],repeatedCheckouts:0,completedAfter:0,lastSeen:0};
  group.alerts.push(alert);groups.set(key,group);
 }
 return [...groups.values()].map(group=>{
  const ids=[...new Set(group.alerts.map(e=>e.sessionId))];
  return {...group,sessionIds:ids,repeatedCheckouts:ids.filter(id=>group.alerts.filter(e=>e.sessionId===id).length>1).length,
   completedAfter:ids.filter(id=>{const last=Math.max(...group.alerts.filter(e=>e.sessionId===id).map(e=>e.timestamp));return journeys.find(j=>j.id===id)!.events.some(e=>e.name==='checkout_completed'&&e.timestamp>last);}).length,
   lastSeen:Math.max(...group.alerts.map(e=>e.timestamp))};
 }).sort((a,b)=>b.sessionIds.length-a.sessionIds.length||b.lastSeen-a.lastSeen);
}
export interface FocusedAlert {key:string;category:string;title:string;message:string;count:number;at:number;tone:'critical'|'warning'}
export function focusedAlerts(events:CheckoutEvent[],now:number,truncated=false,boundaries:Partial<Record<string,number>>={}):FocusedAlert[]{
 const hour=3600000,rows=ordered(events),recent=rows.filter(e=>e.timestamp>=now-hour&&e.timestamp<=now);
 const bucket=Math.floor(now/hour),result:FocusedAlert[]=[];
 const blockers=recent.filter(e=>e.shippingBlocker==='no_shipping_available'&&e.timestamp>(boundaries.delivery??0));
 const blockedIds=[...new Set(blockers.map(e=>e.sessionId))].filter(id=>{const last=Math.max(...blockers.filter(e=>e.sessionId===id).map(e=>e.timestamp));return !rows.some(e=>e.sessionId===id&&e.name==='checkout_completed'&&e.timestamp>last);});
 if(blockedIds.length>=2)result.push({key:`shipping_blocker:${bucket}`,category:'shipping_blocker',title:'Shipping unavailable recorded',message:`${blockedIds.length} distinct checkouts showed shipping unavailable in the last hour without a later purchase. Check basket and destination eligibility.`,count:blockedIds.length,at:Math.max(...blockers.map(e=>e.timestamp)),tone:'critical'});
 if(truncated||!rows.length||rows[0].timestamp>now-8*hour)return result;
 const cohorts=(start:number,end:number)=>summarize(checkoutCohort(rows,{start,end})).journeys;
 const current=cohorts(now-hour,now+1),baseline=cohorts(now-8*hour,now-hour);
 if(current.length<10||baseline.length<20)return result;
 for(const category of categories){
  const currentIds=current.filter(j=>j.events.some(e=>e.category===category&&e.timestamp>=now-hour&&e.timestamp<=now&&e.timestamp>(boundaries[category]??0)));
  const oldIds=baseline.filter(j=>j.events.some(e=>e.category===category&&e.timestamp<now-hour));
  const rate=currentIds.length/current.length,oldRate=oldIds.length/baseline.length;
  if(currentIds.length>=5&&rate>=2*oldRate&&rate-oldRate>=0.1){
   const at=Math.max(...recent.filter(e=>e.category===category).map(e=>e.timestamp));
   result.push({key:`${category}:${bucket}`,category,title:`${issueLabels[category]} increased`,message:`${currentIds.length} of ${current.length} new checkouts had these alerts in the last hour, compared with ${oldIds.length} of ${baseline.length} in the previous seven hours. This does not establish the cause.`,count:currentIds.length,at,tone:'warning'});
  }
 }
 return result;
}
