import {EVENT_NAMES,summarize,type CheckoutEvent} from './evidence.ts';
export const READ_FRESH_MS=2*60000, SYNC_FRESH_MS=5*60000, DELIVERY_FRESH_MS=60*60000;
export interface MonitoringEvidence {
 collection:{configured?:boolean;firstReceivedAt?:number;lastReceivedAt?:number;limited:boolean};
 sync?:{required:boolean;status?:'success'|'failed'|'limit'|'reconnect';lastAttemptAt?:number;lastSuccessAt?:number;coverageStart?:number;coverageEnd?:number;reconciliationVerified?:boolean;pendingUpdates?:boolean};
 historyUnavailable?:boolean;
}
export interface MonitoringInput {evidence:MonitoringEvidence|null;events:CheckoutEvent[];sampledAt?:number;readFailed?:boolean;truncated?:boolean;rangeStart:number;now:number}
export interface MonitoringHealth {state:'Healthy'|'Waiting'|'Needs attention'|'Partial';message:string;canAssess:boolean;reasons:string[]}
export function monitoringHealth(input:MonitoringInput):MonitoringHealth {
 const {evidence,now}=input,attention:string[]=[],partial:string[]=[],waiting:string[]=[];
 const valid=(at:number|undefined)=>at!==undefined&&Number.isFinite(at)&&at<=now&&at>=0;
 if(input.readFailed)attention.push('The latest evidence request failed. Retained results have not been updated.');
 if(input.sampledAt===undefined)waiting.push('A successful current evidence read has not been confirmed.');
 if(input.sampledAt!==undefined&&(!valid(input.sampledAt)||now-input.sampledAt>READ_FRESH_MS))attention.push('The displayed evidence is no longer current. Retry before assessing checkout changes.');
 if(!evidence)waiting.push('Monitoring details are unavailable. Collection configuration alone does not confirm delivery.');
 else {
  const c=evidence.collection,s=evidence.sync;
  if(c.configured===undefined)waiting.push('Checkout collection configuration has not been confirmed. Run the setup check.');
  if(c.configured===false)attention.push('Checkout collection is not configured. Enable it and run a test checkout.');
  if(!valid(c.lastReceivedAt))waiting.push('Waiting for the first accepted checkout delivery. Run a test checkout to check collection.');
  else if(now-c.lastReceivedAt!>DELIVERY_FRESH_MS)waiting.push('No recent checkout delivery was observed. Traffic may be quiet or collection may need checking.');
  if(c.limited)partial.push('Checkout collection reached its storage limit. New events may be missing.');
  if(input.truncated)partial.push('Only part of the checkout history is available. Earlier steps may be missing.');
  if(evidence.historyUnavailable)partial.push('Required history or checkout prices could not be read.');
  if(!valid(c.firstReceivedAt)||c.firstReceivedAt!>input.rangeStart)partial.push('Collection coverage does not include the full selected period.');
  if(s?.required){
   if(s.pendingUpdates)partial.push('Some Shopify records changed during the scan. Their newer versions are deferred to an overlapping refresh; saved figures may be incomplete.');
   if(s.reconciliationVerified===false)partial.push('Saved Shopify records have not been independently reconciled against native totals. A completed API scan does not confirm missing records are resolved.');
   if(s.status===undefined)waiting.push('Shopify refresh status has not been confirmed.');
   if(s.status==='failed'||s.status==='reconnect')attention.push(s.status==='reconnect'?'Shopify authorization needs reconnection. Previous server figures are retained.':'Shopify refresh failed. Previous server figures are retained.');
   if(s.status==='limit')partial.push('Shopify history reached a reporting limit. The last complete snapshot is retained.');
   if(!valid(s.lastSuccessAt))waiting.push('Waiting for a successful Shopify refresh.');
   else if(now-s.lastSuccessAt!>SYNC_FRESH_MS)attention.push('Shopify figures are stale. Retry the refresh before assessing outcomes.');
   if(!valid(s.coverageStart)||s.coverageStart!>input.rangeStart||!valid(s.coverageEnd)||now-s.coverageEnd!>SYNC_FRESH_MS)partial.push('Server history does not cover the requested period through recent activity.');
  }
 }
 const starts=summarize(input.events,{asOf:now}).started;
 if(!starts)waiting.push('No checkout starts were observed in these dates. There is not enough activity to assess checkout health.');
 else if(starts<2)waiting.push('Too few checkout starts to assess repeated issues. Keep collecting observations.');
 const reasons=[...attention,...partial,...waiting],state=attention.length?'Needs attention':partial.length?'Partial':waiting.length?'Waiting':'Healthy';
 return {state,reasons,message:reasons.join(' ')||'Recent checkout delivery and required data reads are current. This describes monitoring, not proof that checkout is error-free.',canAssess:state==='Healthy'};
}
export interface SyncHealth {status:'success'|'failed'|'limit'|'reconnect';lastAttemptAt:number;lastSuccessAt?:number;coverageStart?:number;coverageEnd?:number}
export function nextSyncHealth(old:SyncHealth|null,next:SyncHealth,connectedAt:number|undefined,revokedAt:number|undefined):SyncHealth|null {
 if(connectedAt===undefined||next.lastAttemptAt<connectedAt||revokedAt!==undefined&&next.lastAttemptAt<=revokedAt||old&&old.lastAttemptAt>next.lastAttemptAt)return null;
 const previous=old&&old.lastAttemptAt>=connectedAt?old:null;
 return {status:next.status,lastAttemptAt:next.lastAttemptAt,...(next.lastSuccessAt!==undefined?{lastSuccessAt:next.lastSuccessAt}:previous?.lastSuccessAt!==undefined?{lastSuccessAt:previous.lastSuccessAt}:{}),...(next.coverageStart!==undefined?{coverageStart:next.coverageStart}:previous?.coverageStart!==undefined?{coverageStart:previous.coverageStart}:{}),...(next.coverageEnd!==undefined?{coverageEnd:next.coverageEnd}:previous?.coverageEnd!==undefined?{coverageEnd:previous.coverageEnd}:{})};
}

export function validMonitoring(value:unknown):value is MonitoringEvidence {
 if(!value||typeof value!=='object')return false;
 const m=value as MonitoringEvidence,c=m.collection;if(!c||typeof c!=='object'||typeof c.limited!=='boolean'||c.configured!==undefined&&typeof c.configured!=='boolean')return false;
 const times=[c.firstReceivedAt,c.lastReceivedAt,m.sync?.lastAttemptAt,m.sync?.lastSuccessAt,m.sync?.coverageStart,m.sync?.coverageEnd];
 if(times.some(t=>t!==undefined&&(!Number.isFinite(t)||t<0)))return false;
 if(m.historyUnavailable!==undefined&&typeof m.historyUnavailable!=='boolean')return false;
 if(m.sync!==undefined&&(!m.sync||typeof m.sync!=='object'||typeof m.sync.required!=='boolean'||m.sync.status!==undefined&&!['success','failed','limit','reconnect'].includes(m.sync.status)))return false;
 if(m.sync?.pendingUpdates!==undefined&&typeof m.sync.pendingUpdates!=='boolean')return false;
 if(m.sync?.reconciliationVerified!==undefined&&typeof m.sync.reconciliationVerified!=='boolean')return false;
 return true;
}

export function collectionReceipt(old:{firstReceivedAt?:number;lastReceivedAt?:number}|null,receivedAt:number,connectedAt=0){
 const sameInstallation=old?.lastReceivedAt!==undefined&&old.lastReceivedAt>=connectedAt;
 return {firstReceivedAt:sameInstallation&&old?.firstReceivedAt!==undefined?old.firstReceivedAt:receivedAt,lastReceivedAt:receivedAt};
}

export function validMonitoringEvents(value:unknown):value is CheckoutEvent[] {
 return Array.isArray(value)&&value.every(e=>e&&typeof e==='object'&&typeof e.sessionId==='string'&&/^[a-f0-9]{64}$/.test(e.sessionId)&&typeof e.eventId==='string'&&e.eventId.length>0&&e.eventId.length<=128&&EVENT_NAMES.includes(e.name)&&Number.isFinite(e.timestamp)&&e.timestamp>=0&&(e.category===null||['discount','payment','delivery','validation','inventory','extension'].includes(e.category)));
}
