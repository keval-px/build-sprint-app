import test from 'node:test';
import assert from 'node:assert/strict';
import {basketPricer,type BasketSources} from '../shared/basketValue.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const id='checkout';
const events:CheckoutEvent[]=[{eventId:'event',sessionId:id,name:'checkout_started',timestamp:100,category:null,subtotalCents:74995,currency:'USD'}];
const priced=(sources:Partial<BasketSources>,completed:boolean,rows:CheckoutEvent[]=[])=>basketPricer({currency:'USD',...sources})({id,completed,events:rows});
const price=(over:object={})=>({sessionId:id,currency:'USD',createdAt:'2026-10-01T00:00:00.000Z',updatedAt:Date.parse('2026-10-01T00:05:00.000Z'),subtotalCents:74995,totalCents:77995,recovered:false,...over});
test('unique Shopify totals take precedence over browser subtotals, including zero',()=>{
 const basket={sessionId:id,subtotalCents:74995,totalCents:77995,recovered:false};
 assert.equal(priced({abandoned:[basket]},false,events),77995);
 assert.equal(priced({orders:[basket]},true,events),77995);
 assert.equal(priced({abandoned:[{...basket,totalCents:0}]},false,events),0);
});
test('unrelated, recovered, and ambiguous baskets never establish a price match',()=>{
 const basket={sessionId:id,subtotalCents:60000,totalCents:60000,recovered:false};
 assert.equal(priced({abandoned:[{...basket,sessionId:'other'}]},false),undefined);
 assert.equal(priced({abandoned:[{...basket,recovered:true}]},false),undefined);
 assert.equal(priced({abandoned:[basket,basket]},false),undefined);
 assert.equal(priced({abandoned:[basket]},true),undefined);
});
test('old matched orders use their subtotal; browser fallback excludes alerts and other currencies',()=>{
 assert.equal(priced({orders:[{sessionId:id,subtotalCents:60000}]},true),60000);
 assert.equal(priced({},false,events),74995);
 assert.equal(basketPricer({currency:'CAD'})({id,completed:false,events}),undefined);
 assert.equal(priced({},false,[{...events[0],name:'alert_displayed'}]),undefined);
});
test('signed prices replace the abandoned record for their session and are completion totals until the order syncs',()=>{
 assert.equal(priced({abandoned:[{sessionId:id,subtotalCents:1,totalCents:1,recovered:false}],prices:[price()]},false),77995);
 assert.equal(priced({prices:[price({recovered:true,completedAt:Date.parse('2026-10-01T00:05:00.000Z')})]},true),77995);
 assert.equal(priced({orders:[{sessionId:id,subtotalCents:80000,totalCents:83000}],prices:[price({recovered:true})]},true),83000);
 assert.equal(priced({prices:[price({recovered:true})]},false),undefined);
 assert.equal(priced({prices:[price({currency:'EUR'})]},false),undefined);
});
test('old demo records price unfinished checkouts only when unrecovered and in the store currency',()=>{
 const legacy={sessionId:id,subtotalCents:5000,currency:'USD',recovered:false};
 assert.equal(priced({legacy:[legacy]},false),5000);
 assert.equal(priced({legacy:[legacy]},true),undefined);
 assert.equal(priced({legacy:[{...legacy,recovered:true}]},false),undefined);
 assert.equal(priced({legacy:[{...legacy,currency:'EUR'}]},false),undefined);
 assert.equal(priced({legacy:[{...legacy,sessionId:null}]},false),undefined);
 assert.equal(priced({legacy:[legacy,legacy]},false),undefined);
});
