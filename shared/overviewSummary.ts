import {summarize,type CheckoutEvent} from './evidence.ts';
import {checkoutCohort} from './dateRange.ts';
import {journeyFunnel,funnelFilters,type FunnelFilter} from './checkoutFunnel.ts';
import type {OutcomeFacts} from './checkoutOutcome.ts';
export interface FunnelSummary {rows:{label:string;count:number;percent:number;drop:number|null}[];count:number;total:number;unknownDevice:number;completed:number}
export interface OverviewSummary {rangeStart:number;rangeEnd:number;sessionCount:number;completed:number;noCompletionObserved:number;funnels:Record<FunnelFilter,FunnelSummary>}
// Overview counts for checkouts started in the dates, computed where the events live.
// Counts only: session identities stay out so the response stays small.
export function overviewSummary(events:CheckoutEvent[],facts:OutcomeFacts,range:{start:number;end:number}):OverviewSummary {
 const summary=summarize(checkoutCohort(events,range),facts);
 const funnel=(filter:FunnelFilter):FunnelSummary=>{
  const model=journeyFunnel(summary.journeys,filter);
  return {rows:model.rows.map(({label,count,percent,drop})=>({label,count,percent,drop})),count:model.count,total:model.total,unknownDevice:model.unknownDevice,completed:model.completed};
 };
 return {rangeStart:range.start,rangeEnd:range.end,sessionCount:summary.sessionCount,completed:summary.completed,noCompletionObserved:summary.noCompletionObserved,
  funnels:Object.fromEntries(funnelFilters.map(filter=>[filter,funnel(filter)])) as Record<FunnelFilter,FunnelSummary>};
}
