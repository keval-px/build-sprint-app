import {completionAfter,type OutcomeFacts} from './checkoutOutcome.ts';
import {summarize, type CheckoutEvent} from './evidence.ts';
import type {MissionId} from './actions.ts';
export const FIX_MISSIONS = ['payment','validation','unfinished','delivery','discount','inventory','extension'] as const;
export function isFixMission(value:unknown):value is MissionId {return FIX_MISSIONS.some(id=>id===value);}
const WINDOW=30*86400000;
const matching=(e:CheckoutEvent,id:MissionId,signal?:'shipping_unavailable')=>(e.name==='alert_displayed'||e.name==='ui_extension_errored')&&e.category===id&&(id!=='discount'||!!e.discountOfferCode)&&(!signal||e.shippingBlocker==='no_shipping_available');
export interface FixCounts {checkouts:number;affected:number;completed:number}
export interface AppliedFix {signal?:"shipping_unavailable";missionId:MissionId;appliedAt:number;baseline:FixCounts;affectedIds:string[];partial:boolean;retestedAt?:number}
export function retestResults(fix:AppliedFix,events:CheckoutEvent[],now:number){
  if(fix.retestedAt===undefined)return null;
  const alerts=events.filter(e=>matching(e,fix.missionId,fix.signal)&&e.timestamp>=fix.retestedAt!&&e.timestamp<=now);
  return {returned:new Set(alerts.map(e=>e.sessionId)).size,lastAlert:alerts.length?Math.max(...alerts.map(e=>e.timestamp)):null};
}
export function actionState(fix:AppliedFix|undefined,events:CheckoutEvent[],now:number){
  if(!fix)return {done:false,returned:0};
  const boundary=fix.retestedAt??fix.appliedAt;
  const returned=new Set(events.filter(e=>matching(e,fix.missionId,fix.signal)&&e.timestamp>=boundary&&e.timestamp<=now).map(e=>e.sessionId)).size;
  return {done:returned===0,returned};
}
function affected(events:CheckoutEvent[],id:MissionId,signal?:'shipping_unavailable'){return id==='unfinished'?!events.some(e=>e.name==='checkout_completed'):events.some(e=>matching(e,id,signal));}
export function fixBaseline(events:CheckoutEvent[],missionId:MissionId,appliedAt:number,partial=false,signal?:"shipping_unavailable",facts:OutcomeFacts={}):AppliedFix {
  const sessions=summarize(events.filter(e=>e.timestamp<appliedAt),{...facts,asOf:appliedAt}).journeys.filter(s=>Math.min(...s.events.filter(e=>e.name==='checkout_started').map(e=>e.timestamp))>=appliedAt-WINDOW && s.started);
  const matching=sessions.filter(s=>missionId==='unfinished'?!s.completed:affected(s.events,missionId,signal));
  return {...(signal?{signal}:{}),missionId,appliedAt,partial,baseline:{checkouts:sessions.length,affected:matching.length,completed:sessions.filter(s=>s.completed).length},affectedIds:matching.filter(s=>!s.completed).map(s=>s.id)};
}
export function fixResults(fix:AppliedFix,events:CheckoutEvent[],now:number,facts:OutcomeFacts={}){
  const end=Math.min(now,fix.appliedAt+WINDOW);
  const all=summarize(events.filter(e=>e.timestamp<=end),{...facts,asOf:end}).journeys;
  const sessions=all.filter(s=>s.started&&Math.min(...s.events.filter(e=>e.name==='checkout_started').map(e=>e.timestamp))>=fix.appliedAt);
  return {after:{checkouts:sessions.length,affected:sessions.filter(s=>fix.missionId==='unfinished'?!s.completed:affected(s.events,fix.missionId,fix.signal)).length,completed:sessions.filter(s=>s.completed).length},
    affectedCompleted:all.filter(j=>fix.affectedIds.includes(j.id)&&completionAfter(j.outcome,j.events,fix.appliedAt)).length,
    affectedTotal:fix.affectedIds.length,ended:now>=fix.appliedAt+WINDOW};
}

// A marker records a user decision. Only observed, timed purchases can show
// completion after it, and monitoring gaps prevent interpreting silence.
export function fixAssessment(fix:AppliedFix,events:CheckoutEvent[],now:number,health:{canAssess:boolean},facts:OutcomeFacts={}) {
 const results=fixResults(fix,events,now,facts),state=actionState(fix,events,now);
 return {markedDone:true,teamRetested:fix.retestedAt!==undefined,returned:state.returned,
  completionObserved:health.canAssess&&results.affectedCompleted>0,
  canAssess:health.canAssess&&!fix.partial&&results.after.checkouts>=2,
  issueResolved:false as const};
}
