import test from 'node:test';import assert from 'node:assert/strict';
import {lastObservedStep,stepTimings,focusedAlerts} from '../shared/dashboardInsights.ts';
import type {CheckoutEvent} from '../shared/evidence.ts';
let serial=0;const event=(id:string,name:CheckoutEvent['name'],timestamp:number,category:CheckoutEvent['category']=null,blocker=false):CheckoutEvent=>({sessionId:id,eventId:String(++serial).padStart(64,'0'),name,timestamp,category,...(blocker?{shippingBlocker:'no_shipping_available' as const}:{})});
test('step timings exclude payment events after purchase, and distinguish missing transitions',()=>{
 const rows=[event('a','checkout_started',100000),event('a','checkout_contact_info_submitted',110000),event('a','checkout_shipping_info_submitted',130000),event('a','checkout_completed',160000),event('a','payment_info_submitted',190000)];
 assert.equal(lastObservedStep(rows),'Completed');assert.deepEqual(stepTimings(rows).map(r=>r.seconds),[10,20,30]);
 assert.equal(lastObservedStep(rows.slice(0,3)),'Shipping');
 assert.equal(stepTimings(rows.slice(0,3))[2].seconds,null);
 assert.equal(stepTimings(rows.slice(0,3))[2].note,'Payment activity not observed');
 assert.equal(stepTimings([rows[0],rows[2],rows[3]])[0].seconds,null);
 assert.equal(stepTimings([rows[1]])[0].note,'Start not observed');
 assert.equal(stepTimings([rows[0],event('a','alert_displayed',105000,'validation')])[0].note,'Observed until last event');
});
test('shipping notifications need distinct unresolved checkouts and respect fix boundaries',()=>{
 const now=10*3600000;const a=event('a','alert_displayed',now-1000,'delivery',true),b=event('b','alert_displayed',now-500,'delivery',true);
 assert.equal(focusedAlerts([a,a],now).length,0);assert.equal(focusedAlerts([a,b],now)[0].count,2);
 assert.equal(focusedAlerts([a,b,event('a','checkout_completed',now-1)],now).length,0);
 assert.equal(focusedAlerts([a,b],now,false,{delivery:now}).length,0);
});
test('spike notifications require a measured baseline, minimum sample and distinct checkout increase',()=>{
 const now=10*3600000,rows=[event('coverage','checkout_started',now-9*3600000)];
 for(let i=0;i<20;i++)rows.push(event('old'+i,'checkout_started',now-2*3600000));
 for(let i=0;i<10;i++){rows.push(event('new'+i,'checkout_started',now-10000));if(i<5)rows.push(event('new'+i,'alert_displayed',now-5000,'payment'));}
 assert.equal(focusedAlerts(rows,now)[0].category,'payment');assert.equal(focusedAlerts(rows,now,true).length,0);
 assert.equal(focusedAlerts(rows.filter(r=>r.sessionId!=='coverage'),now).length,0);
});

test('recorded findings separate steps and blockers without inventing fields or causes',async()=>{
 const {recordedFindings}=await import('../shared/dashboardInsights.ts');
 const rows=[event('a','checkout_started',10),event('a','checkout_address_info_submitted',20),event('a','alert_displayed',30,'validation'),event('a','alert_displayed',35,'validation'),event('a','checkout_completed',40),event('b','checkout_contact_info_submitted',20),event('b','alert_displayed',30,'validation'),event('c','checkout_shipping_info_submitted',30),event('c','alert_displayed',30,'delivery',true),event('d','alert_displayed',31,'delivery')];
 const groups=recordedFindings([...rows,rows[2]]);
 const address=groups.find(g=>g.key==='validation:checkout_address_info_submitted')!;
 assert.deepEqual(address.sessionIds,['a']);assert.equal(address.alerts.length,2);assert.equal(address.repeatedCheckouts,1);assert.equal(address.completedAfter,1);
 assert.equal(groups.find(g=>g.key==='validation:checkout_contact_info_submitted')?.sessionIds[0],'b');
 assert.equal(groups.find(g=>g.category==='shipping_blocker')?.step,'Earlier step not recorded');
 assert.ok(groups.some(g=>g.category==='delivery'));assert.equal(groups.length,4);
});
test('recorded findings require completion after the last alert in each step group',async()=>{
 const {recordedFindings}=await import('../shared/dashboardInsights.ts');
 const group=recordedFindings([event('a','alert_displayed',1,'payment'),event('a','checkout_completed',2),event('a','alert_displayed',3,'payment')]);
 assert.equal(group.find(g=>g.step==='Earlier step not recorded')?.completedAfter,1);
 assert.equal(group.find(g=>g.step==='Checkout completed')?.completedAfter,0);
});
test('simultaneous earlier submissions do not invent a last-step ordering',async()=>{
 const {recordedFindings}=await import('../shared/dashboardInsights.ts');
 const rows=[event('a','checkout_started',1),event('a','checkout_contact_info_submitted',2),event('a','checkout_address_info_submitted',2),event('a','alert_displayed',3,'validation')];
 assert.deepEqual(recordedFindings(rows).map(g=>g.key),recordedFindings([rows[0],rows[2],rows[1],rows[3]]).map(g=>g.key));
 assert.match(recordedFindings(rows)[0].step,/same time/i);
});
