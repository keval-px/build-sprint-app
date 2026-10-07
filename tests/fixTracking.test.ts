import test from 'node:test';import assert from 'node:assert/strict';
import {fixBaseline,fixResults} from '../shared/fixTracking.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const at=100*86400000;
const e=(id:string,name:CheckoutEvent['name'],timestamp:number,category:CheckoutEvent['category']=null):CheckoutEvent=>({eventId:`${id}-${name}-${timestamp}`,sessionId:id,name,timestamp,category});
test('fix baseline captures distinct unfinished affected checkouts and excludes future or old data',()=>{
 const events=[e('old','checkout_started',at-31*86400000),e('old','alert_displayed',at-1,'payment'),e('a','checkout_started',at-100),e('a','alert_displayed',at-90,'payment'),e('a','alert_displayed',at-80,'payment'),e('b','checkout_started',at-100),e('b','alert_displayed',at-90,'payment'),e('b','checkout_completed',at-80),e('future','checkout_started',at+10)];
 const fix=fixBaseline(events,'payment',at);
 assert.deepEqual(fix.baseline,{checkouts:2,affected:2,completed:1});assert.deepEqual(fix.affectedIds,['a']);
});
test('old checkout completion is tracked without treating a reload as a new customer',()=>{
 const before=[e('a','checkout_started',at-100),e('a','alert_displayed',at-90,'delivery')];const fix=fixBaseline(before,'delivery',at);
 const events=[...before,e('a','checkout_started',at+1),e('a','checkout_completed',at+10),e('new','checkout_started',at+20),e('new','alert_displayed',at+21,'delivery'),e('new','alert_displayed',at+22,'delivery'),e('new','checkout_completed',at+30),e('other','checkout_completed',at+40)];
 const results=fixResults(fix,events,at+50);
 assert.equal(results.affectedCompleted,1);assert.equal(results.affectedTotal,1);assert.deepEqual(results.after,{checkouts:1,affected:1,completed:1});
});
test('fix results do not invent rates or purchases when nothing happened, and cap the window',()=>{
 const fix=fixBaseline([],'payment',at,true);assert.equal(fix.partial,true);
 assert.deepEqual(fixResults(fix,[],at+1).after,{checkouts:0,affected:0,completed:0});
 const results=fixResults(fix,[e('late','checkout_started',at+31*86400000)],at+32*86400000);assert.equal(results.ended,true);assert.equal(results.after.checkouts,0);
});
