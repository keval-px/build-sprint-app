import test from 'node:test';
import assert from 'node:assert/strict';
import {observedAverageOrderValue} from '../shared/purchases.ts';
import type {ObservedPurchases} from '../shared/purchases.ts';
import {CATALOG_PLAN,estimateCatalogImpact} from '../shared/catalog.ts';
import {buildMissions} from '../shared/actions.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
// Isolated unit fixture; not an imported order or seeded checkout event.
const snapshot:ObservedPurchases={store:'build-sprint-demo.myshopify.com',currency:'USD',source:'shopify-admin-csv-test-orders',importedOn:'2026-10-06',periodStart:'2026-10-05',periodEnd:'2026-10-05',orderCount:3,totalProductCents:240000,baskets:[{label:'1 × board',orderCount:2,itemCount:1,totalProductCents:120000},{label:'2 × board',orderCount:1,itemCount:2,totalProductCents:120000}]};
test('observed order value uses order counts rather than averaging basket groups',()=>{
 assert.equal(observedAverageOrderValue(snapshot),80000);
 assert.throws(()=>observedAverageOrderValue({...snapshot,orderCount:4}));
 assert.throws(()=>observedAverageOrderValue({...snapshot,totalProductCents:100}));
 assert.throws(()=>observedAverageOrderValue({...snapshot,orderCount:0,baskets:[]}));
});
test('observed purchases take precedence while missing purchases retain labeled catalog fallback',()=>{
 const events:CheckoutEvent[]=[{eventId:'1',sessionId:'a',name:'checkout_started',timestamp:1,category:null}];
 const missions=buildMissions(events);
 assert.equal(estimateCatalogImpact(events,missions,CATALOG_PLAN,snapshot).aovCents,80000);
 assert.equal(estimateCatalogImpact(events,missions,CATALOG_PLAN,snapshot).combined.recoveryCents,4000);
 assert.equal(estimateCatalogImpact(events,missions,CATALOG_PLAN,null).aovCents,75518);
});
