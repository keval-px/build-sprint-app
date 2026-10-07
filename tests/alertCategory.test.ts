import test from 'node:test';import assert from 'node:assert/strict';import {alertCategory,shippingBlocker} from '../shared/alertCategory.ts';
test('discount field validation is classified by safe context, without storing its value',()=>{
 assert.equal(alertCategory('INPUT_INVALID',undefined,'Enter a valid discount code or gift card'),'discount');
 assert.equal(alertCategory('INPUT_INVALID','cart.discountCodes[0]'),'discount');
 assert.equal(alertCategory('INPUT_INVALID','$.cart.discountCodes[0].code'),'discount');
 assert.equal(alertCategory('INPUT_INVALID',undefined,'Enter a valid discount code.'),'discount');
 assert.equal(alertCategory('INPUT_INVALID','cart.deliveryGroups[0].deliveryAddress.address1','Address is invalid'),'validation');
 assert.equal(alertCategory(undefined,undefined,'Invalid email alice@example.com'),null);
 assert.equal(alertCategory('PAYMENT_ERROR'),'payment');
});
test('routine shipping recalculation does not create a shipping-error suggestion',()=>{
 assert.equal(alertCategory('DELIVERY_ERROR',undefined,'The shipping options have changed for your order. Review your selection.'),null);
 assert.equal(alertCategory('DELIVERY_ERROR',undefined,'Your order cannot be shipped to the selected address.'),'delivery');
 assert.equal(alertCategory('DELIVERY_ERROR',undefined,undefined),'delivery');
});
test('stock and merchandise alerts are distinct from delivery and ordinary input errors',()=>{
 assert.equal(alertCategory('INVENTORY_ERROR'),'inventory');
 assert.equal(alertCategory('MERCHANDISE_ERROR'),'inventory');
 assert.equal(alertCategory('DELIVERY_ERROR'),'delivery');
 assert.equal(alertCategory('INPUT_INVALID','cart.lines[0]','Quantity is invalid'),'validation');
});

test('only explicit no-shipping templates confirm a blocker, never arbitrary messages or buyer data',()=>{
 assert.equal(shippingBlocker('DELIVERY_ERROR','Shipping not available'),'no_shipping_available');
 assert.equal(shippingBlocker('DELIVERY_ERROR','Your order cannot be shipped to the selected address.'),'no_shipping_available');
 assert.equal(shippingBlocker('DELIVERY_ERROR','The shipping options have changed for your order. Review your selection.'),undefined);
 assert.equal(shippingBlocker('DELIVERY_ERROR','Address 123 Example St is unavailable'),undefined);
 assert.equal(shippingBlocker('INPUT_INVALID','Shipping not available'),undefined);
 assert.equal(shippingBlocker('DELIVERY_ERROR'),undefined);
});

test('recognises the complete no-rate message reproduced in the demo checkout',()=>{
 const message = "Your order cannot be shipped to the selected address. Review your address to ensure it's correct and try again, or select a different address.";
 assert.equal(shippingBlocker('DELIVERY_ERROR',message),'no_shipping_available');
 assert.equal(shippingBlocker('DELIVERY_ERROR',message+' 123 Main Street'),undefined);
 assert.equal(shippingBlocker('CONTACT_ERROR',message),undefined);
});

test('recognises the price/weight shipping blocker reproduced with an available item',()=>{
 const message='Items in the cart do not meet price or weight requirements to qualify for shipping. Update your cart and try again.';
 assert.equal(shippingBlocker('DELIVERY_ERROR',message),'no_shipping_available');
 assert.equal(shippingBlocker('DELIVERY_ERROR',message+' Private details'),undefined);
});
