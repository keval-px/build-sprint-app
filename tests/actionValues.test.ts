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
 assert.equal(shipping.atRiskCents,60000);assert.equal(shipping.matchedSessions,1);
 assert.equal(shipping.recoveryCents,0);assert.equal(JSON.stringify(value).includes(id),false);
});
test('unmatched, recovered, foreign prices and outside dates do not increase action value',()=>{
 assert.equal(actionValues(events,null,[],[{...price,sessionId:'c'.repeat(64)}],'USD',0,20).combined.atRiskCents,0);
 assert.equal(actionValues(events,null,[],[{...price,recovered:true}],'USD',0,20).combined.atRiskCents,0);
 assert.equal(actionValues(events,null,[],[price],'USD',20,40).combined.eligibleSessions,0);
 assert.equal(actionValues(events,null,[],[{...price,currency:'EUR'}],'USD',0,20).combined.atRiskCents,0);
});
