import test from 'node:test';import assert from 'node:assert/strict';
import {fixBaseline,fixResults,retestResults,actionState} from '../shared/fixTracking.ts';
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

test('retest status is a team confirmation and recurrence counts distinct checkouts',()=>{
 const fix=fixBaseline([],'delivery',at);assert.equal(retestResults(fix,[],at+100),null);
 const checked={...fix,retestedAt:at+10};
 const events=[e('old','alert_displayed',at+9,'delivery'),e('a','alert_displayed',at+11,'delivery'),e('a','alert_displayed',at+12,'delivery'),e('b','alert_displayed',at+13,'payment'),e('future','alert_displayed',at+101,'delivery')];
 assert.deepEqual(retestResults(checked,events,at+100),{returned:1,lastAlert:at+12});
 assert.deepEqual(retestResults({...checked,retestedAt:at+20},events,at+100),{returned:0,lastAlert:null});
 assert.equal(checked.appliedAt,at);
});

test('completed actions reopen on new matching alerts, including resumed old checkouts',()=>{
 assert.deepEqual(actionState(undefined,[],at),{done:false,returned:0});
 const fix=fixBaseline([],'delivery',at);
 const events=[e('a','alert_displayed',at-1,'delivery'),e('other','alert_displayed',at+1,'payment')];
 assert.deepEqual(actionState(fix,events,at+100),{done:true,returned:0});
 events.push(e('a','alert_displayed',at+2,'delivery'),e('a','alert_displayed',at+3,'delivery'),e('future','alert_displayed',at+200,'delivery'));
 assert.deepEqual(actionState(fix,events,at+100),{done:false,returned:1});
 assert.deepEqual(actionState({...fix,retestedAt:at+4},events,at+100),{done:true,returned:0});
});

test('shipping-unavailable fix tracks the confirmed signal rather than unrelated delivery alerts',()=>{
 const events=[e('blocked','checkout_started',at-100),{...e('blocked','alert_displayed',at-90,'delivery'),shippingBlocker:'no_shipping_available' as const},e('general','checkout_started',at-100),e('general','alert_displayed',at-90,'delivery')];
 const fix=fixBaseline(events,'delivery',at,false,'shipping_unavailable');
 assert.deepEqual(fix.baseline,{checkouts:2,affected:1,completed:0});assert.deepEqual(fix.affectedIds,['blocked']);
 const later=[...events,e('general','alert_displayed',at+1,'delivery')];
 assert.deepEqual(actionState(fix,later,at+10),{done:true,returned:0});
 assert.deepEqual(retestResults({...fix,retestedAt:at},later,at+10),{returned:0,lastAlert:null});
 later.push({...e('blocked','alert_displayed',at+2,'delivery'),shippingBlocker:'no_shipping_available' as const});
 assert.deepEqual(actionState(fix,later,at+10),{done:false,returned:1});
});
