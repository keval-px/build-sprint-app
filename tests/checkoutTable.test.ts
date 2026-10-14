import test from 'node:test';import assert from 'node:assert/strict';
import {summarize,describeJourney,STORE,type CheckoutEvent} from '../shared/evidence.ts';
import {checkoutCohort} from '../shared/dateRange.ts';
import {checkoutTable} from '../shared/checkoutTable.ts';
import {checkoutCSV,exportRow} from '../shared/checkoutExport.ts';
import {basketPricer} from '../shared/basketValue.ts';
import {journeyLabel,journeyOrderHref} from '../shared/journeyLabel.ts';
import {lastObservedStep} from '../shared/dashboardInsights.ts';
import {prepareEvidence} from '../shared/evidenceResponse.ts';
const start=100000,end=200000,asOf=300000;
let serial=0;
const id=(n:number|string)=>String(n).padStart(64,'0');
const e=(session:number|string,name:CheckoutEvent['name'],timestamp:number,details:Partial<CheckoutEvent>={}):CheckoutEvent=>({eventId:String(++serial).padStart(64,'f'),sessionId:id(session),name,timestamp,category:null,...details});
const events:CheckoutEvent[]=[];
for(let i=0;i<20;i++){
 events.push(e(i,'checkout_started',start+i*100,i%4===0?{simulated:true,subtotalCents:1000+i,currency:'USD'}:{}));
 if(i%3===0)events.push(e(i,'alert_displayed',start+i*100+10,{category:'delivery',...(i%6===0?{shippingBlocker:'no_shipping_available' as const}:{})}));
 if(i%2===0)events.push(e(i,'checkout_contact_info_submitted',start+i*100+20));
 if(i%5===0)events.push(e(i,'alert_displayed',start+i*100+25,{category:'validation'}));
 if(i%7===0)events.push(e(i,'checkout_completed',start+i*100+40));
}
events.push(e('before','checkout_started',start-1),e(1,'checkout_completed',asOf+1));
const orders=[{sessionId:id(3),orderName:'#1001',orderId:'55',createdAt:new Date(start+400).toISOString(),paid:true,cancelled:false,test:true,recordHash:'o',subtotalCents:5000,totalCents:5200}];
const abandoned=[{sessionId:id(2),createdAt:new Date(start+300).toISOString(),subtotalCents:2500,totalCents:2600,recovered:false,recordHash:'a'}];
const facts={orders,prices:[],asOf},pricing={currency:'USD',orders,abandoned,prices:[]};

test('table rows match what the page built from events',()=>{
 const table=checkoutTable(events,facts,{start,end},pricing);
 const journeys=summarize(checkoutCohort(events,{start,end}),facts).journeys.reverse(),price=basketPricer(pricing);
 assert.equal(table.rows.length,20);
 assert.deepEqual(table.rows.map(r=>r.id),journeys.map(j=>j.id));
 for(const [i,row] of table.rows.entries()){
  const j=journeys[i],sessionOrders=orders.filter(o=>o.sessionId===j.id);
  assert.deepEqual(
   [row.label,row.label.startsWith('Order ')?row.label:`#${row.id}`,row.orderHref,row.startedAt,row.completed,row.categories,row.lastStep,row.shippingBlocker,row.basketCents,row.eventCount],
   [journeyLabel(j.id,sessionOrders),journeyLabel(j.id,sessionOrders,true),journeyOrderHref(j.id,sessionOrders),j.events[0].timestamp,j.completed,describeJourney(j.events).categories,lastObservedStep(j.events),j.events.some(x=>x.shippingBlocker==='no_shipping_available'),price(j),j.events.length],j.id);
 }
 const paid=table.rows.find(r=>r.id===id(3))!;
 assert.deepEqual([paid.label,paid.orderHref,paid.completed,paid.outcomeText],['Order #1001','shopify://admin/orders/55',true,'Completed · paid order']);
 assert.equal(table.rows.find(r=>r.id===id(1))!.completed,false);// completion after the read time is not counted
 assert.equal(table.rows.find(r=>r.id===id(2))!.basketCents,2600);// Shopify's abandoned-checkout total
});

test('checkouts CSV is the same from table rows as from events',()=>{
 const table=checkoutTable(events,facts,{start,end},pricing);
 const journeys=summarize(checkoutCohort(events,{start,end}),facts).journeys.reverse(),price=basketPricer(pricing);
 const fromEvents=journeys.map(j=>exportRow({id:j.id,label:journeyLabel(j.id,orders.filter(o=>o.sessionId===j.id)),startedAt:j.events[0].timestamp,completed:j.completed,outcome:j.outcome,basketCents:price(j),events:j.events}));
 assert.equal(checkoutCSV(table.rows,'USD'),checkoutCSV(fromEvents,'USD'));
});

test('evidence responses accept a valid table and reject malformed rows',()=>{
 const base={store:STORE,events:[],enabled:true,sampledAt:asOf,totalStored:0,truncated:false};
 const table=checkoutTable(events,facts,{start,end},pricing);
 assert.equal(prepareEvidence({...base,table},STORE).table?.rows.length,20);
 assert.throws(()=>prepareEvidence({...base,table:{...table,rows:[{...table.rows[0],id:'not-a-session'}]}},STORE));
 assert.throws(()=>prepareEvidence({...base,table:{...table,rows:[{...table.rows[0],categories:['unknown']}]}},STORE));
 assert.throws(()=>prepareEvidence({...base,table:{...table,rows:[{...table.rows[0],basketCents:-1}]}},STORE));
});
