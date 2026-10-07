import test from "node:test";
import assert from "node:assert/strict";
import { parseTestEvent, summarize, describeJourney } from "../shared/evidence.ts";
import type { CheckoutEvent } from "../shared/evidence.ts";

// Synthetic unit-test fixtures only. These never enter Convex or the demo screen.
const now = 1791200000000;
const event = (overrides: Partial<CheckoutEvent> = {}): CheckoutEvent => ({ eventId: "a".repeat(64), sessionId: "b".repeat(64), name: "checkout_started", timestamp: now, category: null, ...overrides });

test("rejects personal data, wrong event types, and forged timestamps", () => {
  assert.equal(parseTestEvent({ ...event(), email: "fixture@example.test" }, now), null);
  assert.equal(parseTestEvent({ ...event(), name: "invented_error" }, now), null);
  assert.equal(parseTestEvent(event({ timestamp: now - 86400001 }), now), null);
  assert.equal(parseTestEvent(event({ timestamp: now + 60001 }), now), null);
  assert.equal(parseTestEvent(event({ category: "discount" }), now), null);
});
test("missing completion is not counted as an error or a finding", () => {
  const summary = summarize([event()]);
  assert.equal(summary.noCompletionObserved, 1);
  assert.deepEqual(summary.observations, []);
});
test("deduplicates alerts and measures distinct checkout sessions", () => {
  const alert = event({ eventId: "c".repeat(64), name: "alert_displayed", category: "discount" });
  const summary = summarize([event(), alert, alert, event({ eventId: "d".repeat(64), name: "alert_displayed", category: "discount" })]);
  assert.deepEqual(summary.observations, [{ category: "discount", alerts: 2, sessions: 1 }]);
  assert.equal(summary.eventCount, 3);
});
test("completion arriving before its start is grouped correctly", () => {
  const summary = summarize([event({ eventId: "e".repeat(64), name: "checkout_completed", timestamp: now + 1000 }), event()]);
  assert.equal(summary.completed, 1);
  assert.equal(summary.noCompletionObserved, 0);
});


test("describes progress without inventing abandonment or its cause", () => {
  const detail = describeJourney([event(), event({eventId: "f".repeat(64), name: "checkout_contact_info_submitted", timestamp: now + 1000}), event({eventId: "c".repeat(64), name: "alert_displayed", category: "validation", timestamp: now + 2000})]);
  assert.equal(detail.lastProgress, "Contact submitted");
  assert.equal(detail.outcome, "No completion observed");
  assert.deepEqual(detail.categories, ["validation"]);
});
test("recovery requires an error before completion and ignores later progress", () => {
  const completion = event({name: "checkout_completed", timestamp: now + 2000});
  const latePayment = event({name: "payment_info_submitted", timestamp: now + 3000});
  const alert = event({name: "alert_displayed", category: "payment", timestamp: now + 1000});
  assert.equal(describeJourney([latePayment, completion, alert, event()]).outcome, "Completed after an observed error");
  assert.equal(describeJourney([latePayment, completion, alert, event()]).lastProgress, "Checkout started");
  assert.equal(describeJourney([completion, {...alert, timestamp: now + 4000}]).outcome, "Completion observed");
  assert.equal(describeJourney([alert]).lastProgress, "Progress not observed");
});

test('shipping blocker labels are accepted only on delivery alerts',()=>{
 assert.ok(parseTestEvent({...event({name:'alert_displayed',category:'delivery'}),shippingBlocker:'no_shipping_available'},now));
 assert.equal(parseTestEvent({...event(),shippingBlocker:'no_shipping_available'},now),null);
 assert.equal(parseTestEvent({...event({name:'alert_displayed',category:'payment'}),shippingBlocker:'no_shipping_available'},now),null);
 assert.equal(parseTestEvent({...event({name:'alert_displayed',category:'delivery'}),shippingBlocker:'raw address'},now),null);
});
