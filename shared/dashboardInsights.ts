import {summarize,type CheckoutEvent,type ErrorCategory} from './evidence.ts';
import {checkoutCohort,dateBounds,localDate} from './dateRange.ts';

const categories:ErrorCategory[]=['payment','delivery','inventory','discount','validation'];
export const issueLabels:Record<string,string>={payment:'Payment alerts',delivery:'Shipping alerts',inventory:'Item availability',discount:'Discount or gift-card',validation:'Form errors',shipping_blocker:'Shipping unavailable'};
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
export function errorDiagnostics(events:CheckoutEvent[]) {
 const rows=ordered(events),sessions=summarize(rows).journeys;
 return [...categories,'shipping_blocker' as const].flatMap(category=>{
  const alerts=rows.filter(e=>e.name==='alert_displayed'&&(category==='shipping_blocker'?e.shippingBlocker==='no_shipping_available':e.category===category));
  if(!alerts.length)return [];
  const ids=[...new Set(alerts.map(e=>e.sessionId))];
  const completedAfter=ids.filter(id=>{const last=Math.max(...alerts.filter(e=>e.sessionId===id).map(e=>e.timestamp));return sessions.find(j=>j.id===id)?.events.some(e=>e.name==='checkout_completed'&&e.timestamp>last);}).length;
  return [{category,label:issueLabels[category],count:ids.length,alerts:alerts.length,firstSeen:alerts[0].timestamp,lastSeen:alerts.at(-1)!.timestamp,completedAfter}];
 }).sort((a,b)=>b.count-a.count||b.lastSeen-a.lastSeen);
}
// The preceding submission is context, not proof of the field or root cause.
// Strictly earlier timestamps avoid inventing ordering for simultaneous events.
export function recordedFindings(events:CheckoutEvent[]) {
 const groups=new Map<string,{key:string;category:string;label:string;step:string;alerts:CheckoutEvent[];sessionIds:string[];repeatedCheckouts:number;completedAfter:number;lastSeen:number}>();
 const stepNames:Partial<Record<CheckoutEvent['name'],string>>={checkout_started:'Checkout started',checkout_contact_info_submitted:'Contact submitted',checkout_address_info_submitted:'Address submitted',checkout_shipping_info_submitted:'Shipping submitted',payment_info_submitted:'Payment submitted',checkout_completed:'Checkout completed'};
 const journeys=summarize(events).journeys;
 for(const journey of journeys)for(const alert of journey.events){
  if(alert.name!=='alert_displayed'||!alert.category)continue;
  const category=alert.shippingBlocker?'shipping_blocker':alert.category;
  const before=journey.events.filter(e=>stepNames[e.name]&&e.timestamp<alert.timestamp);
  const step=before.at(-1)?.name??'unknown';
  const key=`${category}:${step}`;
  const group=groups.get(key)??{key,category,label:issueLabels[category],step:stepNames[step as CheckoutEvent['name']]??'Earlier step not recorded',alerts:[],sessionIds:[],repeatedCheckouts:0,completedAfter:0,lastSeen:0};
  group.alerts.push(alert);groups.set(key,group);
 }
 return [...groups.values()].map(group=>{
  const ids=[...new Set(group.alerts.map(e=>e.sessionId))];
  return {...group,sessionIds:ids,repeatedCheckouts:ids.filter(id=>group.alerts.filter(e=>e.sessionId===id).length>1).length,
   completedAfter:ids.filter(id=>{const last=Math.max(...group.alerts.filter(e=>e.sessionId===id).map(e=>e.timestamp));return journeys.find(j=>j.id===id)!.events.some(e=>e.name==='checkout_completed'&&e.timestamp>last);}).length,
   lastSeen:Math.max(...group.alerts.map(e=>e.timestamp))};
 }).sort((a,b)=>b.sessionIds.length-a.sessionIds.length||b.lastSeen-a.lastSeen);
}
export function previousRange(range:string){
 const [first,last]=range.split('--'),days=(Date.parse(last)-Date.parse(first))/86400000+1;
 dateBounds(range);
 const start=new Date(`${first}T12:00:00`),end=new Date(start);start.setDate(start.getDate()-days);end.setDate(end.getDate()-1);
 return `${localDate(start)}--${localDate(end)}`;
}
export function periodComparison(events:CheckoutEvent[],range:string,truncated=false,now=Date.now()){
 const previous=previousRange(range),bounds=dateBounds(previous),currentBounds=dateBounds(range);
 const earliest=events.length?Math.min(...events.map(e=>e.timestamp)):Infinity;
 const metric=(selected:string)=>{
  const journeys=summarize(checkoutCohort(events,selected)).journeys;
  const total=journeys.length,completed=journeys.filter(j=>j.completed).length,withAlerts=journeys.filter(j=>j.events.some(e=>e.name==='alert_displayed'&&e.category)).length;
  return {total,completed,withAlerts,completionRate:total?completed/total:null,alertRate:total?withAlerts/total:null};
 };
 return {previous,current:metric(range),baseline:metric(previous),available:!truncated&&earliest<=bounds.start&&currentBounds.start<now,partialCurrent:currentBounds.end>now};
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
