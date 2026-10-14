import test from 'node:test';import assert from 'node:assert/strict';import {inventoryValue} from '../shared/inventoryValue.ts';import type {CheckoutEvent} from '../shared/evidence.ts';
const before:CheckoutEvent={eventId:'1',sessionId:'a',name:'checkout_started',timestamp:1,category:null,items:[{itemHash:'item',quantity:2,minor:120000,currency:'USD'}]};
const after:CheckoutEvent={eventId:'2',sessionId:'a',name:'checkout_started',timestamp:2,category:null,items:[]};
const alert:CheckoutEvent={eventId:'3',sessionId:'a',name:'alert_displayed',timestamp:3,category:'inventory'};
test('captures full line price before removal without multiplying quantity twice or counting duplicate sessions',()=>{
 assert.equal(inventoryValue([before,after,alert],['a','a'],'USD').totalMinor,120000);
 assert.equal(inventoryValue([before,after,alert],['a'],'USD').priced,1);
 assert.equal(inventoryValue([after,alert],['a'],'USD').totalMinor,null);
 assert.equal(inventoryValue([before,alert],['a'],'USD').totalMinor,null);
 assert.equal(inventoryValue([before,after,{...alert,timestamp:900002}],['a'],'USD').totalMinor,null);
 assert.equal(inventoryValue([before,after,alert,{...alert,eventId:'4',name:'checkout_completed',category:null,timestamp:4}],['a'],'USD').totalMinor,null);
});
test('never mixes currencies or uses an unrelated checkout conversion',()=>{
 const foreign={...before,items:[{...before.items![0],currency:'CAD'}]};
 assert.equal(inventoryValue([foreign,after,alert],['a'],'USD').totalMinor,null);
 const quote={sessionId:'a',shop:{minor:7500,currency:'USD'},buyer:{minor:10000,currency:'CAD'}};
 assert.equal(inventoryValue([foreign,after,alert],['a'],'USD',[quote]).totalMinor,90000);
});
test('a zero eligible subtotal can retain one observed line, but never guesses a mixed basket',()=>{
 const omitted={...after,items:undefined,subtotalCents:0,currency:'USD' as const};
 assert.equal(inventoryValue([before,omitted,alert],['a'],'USD').totalMinor,120000);
 const mixed={...before,items:[...before.items!,{...before.items![0],itemHash:'another'}]};
 assert.equal(inventoryValue([mixed,omitted,alert],['a'],'USD').totalMinor,null);
});
test('conversion rounds the checkout subtotal once, avoiding accumulated line-rounding errors',()=>{
 const lines={...before,items:[{itemHash:'one',quantity:1,minor:1,currency:'CAD'},{itemHash:'two',quantity:1,minor:1,currency:'CAD'}]};
 const quote={sessionId:'a',shop:{minor:1,currency:'USD'},buyer:{minor:2,currency:'CAD'}};
 assert.equal(inventoryValue([lines,after,alert],['a'],'USD',[quote]).totalMinor,1);
});
