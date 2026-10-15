import {storeClock,type OrderPattern} from './orderPattern.ts';

// Orders far below normal for a couple of hours in a row. It watches order flow only, so
// it can't say whether the theme, an app, payments or traffic caused the drop.
export const ORDER_DROP={
 minimumAverage:10,// hours that normally have fewer orders are not checked at all
 belowAverage:0.5,// an hour counts when its orders are at most half its average
 hoursInARow:2,
 minimumDays:7,// full days of history before the average is trusted
};
export interface DropHour {hour:number;count:number;average:number;change:number}
export interface OrderDrop {state:'drop'|'normal'|'low-volume'|'learning';hours:DropHour[]}

export function orderDrop(pattern:OrderPattern):OrderDrop {
 if(pattern.baselineDays<ORDER_DROP.minimumDays)return {state:'learning',hours:[]};
 // The running hour is incomplete, so only hours that have ended are judged.
 const running=storeClock(pattern.syncedAt,pattern.timeZone).hour;
 const checked=pattern.hours.filter(h=>h.hour<running&&h.count!==null&&h.average!==null&&h.average>=ORDER_DROP.minimumAverage);
 if(!checked.length)return {state:'low-volume',hours:[]};
 let run:DropHour[]=[],latest:DropHour[]=[];
 for(const h of checked){
  const low=h.count!<=h.average!*ORDER_DROP.belowAverage;
  if(!low){run=[];continue;}
  // A run is consecutive clock hours; an unchecked quiet hour in between breaks it.
  if(run.length&&run.at(-1)!.hour!==h.hour-1)run=[];
  run=[...run,{hour:h.hour,count:h.count!,average:h.average!,change:Math.round((h.count!-h.average!)/h.average!*100)}];
  if(run.length>=ORDER_DROP.hoursInARow)latest=run;
 }
 return latest.length?{state:'drop',hours:latest}:{state:'normal',hours:[]};
}
// The chart's status line. Shown only when the order-drop check could judge today,
// so it never claims normal flow without enough history or volume to compare.
export function orderFlowStatus(drop:OrderDrop):{tone:'normal'|'drop';text:string}|null {
 if(drop.state==='normal')return {tone:'normal',text:'Normal order flow'};
 if(drop.state==='drop')return {tone:'drop',text:'Fewer orders than usual'};
 return null;
}
