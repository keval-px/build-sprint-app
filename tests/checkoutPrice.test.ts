import {journeyPrice} from '../shared/journeyPrice.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutPrice,shouldSaveCheckoutPrice,savedCheckoutSession,checkoutBaskets} from '../shared/checkoutPrice.ts';
import {checkoutIdentity} from '../shared/checkoutIdentity.ts';
const fixture={token:'synthetic-test-token',currency:'USD',created_at:'2026-10-07T10:00:00Z',updated_at:'2026-10-07T10:02:00Z',subtotal_price:'749.95',total_price:'779.95',completed_at:null};
test('signed-checkout parser retains only token hash, dates, prices and completion',()=>{
 const price=checkoutPrice({...fixture,email:'synthetic@example.invalid',customer:{name:'Unit'},abandoned_checkout_url:'private'});
 assert.deepEqual(price,{sessionId:checkoutIdentity(fixture.token),currency:'USD',createdAt:'2026-10-07T10:00:00.000Z',updatedAt:Date.parse(fixture.updated_at),subtotalCents:74995,totalCents:77995,recovered:false});
 assert.equal(checkoutPrice({...fixture,total_price:'0.00'})?.totalCents,0);
 assert.equal(checkoutPrice({...fixture,total_price:null})?.totalCents,null);
 assert.equal(checkoutPrice({...fixture,currency:'JPY',subtotal_price:'500',total_price:'600'})?.totalCents,600);
 for(const bad of [{token:''},{updated_at:'invalid'},{completed_at:undefined},{total_price:'1.001'},{currency:'FAKE'},{updated_at:'2026-10-06'}])assert.equal(checkoutPrice({...fixture,...bad}),null);
});
test('duplicates and delayed deliveries cannot overwrite newer prices or undo completion',()=>{
 const old=checkoutPrice(fixture)!;
 assert.equal(shouldSaveCheckoutPrice(null,old),true);
 assert.equal(shouldSaveCheckoutPrice(old,{...old,totalCents:5}),false);
 assert.equal(shouldSaveCheckoutPrice(old,{...old,updatedAt:old.updatedAt-1}),false);
 assert.equal(shouldSaveCheckoutPrice(old,{...old,updatedAt:old.updatedAt+1,totalCents:0}),true);
 assert.equal(shouldSaveCheckoutPrice({...old,recovered:true},old),false);
 assert.equal(shouldSaveCheckoutPrice({...old,recovered:true},{...old,updatedAt:old.updatedAt+1}),false);
 assert.equal(shouldSaveCheckoutPrice(old,{...old,recovered:true}),true);
});
test('historical links require exactly the same saved record hash; new prices replace without double counting',()=>{
 const price=checkoutPrice(fixture)!;
 const saved={recordHash:'existing-native-hash',sessionId:price.sessionId,subtotalCents:1,recovered:false};
 assert.equal(savedCheckoutSession(saved.recordHash,[saved]),price.sessionId);
 assert.equal(savedCheckoutSession('unrelated',[saved]),undefined);
 assert.equal(savedCheckoutSession(saved.recordHash,[saved,saved]),undefined);
 const result=checkoutBaskets([saved,{...saved,sessionId:'unrelated'}],[price],'USD');
 assert.equal(result.length,2);assert.equal(result.find(r=>r.sessionId===price.sessionId)?.subtotalCents,74995);
 assert.equal(checkoutBaskets([saved],[price],'EUR')[0],saved);
});

test('a completed checkout uses its signed total until its matched order is synced',()=>{
 const price=checkoutPrice({...fixture,completed_at:fixture.updated_at})!;
 assert.equal(journeyPrice(price.sessionId,true,[],'USD',[],[],[],[price]),77995);
 assert.equal(journeyPrice(price.sessionId,true,[],'USD',[{sessionId:price.sessionId,subtotalCents:80000,totalCents:83000}],[],[],[price]),83000);
 assert.equal(journeyPrice(price.sessionId,false,[],'USD',[],[],[],[price]),undefined);
});
