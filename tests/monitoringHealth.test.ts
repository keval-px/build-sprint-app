import test from 'node:test';
import assert from 'node:assert/strict';
import {monitoringHealth,nextSyncHealth,validMonitoring,validMonitoringEvents,collectionReceipt,type MonitoringInput,type MonitoringEvidence} from '../shared/monitoringHealth.ts';
import {fixBaseline,fixAssessment} from '../shared/fixTracking.ts';
import {historyMarkup,alertsMarkup} from '../src/dashboardPanels.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const now=1000000000000,start=now-86400000;
const events:CheckoutEvent[]=['a','b'].map((s,i)=>({sessionId:s.repeat(64),eventId:`start${i}`,name:'checkout_started',timestamp:now-10000,category:null}));
const evidence:MonitoringEvidence={collection:{configured:true,firstReceivedAt:start-1,lastReceivedAt:now-1000,limited:false},sync:{required:true,status:'success',lastSuccessAt:now-1000,coverageStart:start-1,coverageEnd:now-2000}};
const input:MonitoringInput={evidence,events,sampledAt:now-100,now,rangeStart:start};
test('monitoring healthy describes current delivery and coverage, never absence of checkout issues',()=>{
 const health=monitoringHealth(input);assert.equal(health.state,'Healthy');assert.equal(health.canAssess,true);assert.match(health.message,/not proof/);
 assert.match(alertsMarkup([],health),/doesn’t confirm checkout is error-free/);
});
test('zero/insufficient activity and configured collection without delivery wait rather than imply healthy checkout',()=>{
 for(const events of [[],input.events.slice(0,1)]){const health=monitoringHealth({...input,events});assert.equal(health.state,'Waiting');assert.equal(health.canAssess,false);}
 const waiting=monitoringHealth({...input,evidence:{...evidence,collection:{...evidence.collection,lastReceivedAt:undefined}}});
 assert.equal(waiting.state,'Waiting');assert.match(waiting.message,/first accepted/);
 const absent=monitoringHealth({...input,evidence:null});assert.equal(absent.canAssess,false);assert.match(absent.message,/configuration alone/);
});
test('stale deliveries, read failures, stale snapshots, disconnection and sync failures cannot assess recovery',()=>{
 const cases:MonitoringInput[]=[{...input,readFailed:true},{...input,sampledAt:now-3*60000},{...input,evidence:{...evidence,sync:{...evidence.sync!,status:'failed'}}},{...input,evidence:{...evidence,sync:{...evidence.sync!,status:'reconnect'}}},{...input,evidence:{...evidence,sync:{...evidence.sync!,lastSuccessAt:now-6*60000}}},{...input,evidence:{...evidence,collection:{...evidence.collection,configured:false}}}];
 for(const row of cases){const health=monitoringHealth(row);assert.equal(health.state,'Needs attention');assert.equal(health.canAssess,false);}
 const stale=monitoringHealth({...input,evidence:{...evidence,collection:{...evidence.collection,lastReceivedAt:now-61*60000}}});assert.equal(stale.state,'Waiting');assert.match(stale.message,/Traffic may be quiet/);
});
test('partial reads, storage/sync limits and unavailable or untracked history stay explicit',()=>{
 for(const row of [{...input,truncated:true},{...input,evidence:{...evidence,historyUnavailable:true}},{...input,evidence:{...evidence,collection:{...evidence.collection,limited:true}}},{...input,evidence:{...evidence,collection:{...evidence.collection,firstReceivedAt:undefined}}},{...input,evidence:{...evidence,sync:{...evidence.sync!,status:'limit' as const}}}]){
  const health=monitoringHealth(row);assert.equal(health.state,'Partial');assert.equal(health.canAssess,false);
 }
 assert.equal(monitoringHealth({...input,evidence:{...evidence,collection:{...evidence.collection,lastReceivedAt:now+1}}}).canAssess,false);
 assert.equal(validMonitoring({collection:{configured:true,limited:false,lastReceivedAt:NaN}}),false);
});
test('reconnection/late attempts never revive old success and successful newer reads clear failure',()=>{
 const old={status:'success' as const,lastAttemptAt:now-5000,lastSuccessAt:now-4000,coverageStart:start,coverageEnd:now-5000};
 assert.equal(nextSyncHealth(old,{status:'failed',lastAttemptAt:now-6000},now-9000,undefined),null);
 assert.equal(nextSyncHealth(old,{status:'success',lastAttemptAt:now-1000},now-500,undefined),null);
 assert.equal(nextSyncHealth(old,{status:'success',lastAttemptAt:now-1000},now-9000,now-500),null);
 const failed=nextSyncHealth(old,{status:'failed',lastAttemptAt:now-1000},now-9000,undefined)!;assert.equal(failed.lastSuccessAt,old.lastSuccessAt);
 const reconnected=nextSyncHealth(old,{status:'failed',lastAttemptAt:now},now-1000,undefined)!;assert.equal(reconnected.lastSuccessAt,undefined);
 const fresh=nextSyncHealth(failed,{status:'success',lastAttemptAt:now,lastSuccessAt:now,coverageStart:start,coverageEnd:now},now-9000,undefined)!;
 assert.equal(monitoringHealth({...input,evidence:{...evidence,sync:{required:true,...fresh}}}).state,'Healthy');
 assert.equal(monitoringHealth({...input,readFailed:false}).canAssess,true);
});
test('marking done and team retest cannot resolve an issue; observed timed completion requires usable monitoring',()=>{
 const fix=fixBaseline(events,'unfinished',now-5000),ret={...fix,retestedAt:now-4000};
 const completed=events.flatMap((e,i)=>[e,{...e,eventId:`done${i}`,name:'checkout_completed' as const,timestamp:now-1000}]);
 // An assessment reports returned alerts and whether a result can be judged; it never claims a fix.
 assert.deepEqual(fixAssessment(ret,[],now,{canAssess:false}),{returned:0,canAssess:false});
 assert.equal(fixAssessment(ret,completed,now,{canAssess:false}).canAssess,false,'unusable monitoring never assesses a result');
 const history=historyMarkup([{...ret,active:true}],completed,true,{},monitoringHealth({...input,readFailed:true}));
 assert.match(history,/Retest reported/);assert.match(history,/Result not verified/);assert.doesNotMatch(history,/tone="success"/);
});

test('receipt freshness uses acceptance time and reconnect cannot backdate confirmed delivery coverage',()=>{
 const old={firstReceivedAt:start-1,lastReceivedAt:now-10000};
 assert.deepEqual(collectionReceipt(old,now,now-20000),{firstReceivedAt:start-1,lastReceivedAt:now});
 assert.deepEqual(collectionReceipt(old,now,now-5000),{firstReceivedAt:now,lastReceivedAt:now});
 assert.deepEqual(collectionReceipt(null,now),{firstReceivedAt:now,lastReceivedAt:now});
 assert.equal(monitoringHealth({...input,sampledAt:undefined}).canAssess,false);
 assert.equal(monitoringHealth({...input,evidence:{...evidence,sync:{required:true}}}).canAssess,false);
 const next=nextSyncHealth({...evidence.sync!,status:'success',lastAttemptAt:now-1000,_id:'private-id'} as any,{status:'failed',lastAttemptAt:now},now-10000,undefined)!;
 assert.equal('_id' in next,false,'system/private fields do not enter persisted health values');
});

test('malformed evidence cannot be accepted as healthy monitoring',()=>{
 assert.equal(validMonitoringEvents(events),true);
 for(const rows of [[{...events[0],name:'unknown'}],[{...events[0],category:'unknown'}],[{...events[0],timestamp:NaN}],[{...events[0],sessionId:'raw-private-token'}],null])assert.equal(validMonitoringEvents(rows),false);
 assert.equal(validMonitoring({...evidence,sync:null}),false);
});

test('deferred native updates explicitly prevent a successful scan from certifying complete coverage',()=>{
 const pending={...evidence,sync:{...evidence.sync!,pendingUpdates:true}};
 const health=monitoringHealth({...input,evidence:pending});assert.equal(health.state,'Partial');assert.equal(health.canAssess,false);assert.match(health.message,/changed during the scan/);
 assert.equal(validMonitoring(pending),true);assert.equal(validMonitoring({...pending,sync:{...pending.sync,pendingUpdates:'true'}}),false);
 assert.equal(monitoringHealth({...input,evidence:{...pending,sync:{...pending.sync,pendingUpdates:false}}}).state,'Healthy');
});
