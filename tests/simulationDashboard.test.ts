import test from 'node:test';
import assert from 'node:assert/strict';
import {simulationRecords,simulationBasketCents} from '../shared/simulationDashboard.ts';
import {simulate,HOUR} from '../local/simulation/model.ts';
import {summarize} from '../shared/evidence.ts';
import {abandonedSummary} from '../shared/abandonedSummary.ts';
import {orderPattern} from '../shared/orderPattern.ts';
test('simulation counts, chart and values reconcile without native Shopify records',()=>{
 const run=simulate(42,{start:Date.UTC(2026,9,13,11,30),hours:1});
 const events=run.events.map(e=>({...e,simulated:true as const,subtotalCents:simulationBasketCents(e.sessionId),currency:'USD' as const}));
 const now=run.start+2*HOUR;
 const raw={events:[...events,{...events[0],simulated:undefined,sessionId:'other',eventId:'other'}],store:'test',totalStored:999,enabled:true,truncated:false,sampledAt:now};
 const data={...raw,events},summary=summarize(data.events,{asOf:now}),records=simulationRecords(data.events,now);
 assert.equal(summary.started,run.hours[0].sessions);
 const totals=abandonedSummary(records.abandoned,run.start,now);
 assert.equal(totals.count,summary.noCompletionObserved);
 assert.equal(totals.totalCents,records.abandoned.reduce((n,r)=>n+r.totalCents!,0));
 const chart=orderPattern(records.orders,new Date(records.start).toISOString(),now,'Asia/Kolkata')!;
 assert.equal(chart.hours.reduce((n,h)=>n+(h.count??0),0),summary.completed);

 assert.equal(records.abandoned.length+records.orders.length,summary.started);
});
test('browser and generated sessions share the same totals and native prices',()=>{
 const run=simulate(42,{start:Date.UTC(2026,9,13,11,30),hours:1});
 const events=run.events.map(e=>({...e,simulated:true as const,subtotalCents:simulationBasketCents(e.sessionId),currency:'USD' as const}));
 const id='a'.repeat(64),now=run.start+2*HOUR;
 const browser={sessionId:id,eventId:'b'.repeat(64),name:'checkout_started' as const,timestamp:run.start,category:null};
 const data={events:[...events,browser],store:'test',totalStored:events.length+1,enabled:true,truncated:false,sampledAt:now,shopifySnapshot:{syncedAt:now,periodStart:new Date(run.start).toISOString(),orders:[],abandoned:[{recordHash:id,sessionId:id,createdAt:new Date(run.start).toISOString(),subtotalCents:2300,recovered:false}]}};
 const records=simulationRecords(data.events,now,data);
 assert.equal(records.orders.length+records.abandoned.length,run.hours[0].sessions+1);
 assert.equal(records.abandoned.find(r=>r.sessionId===id)?.totalCents,2300);
});
