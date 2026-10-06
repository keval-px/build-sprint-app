import test from "node:test";
import assert from "node:assert/strict";
import { buildMissions, progressScore, isActionStep, isViewerId } from "../shared/actions.ts";
import type { CheckoutEvent } from "../shared/evidence.ts";
const event = (name: CheckoutEvent["name"], n: number, sessionId = "a", category: CheckoutEvent["category"] = null): CheckoutEvent => ({eventId:String(n),sessionId,name,category,timestamp:n});
test("missions count distinct sessions and do not turn missing completion into a cause",()=>{
 const missions=buildMissions([event("checkout_started",1),event("alert_displayed",2,"a","payment"),event("alert_displayed",3,"a","payment"),event("checkout_completed",4),event("checkout_started",5,"b")]);
 assert.equal(missions[0].count,1);assert.match(missions[0].description,/1 later recorded completion/);assert.equal(missions[2].count,1);assert.deepEqual(missions[2].sessionIds,["b"]);assert.match(missions[2].why,/not a proven cause/);
 assert.equal(buildMissions([]).every(m=>m.count===0),true);
});
test("points cannot be farmed through duplicate or unknown steps and badges can be undone",()=>{
 assert.equal(progressScore(["payment-review","payment-review","made-up"]).points,20);
 assert.deepEqual(progressScore(["payment-review","payment-reproduce","payment-compare"]).badges,["payment"]);
 assert.deepEqual(progressScore(["payment-review","payment-compare"]).badges,[]);
 assert.equal(isActionStep("payment-auto-fixed"),false);assert.equal(isViewerId("a".repeat(32)),true);assert.equal(isViewerId("visitor@example.com"),false);
});

test("payment recovery requires a payment alert before completion",()=>{
 const missions=buildMissions([event("checkout_started",1),event("alert_displayed",2,"a","validation"),event("checkout_completed",3),event("alert_displayed",4,"a","payment")]);
 assert.equal(missions[0].count,1);assert.match(missions[0].description,/0 later recorded completion/);
});
