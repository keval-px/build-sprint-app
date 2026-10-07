import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG_PLAN,modelCatalog,estimateCatalogImpact} from '../shared/catalog.ts';
import {buildMissions} from '../shared/actions.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const event=(id:string,name:CheckoutEvent['name'],timestamp:number,category:CheckoutEvent['category']=null):CheckoutEvent=>({eventId:id+timestamp,sessionId:id,name,timestamp,category});
test('verified-price basket mix sums to100 and models mostly one-board purchases',()=>{
 const model=modelCatalog(CATALOG_PLAN);
 assert.equal(model.modeledSalesCents,7551800);assert.equal(model.aovCents,75518);
 assert.equal(CATALOG_PLAN.baskets.filter(b=>b.items.length===1).reduce((sum,b)=>sum+b.weight,0),80);
 assert.equal(CATALOG_PLAN.baskets.filter(b=>b.items.filter(i=>i.productId!=='wax').reduce((sum,i)=>sum+i.quantity,0)===1).reduce((sum,b)=>sum+b.weight,0),92);
 assert.equal(CATALOG_PLAN.products.find(p=>p.id==='compare')?.priceCents,78595);
 assert.throws(()=>modelCatalog({...CATALOG_PLAN,baskets:CATALOG_PLAN.baskets.slice(1)}));
});
test('recovery excludes completed and unstarted sessions, and does not add overlapping groups',()=>{
 const events=[event('a','checkout_started',1),event('a','alert_displayed',2,'payment'),event('a','alert_displayed',3,'validation'),event('b','checkout_started',4),event('b','alert_displayed',5,'payment'),event('b','checkout_completed',6),event('c','alert_displayed',7,'validation')];
 const result=estimateCatalogImpact(events,buildMissions(events),CATALOG_PLAN);
 assert.equal(result.combined.eligibleSessions,1);assert.equal(result.combined.atRiskCents,75518);assert.equal(result.combined.recoveryCents,3776);
 assert.equal(result.actions.filter(action=>action.eligibleSessions>0).every(action=>action.recoveryCents===3776),true);
 assert.equal(estimateCatalogImpact([],buildMissions([]),CATALOG_PLAN).combined.recoveryCents,0);
});
