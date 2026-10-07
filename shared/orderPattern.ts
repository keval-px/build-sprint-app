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
