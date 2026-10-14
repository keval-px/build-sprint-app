import {createHash} from 'node:crypto';
import {parseTestEvent, summarize, type CheckoutEvent} from '../../shared/evidence.ts';
import {checkoutTrends} from '../../shared/checkoutTrends.ts';
export const HOUR=3600000;
export const START=Date.UTC(2026,9,1);
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function simulate(seed=42, options:{start?:number;firstHour?:number;hours?:number}={}){
 const base=options.start??START,first=options.firstHour??0,length=options.hours??24;
 // Hash adjacent hourly seeds so their first random draws are not nearly identical.
 let state=createHash('sha256').update(`checkout-traffic:${seed}`).digest().readUInt32LE(0);
 const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const events:CheckoutEvent[]=[];
 const hours=[];
 for(let hour=first;hour<first+length;hour++){
  const phase=hour<6?'Normal activity':hour<12?'Shipping drop-offs':hour<18?'Mobile issues':'Recovery';
  const count=90+Math.floor(random()*31);
  const completionRate=hour>=6&&hour<12?.09+random()*.05:hour>=12&&hour<18?.33+random()*.04:.27+random()*.08;
  const mobileCompletionRate=.05+random()*.03;
  let completed=0,shippingExits=0;
  const shuffled=Array.from({length:count},(_,i)=>i);
  for(let i=count-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const errors=new Map(shuffled.slice(0,Math.round(count*.30)).map((id,i)=>[id,i%6]));
  // Spread outcomes throughout the hour while keeping healthy device groups comparable.
  const outcomeRanks=Array.from({length:Math.ceil(count/2)},(_,i)=>i);
  for(let i=outcomeRanks.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[outcomeRanks[i],outcomeRanks[j]]=[outcomeRanks[j],outcomeRanks[i]];}
  for(let i=0;i<count;i++){
   const sessionId=hash(`${seed}:${hour}:${i}`),deviceClass=i%2?'mobile':'desktop';
   const start=base+(hour-first)*HOUR+Math.floor((i+random())/count*HOUR);
   const bucket=(outcomeRanks[Math.floor(i/2)]+.5)/outcomeRanks.length;
   const shippingProblem=hour>=6&&hour<12;
   const mobileProblem=hour>=12&&hour<18&&deviceClass==='mobile';
   const success=bucket<(mobileProblem?mobileCompletionRate:completionRate);
   const shippingExit=!success&&(shippingProblem?bucket<.85:bucket>=.55&&bucket<.80);
   const paymentExit=!success&&!shippingExit&&bucket>=.80;
   let at=start;
   const add=(name:CheckoutEvent['name'],extra:Partial<CheckoutEvent>={})=>{
    const row:CheckoutEvent={sessionId,eventId:hash(`${sessionId}:${name}`),name,timestamp:at,category:null,deviceClass,...(i%5===0?{expressPay:true as const}:{}),...extra};
    const parsed=parseTestEvent(row,at);
    if(!parsed)throw Error('Generated event failed the app event validator');
    events.push(parsed);
    // Re-delivery of the same event, as can happen in tracking.
    if(i%17===0)events.push({...parsed});
    at+=(30+Math.floor(random()*150))*1000;
   };
   const error=errors.get(i);
   const alert=(category:CheckoutEvent['category'],extra:Partial<CheckoutEvent>={})=>add('alert_displayed',{category,...extra});
   add('checkout_started');
   if(error===4)alert('inventory');
   if(error===2)alert('validation');
   const contact=success||shippingExit||paymentExit||error!==undefined||bucket>.40;
   if(contact)add('checkout_contact_info_submitted');
   if(error===3)alert('discount',{discountCodeHash:hash('TEST-SAVE10')});
   const earlyStop=!success&&(error===2||error===3||error===4);
   const shipping= !earlyStop&&(success||shippingExit||paymentExit||error===0||error===1||error===5);
   if(shipping)add('checkout_address_info_submitted');
   if(error===1)alert('delivery',{shippingBlocker:'no_shipping_available'});
   const blocked=error===1&&!success;
   if(shipping&&!blocked)add('checkout_shipping_info_submitted');
   if(error===5)add('ui_extension_errored',{category:'extension',extensionAppHash:hash('simulated-checkout-helper'),extensionAppName:'Test Checkout Helper'});
   const payment=!earlyStop&&!blocked&&(success||paymentExit||error===0);
   if(payment)add('payment_info_submitted');
   if(error===0)alert('payment');
   if(success){add('checkout_completed');completed++;}
   if(shipping&&!blocked&&!payment&&!success)shippingExits++;

  }
  hours.push({hour:hour+1,phase,sessions:count,completed,abandoned:count-completed,shippingExits,errorSessions:errors.size});
 }
 events.sort((a,b)=>a.timestamp-b.timestamp);
 return {seed,start:base,hours,events};
}
export function snapshot(run:ReturnType<typeof simulate>,hour:number,healthy=true){
 if(!Number.isInteger(hour)||hour<1||hour>24)throw Error('Hour must be 1–24');
 const end=run.start+hour*HOUR;
 // Evaluate after every session has had its full one-hour observation window.
 const now=end+HOUR;
 const ids=new Set(run.events.filter(e=>e.name==='checkout_started'&&e.timestamp<end).map(e=>e.sessionId));
 const rows=run.events.filter(e=>e.timestamp<now&&ids.has(e.sessionId));
 const range={start:Math.max(run.start,end-6*HOUR),end};
 const summary=summarize(rows,{asOf:now});
 return {hour,phase:run.hours[hour-1].phase,summary:{sessions:summary.started,completed:summary.completed,abandoned:summary.noCompletionObserved},trends:checkoutTrends(rows,{asOf:now},range,healthy,now)};
}
