import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,snapshot,START,HOUR} from '../local/simulation/model.ts';
const run=simulate();
test('repeatable hourly simulation stays within requested volume and balances devices',()=>{
 assert.deepEqual(simulate(),run);
 assert.notDeepEqual(simulate(43).hours,run.hours);
 for(const h of run.hours){
  assert.ok(h.sessions>=90&&h.sessions<=120);
  assert.equal(h.completed+h.abandoned,h.sessions);
  const starts=new Map(run.events.filter(e=>e.name==='checkout_started'&&e.timestamp>=START+(h.hour-1)*HOUR&&e.timestamp<START+h.hour*HOUR).map(e=>[e.sessionId,e]));
  assert.equal(starts.size,h.sessions);
  const mobile=[...starts.values()].filter(e=>e.deviceClass==='mobile').length;
  assert.ok(Math.abs(mobile-(h.sessions-mobile))<=1);
 }
});
test('production insight rules detect the controlled problems and clear after recovery',()=>{
 assert.deepEqual(snapshot(run,6).trends.map(t=>t.state),['stable','stable','stable']);
 assert.deepEqual(snapshot(run,9).trends.map(t=>t.state),['review','stable','review']);
 assert.equal(snapshot(run,15).trends[1].state,'review');
 assert.deepEqual(snapshot(run,24).trends.map(t=>t.state),['stable','stable','stable']);
 assert.ok(snapshot(run,9,false).trends.every(t=>t.state==='collecting'&&t.sessionIds.length===0));
});
test('duplicate deliveries do not inflate counts; replay does not leak later sessions',()=>{
 const s=snapshot(run,9);
 assert.equal(s.summary.sessions,run.hours.slice(0,9).reduce((n,h)=>n+h.sessions,0));
 assert.equal(s.summary.completed,run.hours.slice(0,9).reduce((n,h)=>n+h.completed,0));
 const unique={...run,events:[...new Map(run.events.map(e=>[e.eventId,e])).values()]};
 assert.deepEqual(snapshot(unique,9),s);
 assert.throws(()=>snapshot(run,25));
});
test('future batches target 70% abandonment and 30% error sessions with realistic stage ordering',()=>{
 for(const seed of [1,42,500]){
  const sample=simulate(seed);
  for(const h of sample.hours){
   assert.ok(h.abandoned/h.sessions>=.65);
   if(h.phase==='Normal activity'||h.phase==='Recovery')assert.ok(h.abandoned/h.sessions<=.72);
   assert.ok(Math.abs(h.errorSessions/h.sessions-.30)<.01);
  }
  const unique=[...new Map(sample.events.map(e=>[e.eventId,e])).values()];
  assert.deepEqual([...new Set(unique.filter(e=>e.category).map(e=>e.category))].sort(),['delivery','discount','extension','inventory','payment','validation']);
  const sessions=Map.groupBy(unique,e=>e.sessionId);
  let recovered=0,quietExits=0;
  for(const rows of sessions.values()){
   const error=rows.find(e=>e.category),complete=rows.find(e=>e.name==='checkout_completed');
   if(error&&complete){assert.ok(error.timestamp<complete.timestamp);recovered++;}
   if(!error&&!complete)quietExits++;
   for(const payment of rows.filter(e=>e.category==='payment'))assert.ok(rows.some(e=>e.name==='payment_info_submitted'&&e.timestamp<payment.timestamp));
   if(error?.shippingBlocker&&!complete)assert.ok(!rows.some(e=>e.name==='checkout_shipping_info_submitted'||e.name==='payment_info_submitted'));
  }
  assert.ok(recovered>0&&quietExits>0);
 }
});
