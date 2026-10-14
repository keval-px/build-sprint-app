import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyDuration} from '../shared/journeyDuration.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
const event = (name: CheckoutEvent['name'], timestamp: number): CheckoutEvent => ({name,timestamp,eventId:String(timestamp),sessionId:'fixture',category:null});
test('elapsed time ends at completion, excluding later payment events', () => {
  assert.equal(journeyDuration([event('payment_info_submitted',130000), event('checkout_started',1000), event('checkout_completed',127000)]), 'Recorded activity: 02:06');
});
test('unfinished checkouts use the last observation; missing starts remain unknown', () => {
  assert.equal(journeyDuration([event('checkout_started',1000),event('checkout_shipping_info_submitted',66000)]), 'Recorded activity: 01:05');
  assert.equal(journeyDuration([event('checkout_completed',1000)]), 'Activity duration unavailable');
  assert.equal(journeyDuration([event('checkout_started',1000)]), 'Recorded activity: 00:00');
});
