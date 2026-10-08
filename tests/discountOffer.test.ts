import test from 'node:test';import assert from 'node:assert/strict';
import {discountCodeHash,promisedDiscount} from '../shared/discountOffer.ts';
import {parseTestEvent,type CheckoutEvent} from '../shared/evidence.ts';
import {buildRecommendations} from '../shared/recommendations.ts';
const offer={code:'HEALTHCHECK10',codeHash:'a'.repeat(64),currency:'USD',minimumCents:50000,startsAt:100,endsAt:1000,verifiedAt:110};
test('only short codes in the actual discount field are hashed, never arbitrary buyer values',()=>{
 assert.ok(discountCodeHash('cart.discountCodes[0].code',' healthcheck10 '));
 assert.ok(discountCodeHash(undefined,'HEALTHCHECK10','Enter a valid discount code or gift card'));
 assert.equal(discountCodeHash(undefined,'HEALTHCHECK10','Please correct your email'),undefined);
 assert.equal(discountCodeHash('$.cart.discountCodes[0].code','HEALTHCHECK10'),discountCodeHash('cart.discountCodes','healthcheck10'));
 for(const target of ['cart.email','cart.giftCards','cart.discountCodesExtra'])assert.equal(discountCodeHash(target,'HEALTHCHECK10'),undefined);
 for(const value of ['buyer@example.com','123 Main St','x'.repeat(100),null])assert.equal(discountCodeHash('cart.discountCodes',value),undefined);
});
test('promised offer requires verified terms, same currency, spend, dates and no competing discount',()=>{
 assert.equal(promisedDiscount(offer,120,60000,'USD',0),'HEALTHCHECK10');
 for(const [at,amount,currency,count] of [[109,60000,'USD',0],[1000,60000,'USD',0],[120,49999,'USD',0],[120,60000,'EUR',0],[120,60000,'USD',1],[120,60000,'USD',undefined],[120,undefined,'USD',0]] as const)assert.equal(promisedDiscount(offer,at,amount,currency,count),undefined);
 assert.equal(promisedDiscount(undefined,120,60000,'USD',0),undefined);
});
const error=(id:string,code?:string):CheckoutEvent=>({eventId:id,sessionId:id,name:'alert_displayed',timestamp:120,category:'discount',...(code?{discountOfferCode:code}:{})});
test('two distinct verified-offer failures qualify; random codes, retries, unrelated codes and later completion do not',()=>{
 assert.deepEqual(buildRecommendations([error('a'),error('b')]),[]);
 assert.deepEqual(buildRecommendations([error('a','HEALTHCHECK10'),{...error('a','HEALTHCHECK10'),eventId:'retry'}]),[]);
 assert.deepEqual(buildRecommendations([error('a','HEALTHCHECK10'),error('b','OTHER')]),[]);
 const rows=[error('a','HEALTHCHECK10'),error('b','HEALTHCHECK10')];
 const card=buildRecommendations(rows)[0];assert.equal(card.id,'discount');assert.equal(card.count,2);assert.match(card.title,/HEALTHCHECK10/);
 assert.deepEqual(buildRecommendations([...rows,{...rows[0],eventId:'done',timestamp:121,name:'checkout_completed',category:null,discountOfferCode:undefined}]),[]);
});
test('clients cannot claim an offer was verified',()=>{
 const e={...error('a'),eventId:'a'.repeat(64),sessionId:'b'.repeat(64)};
 assert.ok(parseTestEvent({...e,discountCodeHash:'c'.repeat(64)},120));
 assert.equal(parseTestEvent({...e,discountOfferCode:'HEALTHCHECK10'},120),null);
});
