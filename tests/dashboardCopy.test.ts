import test from 'node:test';
import assert from 'node:assert/strict';
import {baselineCopy,fixOutcomeCopy as outcomeCopy} from '../src/dashboardCopy.ts';
import {fixResults,actionState,type AppliedFix as Fix} from '../shared/fixTracking.ts';
import type {MonitoringHealth as Health} from '../shared/monitoringHealth.ts';
import type {CheckoutEvent as Event} from '../shared/evidence.ts';
// Results worked out from events, as the server does before the card copy is chosen.
const fixOutcomeCopy=(fix:Fix,events:Event[],now:number,health:Health)=>outcomeCopy(fix,fixResults(fix,events,now),actionState(fix,events,now).returned,health);
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
 assert.match(baselineCopy(partial),/3 full days/);assert.match(baselineCopy(partial),/including hours with no orders/);assert.equal(partial.hours[0].average,0);
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

