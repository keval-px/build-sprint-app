import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutFunnel} from '../shared/checkoutFunnel.ts';
import {deviceClass,hasExpressPayment} from '../shared/checkoutSegments.ts';
import {parseTestEvent,type CheckoutEvent,type EventName} from '../shared/evidence.ts';
const event=(session:string,name:EventName,details:Partial<CheckoutEvent>={}):CheckoutEvent=>({sessionId:session.repeat(64),eventId:(session+name).padEnd(64,'0'),name,timestamp:100,category:null,...details});
test('funnel counts unique started sessions; zero denominators stay unavailable',()=>{
 const rows=[event('a','checkout_started'),event('a','checkout_started'),event('a','checkout_contact_info_submitted'),event('a','checkout_completed'),event('b','checkout_started'),event('b','checkout_contact_info_submitted'),event('c','checkout_completed')];
 const result=checkoutFunnel(rows,{asOf:200});
 assert.deepEqual(result.rows.map(r=>r.count),[2,2,0,0,1]);
 assert.equal(result.rows[2].drop,100);assert.equal(result.rows[4].drop,null);
 assert.equal(result.completed,1);
});
test('device and express segments filter sessions without guessing historical devices',()=>{
 const rows=[event('a','checkout_started',{deviceClass:'mobile'}),event('a','checkout_completed',{expressPay:true}),event('b','checkout_started',{deviceClass:'desktop'}),event('c','checkout_started'),event('d','checkout_started',{deviceClass:'tablet'})];
 assert.equal(checkoutFunnel(rows,{},'mobile').count,1);
 assert.equal(checkoutFunnel(rows,{},'desktop').count,1);
 assert.equal(checkoutFunnel(rows,{},'express').count,1);
 assert.equal(checkoutFunnel(rows).unknownDevice,1);
 assert.equal(checkoutFunnel(rows).count,4);
});
test('empty, future and conflicting device evidence is handled without NaN or false attribution',()=>{
 assert.ok(checkoutFunnel([]).rows.every(r=>r.percent===0&&r.drop===null));
 const rows=[event('a','checkout_started',{deviceClass:'mobile'}),event('a','checkout_contact_info_submitted',{deviceClass:'desktop'}),event('b','checkout_started',{timestamp:300})];
 assert.equal(checkoutFunnel(rows,{asOf:200},'mobile').count,0);
 assert.equal(checkoutFunnel(rows,{asOf:200}).unknownDevice,1);
});
test('confirmed order completion fills a missing browser completion for an exact started session',()=>{
 const rows=[event('a','checkout_started')];
 const result=checkoutFunnel(rows,{asOf:200,orders:[{sessionId:'a'.repeat(64),createdAt:new Date(150).toISOString(),paid:true}]});
 assert.equal(result.completed,1);
});
test('segment collection sends broad categories and positive wallet evidence only',()=>{
 assert.equal(deviceClass('Mozilla Android Mobile'),'mobile');assert.equal(deviceClass('Mozilla Windows NT 10.0'),'desktop');
 assert.equal(deviceClass('Mozilla iPad'),'tablet');assert.equal(deviceClass('unrecognized'),undefined);
 assert.equal(hasExpressPayment([{paymentMethod:{type:'wallet',name:'PayPal'}}]),true);
 assert.equal(hasExpressPayment([{paymentMethod:{type:'creditCard'}}]),undefined);
 assert.equal(hasExpressPayment(null),undefined);
 const valid={eventId:'b'.repeat(64),sessionId:'a'.repeat(64),name:'checkout_started',timestamp:100,category:null,deviceClass:'mobile',expressPay:true};
 assert.ok(parseTestEvent(valid,200));
 for(const extra of [{deviceClass:'phone'},{expressPay:false},{userAgent:'raw browser details'}])assert.equal(parseTestEvent({...valid,...extra},200),null);
});

test('stage percentages compare adjacent observed totals and handle increases',()=>{
 const rows:CheckoutEvent[]=[];
 for(let i=0;i<11;i++){
  const id=String.fromCharCode(97+i);
  rows.push(event(id,'checkout_started'));
  if(i<10)rows.push(event(id,'checkout_contact_info_submitted'));
  if(i<4)rows.push(event(id,'checkout_shipping_info_submitted'));
  if(i<3)rows.push(event(id,'payment_info_submitted'));
  if(i<1)rows.push(event(id,'checkout_completed'));
 }
 assert.deepEqual(checkoutFunnel(rows).rows.map(r=>r.drop),[null,9,60,25,67]);
 const skipped=[event('a','checkout_started'),event('b','checkout_started'),event('a','checkout_contact_info_submitted'),event('a','checkout_shipping_info_submitted'),event('b','checkout_shipping_info_submitted')];
 assert.equal(checkoutFunnel(skipped).rows[2].drop,-100);
});
