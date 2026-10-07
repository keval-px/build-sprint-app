import type {CheckoutEvent} from './evidence.ts';
export const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function recentRange(days:number,now=new Date()){
  const start=new Date(now);start.setDate(start.getDate()-days+1);
  return `${localDate(start)}--${localDate(now)}`;
}
export function dateBounds(value:string){
  const match=value.match(/^(\d{4}-\d{2}-\d{2})--(\d{4}-\d{2}-\d{2})$/);
  if(!match)throw Error('Choose a start and end date.');
  const start=new Date(`${match[1]}T00:00:00`),end=new Date(`${match[2]}T00:00:00`);
  if(localDate(start)!==match[1]||localDate(end)!==match[2]||start>end)throw Error('Choose a valid date range.');
  end.setDate(end.getDate()+1);
  return {start:start.getTime(),end:end.getTime()};
}
export function checkoutCohort(events:CheckoutEvent[],range:string|{start:number;end:number}){
  const {start,end}=typeof range==='string'?dateBounds(range):range;
  const starts=new Map<string,number>();
  for(const event of events)if(event.name==='checkout_started')starts.set(event.sessionId,Math.min(starts.get(event.sessionId)??Infinity,event.timestamp));
  return events.filter(event=>{const at=starts.get(event.sessionId);return at!==undefined&&at>=start&&at<end;});
}
