import test from 'node:test';
import assert from 'node:assert/strict';
import {actionValues} from '../shared/actionValues.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
import type {CheckoutPrice} from '../shared/checkoutPrice.ts';
const id='a'.repeat(64),other='b'.repeat(64);
const events:CheckoutEvent[]=[id,other].flatMap((sessionId,i)=>[{sessionId,eventId:`start-${i}`,timestamp:10,name:'checkout_started' as const,category:null},{sessionId,eventId:`alert-${i}`,timestamp:12,name:'alert_displayed' as const,category:'delivery' as const,shippingBlocker:'no_shipping_available' as const}]);
const price:CheckoutPrice={sessionId:id,currency:'USD',createdAt:new Date(10).toISOString(),updatedAt:15,subtotalCents:60000,totalCents:62000,recovered:false};
test('public actionable totals use exact prices without exposing checkout identities',()=>{
 const value=actionValues(events,null,[],[price],'USD',0,20);
 const shipping=value.actions.find(a=>a.id==='delivery')!;
 assert.equal(shipping.totalCents,null);assert.equal(shipping.matchedSessions,1);
 assert.equal(shipping.unknownSessions,1);assert.equal(JSON.stringify(value).includes(id),false);
});
test('unmatched, recovered, foreign prices and outside dates do not increase action value',()=>{
 assert.equal(actionValues(events,null,[],[{...price,sessionId:'c'.repeat(64)}],'USD',0,20).combined.totalCents,null);
 assert.equal(actionValues(events,null,[],[{...price,recovered:true}],'USD',0,20).combined.totalCents,null);
 assert.equal(actionValues(events,null,[],[price],'USD',20,40).combined.eligibleSessions,0);
 assert.equal(actionValues(events,null,[],[{...price,currency:'EUR'}],'USD',0,20).combined.totalCents,null);
});
test('affected basket total matches table totals including shipping, preserving zero',()=>{
 const otherPrice={...price,sessionId:other,subtotalCents:0,totalCents:0};
 assert.equal(actionValues(events,null,[],[price,otherPrice],'USD',0,20).combined.totalCents,62000);
});
test('ambiguous exact matches do not become a guessed total',()=>{
 const records=[{recordHash:'one',sessionId:id,subtotalCents:60000,totalCents:62000},{recordHash:'two',sessionId:id,subtotalCents:60000,totalCents:62000}];
 assert.equal(actionValues(events,null,records,[],'USD',0,20).combined.totalCents,null);
});
test('signed completion suppresses stale legacy and browser exposure prices',()=>{
 const legacy={importedOn:'',emailSent:0,emailNotSent:0,records:[{recordHash:'old',sessionId:id,subtotalCents:60000,currency:'USD' as const,recovered:false}]};
 const priced=events.map(e=>e.sessionId===id&&e.name==='checkout_started'?{...e,subtotalCents:60000,currency:'USD' as const}:e);
 const value=actionValues(priced,legacy,[],[{...price,recovered:true}],'USD',0,20);
 assert.equal(value.combined.eligibleSessions,1);assert.equal(value.combined.matchedSessions,0);assert.equal(value.combined.totalCents,null);
});
