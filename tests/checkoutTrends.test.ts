import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutTrends} from '../shared/checkoutTrends.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const H=3600000,now=100*H,range={start:0,end:now};
function cohort(prefix:number,start:number,n:number,completed:number,device:'mobile'|'desktop',shipping=true){
 const rows:CheckoutEvent[]=[];
 for(let i=0;i<n;i++){
  const sessionId=(prefix+i).toString(16).padStart(64,'0');
  const add=(name:CheckoutEvent['name'],timestamp:number)=>rows.push({sessionId,eventId:`${sessionId}-${name}`,name,timestamp,category:null,deviceClass:device});
  add('checkout_started',start+i);
  if(shipping)add('checkout_shipping_info_submitted',start+i+1000);
  if(i<completed){add('payment_info_submitted',start+i+2000);add('checkout_completed',start+i+3000);}
 }
 return rows;
}
test('device gaps and shipping stops create separate actionable insights',()=>{
 const events=[...cohort(1,10*H,20,18,'desktop'),...cohort(100,60*H,20,8,'mobile')];
 const results=checkoutTrends(events,{asOf:now},range,true,now);
 assert.deepEqual(results.map(r=>r.id),['device-gap','shipping-drop']);
 assert.deepEqual(results.map(r=>r.state),['review','review']);
 assert.equal(results[1].current.count,12);assert.equal(results[1].comparison.count,2);
 assert.equal(results[0].sessionIds.length,12);
 assert.equal(new Set(results[1].sessionIds).size,12);
 assert.deepEqual(checkoutTrends([...events,...events],{asOf:now},range,true,now),results);
});
test('low volume and unhealthy history cannot trigger warnings',()=>{
 const events=[...cohort(1,10*H,19,19,'desktop'),...cohort(100,60*H,19,0,'mobile')];
 assert.ok(checkoutTrends(events,{},range,true,now).every(r=>r.state==='collecting'&&!r.sessionIds.length));
 const enough=[...cohort(1,10*H,20,20,'desktop'),...cohort(100,60*H,20,0,'mobile')];
 assert.ok(checkoutTrends(enough,{},range,false,now).every(r=>r.state==='collecting'));
});
test('recent starts and completions outside the one-hour observation window do not distort comparison',()=>{
 const events=[...cohort(1,10*H,20,10,'desktop'),...cohort(100,60*H,20,10,'mobile'),...cohort(200,99.5*H,50,0,'mobile')];
 const late=events.find(e=>e.sessionId===(115).toString(16).padStart(64,'0'))!;
 events.push({...late,name:'checkout_completed',eventId:'late',timestamp:late.timestamp+2*H});
 const results=checkoutTrends(events,{},range,true,now);
 assert.ok(results.every(r=>r.state==='stable'));
 // Mobile checkouts: the late completion falls outside the one-hour window.
 assert.deepEqual(results[0].current,{count:10,total:20});
});
test('server completion within the window prevents a false shipping drop-off',()=>{
 const events=[...cohort(1,10*H,20,10,'desktop'),...cohort(100,60*H,20,10,'mobile')];
 const sessionId=(115).toString(16).padStart(64,'0');
 const r=checkoutTrends(events,{orders:[{sessionId,paid:true,createdAt:new Date(60*H+2000).toISOString()}]},range,true,now);
 assert.equal(r[0].current.count,11);assert.equal(r[1].current.count,9);
});
test('unknown and conflicting devices are excluded and shipping skips are not losses',()=>{
 const events=[...cohort(1,10*H,20,10,'desktop'),...cohort(100,60*H,20,10,'mobile',false)];
 events.push({...events[0],eventId:'conflict',deviceClass:'mobile'});
 const r=checkoutTrends(events,{},range,true,now);
 assert.equal(r[0].comparison.total,19);assert.equal(r[0].state,'collecting');
 assert.equal(r[1].current.total,0);assert.equal(r[1].state,'collecting');
});
