import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRecommendations} from '../shared/recommendations.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const e=(id:string,t:number,category:CheckoutEvent['category'],blocker=false):CheckoutEvent=>({sessionId:id,eventId:`${id}-${t}`,timestamp:t,name:'alert_displayed',category,...(blocker?{shippingBlocker:'no_shipping_available' as const}:{})});
test('routine categories and repetition alone never create an actionable incident',()=>{
 const events:CheckoutEvent[]=['payment','validation','discount','inventory'].flatMap((category,i)=>[e('a',i+1,category as CheckoutEvent['category']),e('b',i+10,category as CheckoutEvent['category'])]);
 assert.deepEqual(buildRecommendations(events),[]);
 assert.deepEqual(buildRecommendations([e('a',1,'delivery'),e('b',2,'delivery')]),[]);
});
test('confirmed shipping blockers need distinct checkouts and exclude general alerts',()=>{
 assert.deepEqual(buildRecommendations([e('a',1,'delivery',true),e('a',2,'delivery',true)]),[]);
 const recommendations=buildRecommendations([e('a',1,'delivery',true),e('b',2,'delivery',true),e('c',3,'delivery')]);
 assert.equal(recommendations.length,1);assert.equal(recommendations[0].count,2);assert.deepEqual(recommendations[0].sessionIds,['a','b']);
 assert.match(recommendations[0].description,/does not confirm that those baskets should have been eligible/);
});
test('later completion removes a blocked checkout, but a subsequent blocker can qualify again',()=>{
 const events:CheckoutEvent[]=[e('a',1,'delivery',true),e('b',2,'delivery',true),{sessionId:'a',eventId:'complete',timestamp:3,name:'checkout_completed',category:null}];
 assert.deepEqual(buildRecommendations(events),[]);
 assert.equal(buildRecommendations([...events,e('a',4,'delivery',true)])[0].count,2);
});
test('a completion at the same moment as a shipping blocker counts as completed, not as no later purchase',()=>{
 const done=(id:string,t:number):CheckoutEvent=>({sessionId:id,eventId:`${id}-done`,timestamp:t,name:'checkout_completed',category:null});
 const events=[e('a',5,'delivery',true),e('b',5,'delivery',true),e('c',5,'delivery',true),done('c',5)];
 const shipping=buildRecommendations(events).find(m=>m.signal==='shipping_unavailable')!;
 assert.deepEqual(shipping.sessionIds.sort(),['a','b']);assert.equal(shipping.count,2);
});
