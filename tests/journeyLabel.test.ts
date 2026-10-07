import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyLabel,journeyOrderHref} from '../shared/journeyLabel.ts';

const id = '5d7098498e73' + '0'.repeat(52);
test('checkout references remain stable without a matched order', () => {
  assert.equal(journeyLabel(id, []), '#5d7098498e73…');
  assert.equal(journeyLabel(id, [{sessionId: 'another-checkout', orderName: '#1001'}]), '#5d7098498e73…');
});
test('order links require a unique matched order and a valid Shopify resource ID', () => {
  const order = {sessionId: id, orderName: '#1001', orderId: '123456'};
  assert.equal(journeyOrderHref(id, [order]), 'shopify://admin/orders/123456');
  assert.equal(journeyOrderHref(id, [order, order]), null);
  assert.equal(journeyOrderHref('unmatched', [order]), null);
  assert.equal(journeyOrderHref(id, [{...order,orderId:'javascript:alert(1)'}]), null);
  assert.equal(journeyOrderHref(id, [{sessionId:id,orderName:'#1001'}]), null);
});
test('only a unique exact order match replaces the checkout reference', () => {
  assert.equal(journeyLabel(id, [{sessionId: id, orderName: '#1001'}]), 'Order #1001');
  assert.equal(journeyLabel(id, [{sessionId: id, orderName: '#1001'}, {sessionId: id, orderName: '#1002'}]), '#5d7098498e73…');
  assert.equal(journeyLabel(id, [{sessionId: id}]), '#5d7098498e73…');
});
