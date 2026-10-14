import test from 'node:test';import assert from 'node:assert/strict';
import {summarize,type CheckoutEvent} from '../shared/evidence.ts';
import {checkoutCohort} from '../shared/dateRange.ts';
import {checkoutFunnel,funnelFilters} from '../shared/checkoutFunnel.ts';
import {overviewSummary} from '../shared/overviewSummary.ts';
import {prepareEvidence} from '../shared/evidenceResponse.ts';
import {STORE} from '../shared/evidence.ts';
const start=100000,end=200000,asOf=300000;
let serial=0;
const id=(n:number|string)=>String(n).padStart(64,'0');
const e=(session:number|string,name:CheckoutEvent['name'],timestamp:number,details:Partial<CheckoutEvent>={}):CheckoutEvent=>({eventId:String(++serial).padStart(64,'f'),sessionId:id(session),name,timestamp,category:null,...details});
const events:CheckoutEvent[]=[];
for(let i=0;i<40;i++){
 const device=i%4===0?'mobile':i%4===1?'desktop':i%4===2?'tablet':undefined;
 events.push(e(i,'checkout_started',start+i*100,device?{deviceClass:device}:{}));
 if(i%2===0)events.push(e(i,'checkout_contact_info_submitted',start+i*100+10));
 if(i%3===0)events.push(e(i,'checkout_shipping_info_submitted',start+i*100+20));
 if(i%5===0)events.push(e(i,'alert_displayed',start+i*100+25,{category:'payment'}));
 if(i%6===0)events.push(e(i,'payment_info_submitted',start+i*100+30));
 if(i%7===0)events.push(e(i,'checkout_completed',start+i*100+40,i%14===0?{expressPay:true}:{}));
}
// Duplicate delivery, a session outside the dates, an orphan completion and a future event.
events.push({...events[0]},e('before','checkout_started',start-1),e('before','checkout_completed',start+5),e('orphan','checkout_completed',start+50),e(1,'checkout_completed',asOf+1));
// A paid order completes session 3 even though the browser never recorded it.
const facts={orders:[{sessionId:id(3),createdAt:new Date(start+400).toISOString(),paid:true}],prices:[],asOf};

test('overview summary matches the browser calculation for the same dates and facts',()=>{
 const cohort=checkoutCohort(events,{start,end}),expected=summarize(cohort,facts);
 const result=overviewSummary(events,facts,{start,end});
 assert.deepEqual({sessionCount:result.sessionCount,completed:result.completed,noCompletionObserved:result.noCompletionObserved,eventCount:result.eventCount},
  {sessionCount:expected.sessionCount,completed:expected.completed,noCompletionObserved:expected.noCompletionObserved,eventCount:expected.eventCount});
 assert.equal(result.completed,7);// six browser completions plus the paid order
 for(const filter of funnelFilters){
  const browser=checkoutFunnel(cohort,facts,filter);
  const server=result.funnels[filter];
  assert.deepEqual(server.rows,browser.rows.map(({label,count,percent,drop})=>({label,count,percent,drop})),filter);
  assert.deepEqual([server.count,server.total,server.unknownDevice,server.completed],[browser.count,browser.total,browser.unknownDevice,browser.completed],filter);
 }
 assert.deepEqual([result.rangeStart,result.rangeEnd],[start,end]);
});

test('overview summary carries counts only, never session identities',()=>{
 const json=JSON.stringify(overviewSummary(events,facts,{start,end}));
 assert.ok(!/[0-9a-f]{64}/.test(json));
});

test('empty dates give zero counts without NaN',()=>{
 const result=overviewSummary(events,facts,{start:end+1000,end:end+2000});
 assert.deepEqual([result.sessionCount,result.completed,result.noCompletionObserved,result.eventCount],[0,0,0,0]);
 assert.ok(result.funnels.all.rows.every(r=>r.percent===0&&r.drop===null));
});

test('evidence responses accept a valid overview and reject a malformed one',()=>{
 const base={store:STORE,events:[],enabled:true,sampledAt:asOf,totalStored:0,truncated:false};
 const overview=overviewSummary([],{},{start,end});
 assert.deepEqual(prepareEvidence({...base,overview},STORE).overview,overview);
 assert.throws(()=>prepareEvidence({...base,overview:{...overview,completed:-1}},STORE));
 assert.throws(()=>prepareEvidence({...base,overview:{...overview,funnels:{all:overview.funnels.all}}},STORE));
 assert.equal(prepareEvidence(base,STORE).overview,undefined);
});
