import test from 'node:test';
import assert from 'node:assert/strict';
import {baselineCopy,baselineStateCopy,metricStatusCopy,fixOutcomeCopy,monitoringCopy} from '../src/dashboardCopy.ts';
import {orderPattern} from '../shared/orderPattern.ts';
import type {MonitoringHealth} from '../shared/monitoringHealth.ts';
import type {AppliedFix} from '../shared/fixTracking.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const now=Date.parse('2026-10-08T12:00:00Z');
const health:MonitoringHealth={state:'Healthy',canAssess:true,reasons:[],message:'current'};
const fix:AppliedFix={missionId:'delivery',appliedAt:now-60000,baseline:{checkouts:5,affected:2,completed:3},affectedIds:[],partial:false};
test('hourly copy distinguishes absent, partial and complete baseline without changing zero-order averages',()=>{
 const zero=orderPattern([], '2026-10-08T00:00:00Z',now)!;
 assert.match(baselineCopy(zero),/average will appear when a full day/);assert.ok(zero.hours.every(h=>h.average===null));
 const partial=orderPattern([], '2026-10-05T00:00:00Z',now)!;
 assert.match(baselineCopy(partial),/3 full days/);assert.match(baselineCopy(partial),/including hours with no orders/);assert.match(baselineStateCopy(partial),/3 of 30 full days/);assert.equal(partial.hours[0].average,0);
 const full=orderPattern([], '2026-09-08T00:00:00Z',now)!;assert.match(baselineCopy(full),/30 full days from the previous 30 days/);assert.doesNotMatch(baselineCopy(full),/Learning:/);
});
test('collapsed marker copy exposes pending, retest, returned and expired monitoring without claiming recovery',()=>{
 assert.match(fixOutcomeCopy(fix,[],now,health),/waiting for more checkout activity/);
 const events:CheckoutEvent[]=[1,2].map(n=>({sessionId:String(n).repeat(64),eventId:String(n),name:'checkout_started',timestamp:now-10000,category:null}));
 assert.match(fixOutcomeCopy({...fix,retestedAt:now-20000},events,now,health),/retest reported/);
 assert.match(fixOutcomeCopy(fix,events,now,health),/Result not verified/);
 assert.match(fixOutcomeCopy(fix,events,now,{...health,state:'Needs attention',canAssess:false}),/data is limited/);
 events.push({...events[0],eventId:'alert',name:'alert_displayed',category:'delivery',timestamp:now-5000});
 assert.match(fixOutcomeCopy(fix,events,now,health),/1 checkout had alerts after marking done/);
 assert.match(fixOutcomeCopy({...fix,partial:true},[],now,health),/result not verified/);
});
test('monitoring summary preserves first blocking reason and routes to complete safeguards',()=>{
 const limited={...health,state:'Partial' as const,canAssess:false,reasons:['History is incomplete.','Prices unavailable.']};
 assert.match(monitoringCopy(limited),/^History is incomplete/);assert.match(monitoringCopy(limited),/Outcomes are not assessed/);assert.match(monitoringCopy(limited),/monitoring details/);assert.match(monitoringCopy(health),/does not confirm/);
});

test('metric-local states retain limitations while full baseline removes methodology from the main chart',()=>{
 const full=orderPattern([], '2026-09-08T00:00:00Z',now)!;assert.equal(baselineStateCopy(full),'');
 assert.match(baselineStateCopy({...full,baselineDays:0}),/Learning/);
 assert.equal(baselineStateCopy({...full,baselineDays:8}),'Learning · 8 of 30 full days available');
 assert.equal(metricStatusCopy(health),'');
 assert.match(metricStatusCopy({...health,state:'Partial',canAssess:false}),/Partial data/);
 assert.match(metricStatusCopy({...health,state:'Needs attention',canAssess:false}),/not current/);
 assert.match(metricStatusCopy({...health,state:'Waiting',canAssess:false}),/Limited data/);
});
