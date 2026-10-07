import test from "node:test";
import assert from "node:assert/strict";
import { buildMissions, missionRecommendation, missionSeverity, missionSignal, isViewerId } from "../shared/actions.ts";
import type { CheckoutEvent } from "../shared/evidence.ts";
const event = (name: CheckoutEvent["name"], n: number, sessionId = "a", category: CheckoutEvent["category"] = null): CheckoutEvent => ({eventId:String(n),sessionId,name,category,timestamp:n});
test("missions count distinct sessions and do not turn missing completion into a cause",()=>{
 const missions=buildMissions([event("checkout_started",1),event("alert_displayed",2,"a","payment"),event("alert_displayed",3,"a","payment"),event("checkout_completed",4),event("checkout_started",5,"b")]);
 assert.equal(missions[0].count,1);assert.match(missions[0].description,/1 later completed/);assert.equal(missions[2].count,1);assert.deepEqual(missions[2].sessionIds,["b"]);assert.match(missions[2].why,/some activity may be missing/);
 assert.equal(buildMissions([]).every(m=>m.count===0),true);
});
test('anonymous viewer IDs reject contact details',()=>{assert.equal(isViewerId('a'.repeat(32)),true);assert.equal(isViewerId('visitor@example.com'),false);});

test("payment recovery requires a payment alert before completion",()=>{
 const missions=buildMissions([event("checkout_started",1),event("alert_displayed",2,"a","validation"),event("checkout_completed",3),event("alert_displayed",4,"a","payment")]);
 assert.equal(missions[0].count,1);assert.match(missions[0].description,/0 later completed/);
});

test("shipping and repeated discount errors produce distinct investigations without inventing a cause",()=>{
 const missions=buildMissions([event("checkout_started",1,"d"),event("alert_displayed",2,"d","delivery"),event("checkout_started",3,"p"),event("alert_displayed",4,"p","discount"),event("alert_displayed",5,"p","discount")]);
 assert.equal(missions.find(m=>m.id==="delivery")?.count,1);
 assert.match(missions.find(m=>m.id==="discount")!.title,/repeated discount/);
 assert.match(missions.find(m=>m.id==="discount")!.description,/does not prove the same code/);
 
});
test('availability investigation deduplicates repeated alerts and keeps shipping separate',()=>{
 const missions=buildMissions([event('checkout_started',1,'stock'),event('alert_displayed',2,'stock','inventory'),event('alert_displayed',3,'stock','inventory'),event('alert_displayed',4,'stock','delivery')]);
 const inventory=missions.find(m=>m.id==='inventory')!;
 assert.equal(inventory.count,1);assert.deepEqual(inventory.sessionIds,['stock']);
 assert.equal(missions.find(m=>m.id==='delivery')?.count,1);
 assert.match(inventory.next,/fulfilment/);
});

test("severity prioritizes possible buying blockers without treating missing completion as a cause", () => {
 const events = [event("checkout_started",1), event("alert_displayed",2,"a","payment"), event("alert_displayed",3,"a","inventory"), event("alert_displayed",4,"a","delivery"), event("alert_displayed",5,"a","discount"), event("alert_displayed",6,"a","validation")];
 for (const mission of buildMissions(events)) {
  assert.equal(missionSeverity(mission,events).label, ["payment","inventory"].includes(mission.id) ? "Critical" : mission.id === "unfinished" ? "Info" : "Warning");
 }
 const completed = [...events,event("checkout_completed",7)];
 assert.equal(buildMissions(completed).every(m => missionSeverity(m,completed).label === "Info"),true);
 const laterAlert = [...completed,event("alert_displayed",8,"a","payment")];
 assert.equal(missionSeverity(buildMissions(laterAlert)[0],laterAlert).label,"Critical");
});

test('confirmed shipping blockers are critical until a later purchase, historical delivery alerts stay warnings',()=>{
 const legacy = [event('checkout_started',1),event('alert_displayed',2,'a','delivery')];
 const delivery = (events:CheckoutEvent[])=>buildMissions(events).find(m=>m.id==='delivery')!;
 assert.equal(missionSeverity(delivery(legacy),legacy).label,'Warning');
 const blocked:CheckoutEvent[] = [...legacy,{...event('alert_displayed',3,'a','delivery'),shippingBlocker:'no_shipping_available'}];
 assert.equal(missionSeverity(delivery(blocked),blocked).label,'Critical');
 assert.match(delivery(blocked).description,/1 checkout showed shipping unavailable/);
 const completed = [...blocked,event('checkout_completed',4)];
 assert.equal(missionSeverity(delivery(completed),completed).label,'Info');
 const another = [...completed,event('alert_displayed',5,'other','delivery')];
 assert.equal(missionSeverity(delivery(another),another).label,'Warning');
});


test('fix marker separates past blockers without claiming that shipping is healthy',()=>{
 const events:CheckoutEvent[]=[event('checkout_started',1),{...event('alert_displayed',2,'a','delivery'),shippingBlocker:'no_shipping_available'}];
 const mission=buildMissions(events).find(m=>m.id==='delivery')!;
 const past=missionSignal(mission,events,3);
 assert.equal(past.period,'before');assert.equal(past.latestAlert,2);assert.equal(past.severity.label,'Info');assert.match(past.severity.reason,/does not verify/);
 assert.equal(missionSignal(mission,events).severity.label,'Critical');
});
test('a blocker returning in an older checkout after the marker is critical',()=>{
 const events:CheckoutEvent[]=[event('checkout_started',1),{...event('alert_displayed',2,'a','delivery'),shippingBlocker:'no_shipping_available'}, {...event('alert_displayed',4,'a','delivery'),shippingBlocker:'no_shipping_available'}];
 const mission=buildMissions(events).find(m=>m.id==='delivery')!;
 const returned=missionSignal(mission,events,3);
 assert.equal(returned.period,'after');assert.equal(returned.latestAlert,4);assert.equal(returned.severity.label,'Critical');
 const completed=[...events,event('checkout_completed',5)];
 assert.equal(missionSignal(mission,completed,3).severity.label,'Info');
});
test('old confirmed blockers do not make new general alerts critical',()=>{
 const events:CheckoutEvent[]=[event('checkout_started',1),{...event('alert_displayed',2,'a','delivery'),shippingBlocker:'no_shipping_available'},event('alert_displayed',4,'b','delivery')];
 const mission=buildMissions(events).find(m=>m.id==='delivery')!;
 assert.equal(missionSignal(mission,events,3).severity.label,'Warning');
});


test('recommendations distinguish confirmed shipping from general delivery alerts',()=>{
 const general=[event('checkout_started',1),event('alert_displayed',2,'a','delivery')];
 const get=(events:CheckoutEvent[])=>buildMissions(events).find(m=>m.id==='delivery')!.next;
 assert.match(get(general),/only if the alert still prevents progress/);
 assert.doesNotMatch(get(general),/Correct the missing coverage/);
 assert.match(get([...general,{...event('alert_displayed',3,'a','delivery'),shippingBlocker:'no_shipping_available'}]),/price or weight limits/);
});
test('payment advice changes only when every affected checkout completes after its last alert',()=>{
 const alerts=[event('checkout_started',1),event('alert_displayed',2,'a','payment')];
 const get=(events:CheckoutEvent[])=>buildMissions(events)[0].next;
 assert.match(get(alerts),/Do not treat every card decline/);
 assert.match(get([...alerts,event('checkout_completed',3)]),/Review the retries before changing/);
 assert.match(get([...alerts,event('checkout_completed',3),event('alert_displayed',4,'a','payment')]),/setup fault/);
});
test('repeated discount advice checks the promised offer without inventing a code',()=>{
 const single=[event('checkout_started',1),event('alert_displayed',2,'a','discount')];
 const get=(events:CheckoutEvent[])=>buildMissions(events).find(m=>m.id==='discount')!.next;
 assert.match(get(single),/discount code or gift card/);
 assert.match(get([...single,event('alert_displayed',3,'a','discount')]),/offer the customer expected/);
 assert.match(get([...single,event('alert_displayed',3,'a','discount'),event('checkout_completed',4)]),/discount code or gift card/);
});

test('new general shipping alerts after a fix do not inherit historical blocker advice',()=>{
 const events:CheckoutEvent[]=[event('checkout_started',1),{...event('alert_displayed',2,'a','delivery'),shippingBlocker:'no_shipping_available'},event('alert_displayed',4,'b','delivery')];
 const mission=buildMissions(events).find(m=>m.id==='delivery')!;
 assert.match(missionRecommendation(mission,events),/price or weight limits/);
 assert.match(missionRecommendation(mission,events,3),/only if the alert still prevents progress/);
 assert.match(missionRecommendation(mission,events,5),/price or weight limits/);
 assert.equal(mission.count,2);
});
