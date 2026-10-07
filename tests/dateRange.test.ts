import test from 'node:test';
import assert from 'node:assert/strict';
import {recentRange,dateBounds,checkoutCohort} from '../shared/dateRange.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
test('calendar ranges default to thirty inclusive local dates and reject invalid selections',()=>{
 assert.equal(recentRange(30,new Date(2026,9,6,12)),'2026-09-07--2026-10-06');
 assert.throws(()=>dateBounds('2026-02-30--2026-03-01'));
 assert.throws(()=>dateBounds('2026-10-06--2026-10-05'));
});
test('date filtering selects checkout starts while retaining later completion evidence',()=>{
 const at=dateBounds('2026-10-05--2026-10-05');
 const event=(id:string,name:CheckoutEvent['name'],timestamp:number):CheckoutEvent=>({eventId:id+name,sessionId:id,name,timestamp,category:null});
 const selected=checkoutCohort([event('before','checkout_started',at.start-1),event('a','checkout_started',at.start),event('a','checkout_completed',at.end+1),event('after','checkout_started',at.end)],'2026-10-05--2026-10-05');
 assert.equal(selected.length,2);assert.equal(selected[1].name,'checkout_completed');
});
