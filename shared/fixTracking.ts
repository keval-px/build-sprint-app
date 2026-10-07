import {summarize, type CheckoutEvent} from './evidence.ts';
import type {MissionId} from './actions.ts';
export const FIX_MISSIONS = ['payment','validation','unfinished','delivery','discount','inventory'] as const;
export function isFixMission(value:unknown):value is MissionId {return FIX_MISSIONS.some(id=>id===value);}
const WINDOW=30*86400000;
export interface FixCounts {checkouts:number;affected:number;completed:number}
export interface AppliedFix {missionId:MissionId;appliedAt:number;baseline:FixCounts;affectedIds:string[];partial:boolean}
function affected(events:CheckoutEvent[],id:MissionId){return id==='unfinished'?!events.some(e=>e.name==='checkout_completed'):events.some(e=>e.category===id);}
export function fixBaseline(events:CheckoutEvent[],missionId:MissionId,appliedAt:number,partial=false):AppliedFix {
  const sessions=summarize(events.filter(e=>e.timestamp<appliedAt)).journeys.filter(s=>Math.min(...s.events.filter(e=>e.name==='checkout_started').map(e=>e.timestamp))>=appliedAt-WINDOW && s.started);
  const matching=sessions.filter(s=>affected(s.events,missionId));
  return {missionId,appliedAt,partial,baseline:{checkouts:sessions.length,affected:matching.length,completed:sessions.filter(s=>s.completed).length},affectedIds:matching.filter(s=>!s.completed).map(s=>s.id)};
}
export function fixResults(fix:AppliedFix,events:CheckoutEvent[],now:number){
  const end=Math.min(now,fix.appliedAt+WINDOW);
  const observed=events.filter(e=>e.timestamp>=fix.appliedAt&&e.timestamp<=end);
  const sessions=summarize(events.filter(e=>e.timestamp<=end)).journeys.filter(s=>s.started&&Math.min(...s.events.filter(e=>e.name==='checkout_started').map(e=>e.timestamp))>=fix.appliedAt);
  return {after:{checkouts:sessions.length,affected:sessions.filter(s=>affected(s.events,fix.missionId)).length,completed:sessions.filter(s=>s.completed).length},
    affectedCompleted:new Set(observed.filter(e=>e.name==='checkout_completed'&&fix.affectedIds.includes(e.sessionId)).map(e=>e.sessionId)).size,
    affectedTotal:fix.affectedIds.length,ended:now>=fix.appliedAt+WINDOW};
}
