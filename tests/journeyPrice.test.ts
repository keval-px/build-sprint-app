import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyPrice} from '../shared/journeyPrice.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const id='checkout';
const events:CheckoutEvent[]=[{eventId:'event',sessionId:id,name:'checkout_started',timestamp:100,category:null,subtotalCents:74995,currency:'USD'}];
test('unique Shopify totals take precedence over browser subtotals, including zero',()=>{
 const basket={sessionId:id,subtotalCents:74995,totalCents:77995,recovered:false};
 assert.equal(journeyPrice(id,false,events,'USD',[],[basket]),77995);
 assert.equal(journeyPrice(id,true,events,'USD',[basket],[]),77995);
 assert.equal(journeyPrice(id,false,events,'USD',[],[{...basket,totalCents:0}]),0);
});
test('unrelated, recovered, and ambiguous baskets never establish a price match',()=>{
 const basket={sessionId:id,subtotalCents:60000,totalCents:60000,recovered:false};
 assert.equal(journeyPrice(id,false,[],'USD',[],[{...basket,sessionId:'other'}]),undefined);
 assert.equal(journeyPrice(id,false,[],'USD',[],[{...basket,recovered:true}]),undefined);
 assert.equal(journeyPrice(id,false,[],'USD',[],[basket,basket]),undefined);
 assert.equal(journeyPrice(id,true,[],'USD',[],[basket]),undefined);
});
test('old matched orders use their subtotal; browser fallback excludes alerts and other currencies',()=>{
 assert.equal(journeyPrice(id,true,[],'USD',[{sessionId:id,subtotalCents:60000}],[]),60000);
 assert.equal(journeyPrice(id,false,events,'USD',[],[]),74995);
 assert.equal(journeyPrice(id,false,events,'CAD',[],[]),undefined);
 assert.equal(journeyPrice(id,false,[{...events[0],name:'alert_displayed'}],'USD',[],[]),undefined);
});
