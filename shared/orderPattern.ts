export interface PatternOrder {recordHash:string;createdAt:string;paid:boolean;cancelled:boolean;test:boolean}
const DAY=86400000;
function clock(timeZone:string){
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
 return (at:number)=>{
  const parts=Object.fromEntries(formatter.formatToParts(at).map(p=>[p.type,p.value]));
  return {day:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour)};
 };
}
export function storeClock(at:number,timeZone:string){return clock(timeZone)(at);}
const shiftDay=(day:string,n:number)=>new Date(Date.parse(`${day}T00:00:00Z`)+n*DAY).toISOString().slice(0,10);
function midnight(day:string,read:ReturnType<typeof clock>){
 // Find the first instant of this local date. This uses the zone's actual
 // calendar boundaries rather than a fixed UTC offset, including DST changes.
 const center=Date.parse(`${day}T00:00:00Z`);
 let lo=center-2*DAY,hi=center+2*DAY;
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(read(mid).day<day)lo=mid;else hi=mid;}
 return hi;
}
export function orderHistoryStart(now:number,timeZone:string){
 const read=clock(timeZone);return new Date(midnight(shiftDay(read(now).day,-30),read)).toISOString();
}
export function orderPattern(orders:PatternOrder[],periodStart:string,syncedAt:number,timeZone='UTC'){
 const coverage=Date.parse(periodStart);
 if(!Number.isFinite(coverage)||!Number.isFinite(syncedAt)||coverage>syncedAt)return null;
 let read:ReturnType<typeof clock>;
 try{read=clock(timeZone);}catch{return null;}
 const currentClock=read(syncedAt),today=midnight(currentClock.day,read);
 const weekday=new Date(`${currentClock.day}T00:00:00Z`).getUTCDay();
 const eligibleDays=new Set<string>(),observedDays=Array<number>(24).fill(0);
 for(let i=30;i>=1;i--){
  const day=shiftDay(currentClock.day,-i),start=midnight(day,read),end=midnight(shiftDay(day,1),read);
  if(start<coverage||end>today||read(start).day!==day||new Date(`${day}T00:00:00Z`).getUTCDay()!==weekday)continue;
  eligibleDays.add(day);
  // A spring-forward hour did not exist, so it is not a zero-order hour.
  // Both occurrences of a fall-back hour contribute to that day's same bin.
  const hours=new Set<number>();
  for(let at=start;at<end;at+=30*60000)hours.add(read(at).hour);
  for(const hour of hours)observedDays[hour]++;
 }
 const baseline=Array<number>(24).fill(0),current=Array<number>(24).fill(0),seen=new Set<string>();
 let testOrders=0,totalOrders=0;
 for(const order of orders){
  const at=Date.parse(order.createdAt);
  if(!order.paid||order.cancelled||!Number.isFinite(at)||at<coverage||at>syncedAt||seen.has(order.recordHash))continue;
  const local=read(at);if(local.day!==currentClock.day&&!eligibleDays.has(local.day))continue;
  seen.add(order.recordHash);totalOrders++;if(order.test)testOrders++;
  if(local.day===currentClock.day)current[local.hour]++;else baseline[local.hour]++;
 }
 return {day:currentClock.day,timeZone,baselineDays:eligibleDays.size,syncedAt,testOrders,totalOrders,
  hours:current.map((count,hour)=>({hour,count:hour>currentClock.hour?null:count,average:observedDays[hour]?baseline[hour]/observedDays[hour]:null}))};
}
export type OrderPattern=NonNullable<ReturnType<typeof orderPattern>>;

export interface SelectedOrderPattern {
 range:string;mode:'hourly'|'daily';day:string;timeZone:string;syncedAt:number;
 baselineDays:number;selectedOrders:number;partial:boolean;
 hours:OrderPattern['hours'];days:{day:string;count:number|null;average:number|null;baselineDays:number}[];
}
// Date-picker values are calendar dates in the store's timezone. Daily points
// include recorded zero-order days; uncovered or future dates remain unknown.
export function selectedOrderPattern(orders:PatternOrder[],periodStart:string,syncedAt:number,timeZone:string,range:string):SelectedOrderPattern|null{
 const match=/^(\d{4}-\d{2}-\d{2})--(\d{4}-\d{2}-\d{2})$/.exec(range);
 if(!match)return null;
 const [first,last]=match.slice(1),firstAt=Date.parse(`${first}T00:00:00Z`),lastAt=Date.parse(`${last}T00:00:00Z`);
 if(!Number.isFinite(firstAt)||!Number.isFinite(lastAt)||new Date(firstAt).toISOString().slice(0,10)!==first||new Date(lastAt).toISOString().slice(0,10)!==last||lastAt<firstAt||lastAt-firstAt>30*DAY)return null;
 const coverage=Date.parse(periodStart);if(!Number.isFinite(coverage)||!Number.isFinite(syncedAt)||coverage>syncedAt)return null;
 let read:ReturnType<typeof clock>;try{read=clock(timeZone);}catch{return null;}
 const boundaries=new Map<string,number>();
 const startOf=(day:string)=>{if(!boundaries.has(day))boundaries.set(day,midnight(day,read));return boundaries.get(day)!;};
 const counts=new Map<string,number>(),seen=new Set<string>();
 const valid=orders.filter(order=>{
  const at=Date.parse(order.createdAt);
  if(!order.paid||order.cancelled||!Number.isFinite(at)||at<coverage||at>syncedAt||seen.has(order.recordHash))return false;
  seen.add(order.recordHash);const day=read(at).day;counts.set(day,(counts.get(day)??0)+1);return true;
 });
 if(first===last){
  const begin=startOf(first),end=startOf(shiftDay(first,1)),available=begin>=coverage&&begin<=syncedAt;
  const hourly=orderPattern(valid,periodStart,Math.min(syncedAt,end-1),timeZone);
  if(!hourly)return null;
  const hours=available&&hourly.day===first?hourly.hours:Array.from({length:24},(_,hour)=>({hour,count:null,average:null}));
  return {range,mode:'hourly',day:first,timeZone,syncedAt,baselineDays:available?hourly.baselineDays:0,selectedOrders:counts.get(first)??0,partial:!available,hours,days:[]};
 }
 const days:SelectedOrderPattern['days']=[];
 for(let day=first;day<=last;day=shiftDay(day,1)){
  const begin=startOf(day),available=begin>=coverage&&begin<=syncedAt;
  let baselineDays=0,baselineOrders=0;
  // Same weekday only; never include the selected day in its own baseline.
  for(let back=7;back<=30;back+=7){
   const prior=shiftDay(day,-back),start=startOf(prior),end=startOf(shiftDay(prior,1));
   if(start<coverage||end>begin||end>syncedAt||read(start).day!==prior)continue;
   baselineDays++;baselineOrders+=counts.get(prior)??0;
  }
  days.push({day,count:available?counts.get(day)??0:null,average:baselineDays?baselineOrders/baselineDays:null,baselineDays});
 }
 return {range,mode:'daily',day:last,timeZone,syncedAt,baselineDays:Math.max(...days.map(d=>d.baselineDays)),selectedOrders:days.reduce((sum,d)=>sum+(counts.get(d.day)??0),0),partial:days.some(d=>d.count===null),hours:[],days};
}
