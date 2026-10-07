import test from 'node:test';import assert from 'node:assert/strict';
import {lastObservedStep,stepTimings,errorDiagnostics,periodComparison,previousRange,focusedAlerts} from '../shared/dashboardInsights.ts';
import {dateBounds} from '../shared/dateRange.ts';
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
test('diagnostics count distinct checkouts and require completion after the last matching alert',()=>{
 const rows=[event('a','alert_displayed',100,'payment'),event('a','checkout_completed',110),event('a','alert_displayed',120,'payment'),event('b','alert_displayed',125,'payment'),event('b','checkout_completed',130),event('c','alert_displayed',140,'delivery',true)];
 const diagnostics=errorDiagnostics([...rows,rows[0]]),payment=diagnostics.find(r=>r.category==='payment')!;
 assert.equal(payment.count,2);assert.equal(payment.alerts,3);assert.equal(payment.completedAfter,1);assert.equal(payment.firstSeen,100);assert.equal(payment.lastSeen,125);
 assert.equal(diagnostics.find(r=>r.category==='shipping_blocker')?.count,1);
});
test('previous periods preserve equal calendar lengths and comparisons do not fill absent history',()=>{
 assert.equal(previousRange('2026-01-01--2026-01-07'),'2025-12-25--2025-12-31');
 const range='2026-10-07--2026-10-07',current=dateBounds(range),previous=dateBounds(previousRange(range));
 const rows=[event('old','checkout_started',previous.start-1),event('prior','checkout_started',previous.start+1000),event('prior','checkout_completed',previous.start+2000),event('now','checkout_started',current.start+1000),event('now','alert_displayed',current.start+2000,'payment')];
 const comparison=periodComparison(rows,range,false,current.end+1);assert.equal(comparison.available,true);assert.equal(comparison.baseline.completionRate,1);assert.equal(comparison.current.alertRate,1);
 assert.equal(periodComparison(rows.slice(1),range).available,false);assert.equal(periodComparison(rows,range,true).available,false);
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
