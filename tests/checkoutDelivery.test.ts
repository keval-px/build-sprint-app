import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverCheckoutEvent} from '../shared/checkoutDelivery.ts';
test('collector checks failed delivery and retries a transient refusal once with the same safe payload',async()=>{
 const bodies:unknown[]=[];let calls=0;
 const send=(async(_url:unknown,init:RequestInit)=>{bodies.push(init.body);calls++;return new Response('{}',{status:calls===1?503:200});}) as typeof fetch;
 assert.equal(await deliverCheckoutEvent('https://example.invalid',{eventId:'anonymous-fixture'},send),true);
 assert.equal(calls,2);assert.equal(bodies[0],bodies[1]);
});
test('collector never treats failed requests as success or retries capacity/validation refusals',async()=>{
 for(const status of [400,429,503]){
  let calls=0;const send=(async()=>{calls++;return new Response('{}',{status});}) as typeof fetch;
  assert.equal(await deliverCheckoutEvent('https://example.invalid',{},send),false);assert.equal(calls,status===503?2:1);
 }
 let calls=0;const network=(async()=>{calls++;throw Error('synthetic transport failure');}) as typeof fetch;
 assert.equal(await deliverCheckoutEvent('https://example.invalid',{},network),false);assert.equal(calls,2);
});
