import {summarize,type CheckoutEvent} from './evidence.ts';
import {checkoutCohort} from './dateRange.ts';
import {buildMissions,missionRecommendation,missionSignal,type Mission,type MissionId} from './actions.ts';
import {buildRecommendations} from './recommendations.ts';
import {actionValues} from './actionValues.ts';
import {inventoryValue} from './inventoryValue.ts';
import {actionState,fixResults,retestResults,type AppliedFix} from './fixTracking.ts';
import {checkoutTrends,type CheckoutTrend} from './checkoutTrends.ts';
import type {OutcomeFacts} from './checkoutOutcome.ts';
import type {AbandonedRecords} from './abandoned.ts';
import type {CheckoutPrice} from './checkoutPrice.ts';
import type {SavedBasket} from './basketValue.ts';

type Order={sessionId?:string;createdAt:string;paid:boolean;conversion?:{shopMinor:number;buyerMinor:number;buyerCurrency:string}};
export interface InsightInput {
 events:CheckoutEvent[];// every event read, not only checkouts started in the dates
 facts:OutcomeFacts;now:number;range:{start:number;end:number};fixes:AppliedFix[];currency:string;
 values:{abandonedCheckouts:AbandonedRecords|null;abandoned:(SavedBasket&{recordHash:string})[];prices:CheckoutPrice[];orders:Order[];
  // Aggregates the public page receives instead of private Shopify records.
  shared?:ReturnType<typeof actionValues>|null;sharedInventory?:{totalMinor:number|null}|null};
 trends:{healthy:boolean;simulationMode:boolean};
}
export interface InsightCardData {
 mission:Mission;fix?:AppliedFix;status:ReturnType<typeof actionState>;signal:ReturnType<typeof missionSignal>;recommendation:string;
 shippingBlockers:number;basketCents:number|null|undefined;inventoryMinor:number|null;percent:number;
 // What happened after the card was marked done; the page adds its own data-health check.
 results?:ReturnType<typeof fixResults>;retest?:ReturnType<typeof retestResults>;
}
export interface InsightReport {
 rangeStart:number;rangeEnd:number;sessionCount:number;cards:InsightCardData[];
 trends:CheckoutTrend[];trendWindow:{start:number;end:number;simulationMode:boolean};
 // Missions without a card, so links to them can still filter the Checkouts table.
 otherMissions:{id:MissionId;sessionIds:string[]}[];
}
const priority:Record<MissionId,number>={delivery:0,payment:0,inventory:0,discount:1,validation:2,unfinished:3,extension:1};
const severityRank={Critical:0,Warning:1,Info:2};

// Insight cards and trend checks for checkouts started in the dates, in display order.
// Fix results look at all activity after marking done, whatever dates are selected.
export function insightReport(input:InsightInput):InsightReport {
 const {events:all,facts,now,range,currency,values}=input,events=checkoutCohort(all,range);
 const summary=summarize(events,facts);
 const unfinishedIds=new Set(summary.journeys.filter(session=>session.started&&!session.completed).map(session=>session.id));
 const recommendations=buildRecommendations(events,facts);
 const recorded=values.shared?.rangeStart===range.start&&values.shared.rangeEnd===range.end?values.shared:actionValues(events,values.abandonedCheckouts,values.abandoned,values.prices,currency,range.start,range.end,facts.orders,now);
 const fixes=new Map(input.fixes.map(f=>[f.missionId,f]));
 // Each mission's fix, state and signal are computed once rather than per sort comparison.
 const derived=new Map(recommendations.map(mission=>{
  const fix=fixes.get(mission.id),boundary=fix?.retestedAt??fix?.appliedAt;
  return [mission.id,{fix,boundary,status:actionState(fix,all,now),signal:missionSignal(mission,events,boundary,facts),unfinished:mission.sessionIds.filter(id=>unfinishedIds.has(id)).length}];
 }));
 const missions=recommendations.sort((a,b)=>{const x=derived.get(a.id)!,y=derived.get(b.id)!;return Number(x.status.done)-Number(y.status.done)||severityRank[x.signal.severity.label]-severityRank[y.signal.severity.label]||priority[a.id]-priority[b.id]||y.unfinished-x.unfinished;});
 const sharedInventory=values.sharedInventory?values.sharedInventory:null;
 const orderQuotes=sharedInventory?[]:values.orders.flatMap(o=>o.sessionId&&o.conversion?[{sessionId:o.sessionId,shop:{minor:o.conversion.shopMinor,currency},buyer:{minor:o.conversion.buyerMinor,currency:o.conversion.buyerCurrency}}]:[]);
 const cards=missions.map(mission=>{
  const {status,fix,signal,boundary}=derived.get(mission.id)!;
  const affected=new Set(mission.sessionIds);
  const inventory=sharedInventory??inventoryValue(events,mission.sessionIds,currency,orderQuotes);
  return {mission,...(fix?{fix,results:fixResults(fix,all,now,facts),retest:retestResults(fix,all,now)}:{}),status,signal,
   recommendation:missionRecommendation(mission,events,boundary,facts),
   shippingBlockers:new Set(events.filter(event=>event.shippingBlocker==='no_shipping_available'&&affected.has(event.sessionId)).map(event=>event.sessionId)).size,
   basketCents:recorded.actions.find(item=>item.id===mission.id)?.totalCents,inventoryMinor:inventory.totalMinor,
   percent:summary.sessionCount?Math.round(mission.count/summary.sessionCount*100):0};
 });
 // Simulated traffic is judged on the last six hours so a new run shows changes quickly.
 const trendNow=Math.min(now,facts.asOf??now),trendRange={...range};
 if(input.trends.simulationMode)trendRange.start=Math.max(trendRange.start,trendNow-6*3600000,Math.min(...all.filter(e=>e.name==='checkout_started').map(e=>e.timestamp)));
 const trends=checkoutTrends(all,{...facts,asOf:trendNow},trendRange,input.trends.healthy,trendNow);
 const carded=new Set(missions.map(m=>m.id));
 return {rangeStart:range.start,rangeEnd:range.end,sessionCount:summary.sessionCount,cards,trends,
  trendWindow:{start:trendRange.start,end:Math.max(trendRange.start,Math.min(trendRange.end,trendNow-3600000)),simulationMode:input.trends.simulationMode},
  otherMissions:buildMissions(events,facts).filter(m=>!carded.has(m.id)).map(m=>({id:m.id,sessionIds:m.sessionIds}))};
}
