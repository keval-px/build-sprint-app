import test from 'node:test';
import assert from 'node:assert/strict';
import {orderPattern,orderHistoryStart,type PatternOrder} from '../shared/orderPattern.ts';
const now=Date.parse('2026-10-07T12:30:00Z');
const order=(id:string,date:string,extra:Partial<PatternOrder>={}):PatternOrder=>({recordHash:id,createdAt:date,paid:true,cancelled:false,test:true,...extra});
test('hourly average includes all previous 30 days, including zero-order days and different weekdays',()=>{
 const rows=[order('a','2026-09-30T10:00:00Z'),order('b','2026-10-07T10:00:00Z'),order('a','2026-09-30T10:00:00Z'),order('other','2026-10-06T10:00:00Z'),order('unpaid','2026-10-07T10:00:00Z',{paid:false}),order('cancelled','2026-10-07T10:00:00Z',{cancelled:true}),order('future','2026-10-08T10:00:00Z')];
 const result=orderPattern(rows,'2026-09-07T00:00:00Z',now)!;
 assert.equal(result.baselineDays,30);assert.equal(result.hours[10].average,2/30);assert.equal(result.hours[10].count,1);assert.equal(result.hours[13].count,null);assert.equal(result.totalOrders,3);
 assert.equal(JSON.stringify(result).includes('recordHash'),false);
});
test('partial source coverage excludes incomplete days and does not invent an average',()=>{
 const result=orderPattern([],'2026-09-23T12:00:00Z',now)!;
 assert.equal(result.baselineDays,13);assert.equal(result.hours[0].average,0);
 assert.equal(orderPattern([],'2026-10-07T00:00:00Z',now)!.hours[0].average,null);
 assert.equal(orderPattern([],'invalid',now),null);
});
test('hour and day use the store timezone across a half-hour offset',()=>{
 const result=orderPattern([order('one','2026-10-06T20:00:00Z'),order('baseline','2026-09-29T20:00:00Z')],'2026-09-06T18:30:00Z',Date.parse('2026-10-07T00:30:00Z'),'Asia/Kolkata')!;
 assert.equal(result.day,'2026-10-07');assert.equal(result.baselineDays,30);assert.equal(result.hours[1].count,1);assert.equal(result.hours[1].average,1/30);assert.equal(result.hours[7].count,null);
 assert.equal(orderHistoryStart(Date.parse('2026-10-07T00:30:00Z'),'Asia/Kolkata'),'2026-09-06T18:30:00.000Z');
});
test('spring-forward nonexistent hour is excluded from the historical denominator',()=>{
 const result=orderPattern([order('one','2026-03-01T07:00:00Z')],'2026-03-01T05:00:00Z',Date.parse('2026-03-15T16:00:00Z'),'America/New_York')!;
 assert.equal(result.baselineDays,14);assert.equal(result.hours[2].average,1/13);
});
test('fall-back repeated hour includes both actual orders and divides by observed days',()=>{
 const result=orderPattern([order('a','2026-11-01T05:30:00Z'),order('b','2026-11-01T06:30:00Z')],'2026-11-01T04:00:00Z',Date.parse('2026-11-08T15:00:00Z'),'America/New_York')!;
 assert.equal(result.baselineDays,7);assert.equal(result.hours[1].average,2/7);assert.equal(orderPattern([],'2026-10-01T00:00:00Z',now,'bad/zone'),null);
});
test('new test order is today only; prior orders contribute to their exact historical hour',()=>{
 const rows=[order('prior','2026-10-07T06:00:00Z'),order('today','2026-10-08T06:55:00Z')];
 const result=orderPattern(rows,'2026-09-08T04:00:00Z',Date.parse('2026-10-08T07:15:00Z'),'America/New_York')!;
 assert.equal(result.hours.length,24);assert.equal(result.baselineDays,30);assert.equal(result.hours[2].count,1);assert.equal(result.hours[2].average,1/30);assert.equal(result.hours[4].count,null);
});
