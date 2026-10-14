import {storeClock,type OrderPattern} from './orderPattern.ts';
export interface AbandonedPatternRecord {recordHash:string;createdAt:string;recovered:boolean}
export interface AbandonedPattern {hours:(number|null)[];observed:number}
// This payload has no authoritative native-record total or completeness flag.
// Only observed nonzero bins can be drawn; missing rows must not become zeroes.
// createdAt is the record-creation hour, not an exact abandonment timestamp.
export function abandonedPattern(records:AbandonedPatternRecord[]|null,pattern:OrderPattern):AbandonedPattern {
 const hours:(number|null)[]=Array(24).fill(null),seen=new Set<string>();let observed=0;
 if(!records)return {hours,observed};
 for(const record of records){
  const at=Date.parse(record.createdAt);
  if(record.recovered||!Number.isFinite(at)||at>pattern.syncedAt||seen.has(record.recordHash))continue;
  const local=storeClock(at,pattern.timeZone);if(local.day!==pattern.day)continue;
  seen.add(record.recordHash);hours[local.hour]=(hours[local.hour]??0)+1;observed++;
 }
 return {hours,observed};
}
export const ABANDONED_LINE_COLOR='#D86B76';
export function abandonedSeriesName(pattern:OrderPattern,now=Date.now()){
 return pattern.day===storeClock(now,pattern.timeZone).day?'Today’s abandoned checkouts':`${pattern.day} abandoned checkouts`;
}
export function abandonedTooltipValue(value:number|null,future:boolean){
 return future?'Not reached':value===null?'0':value.toLocaleString();
}
