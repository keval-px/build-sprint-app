import test from 'node:test';
import assert from 'node:assert/strict';
import {orderPattern,orderHistoryStart,type PatternOrder} from '../shared/orderPattern.ts';
const now=Date.parse('2026-10-07T12:30:00Z');
const order=(id:string,date:string,extra:Partial<PatternOrder>={}):PatternOrder=>({recordHash:id,createdAt:date,paid:true,cancelled:false,test:true,...extra});
test('same-weekday average includes zero-order days, excludes other weekdays, duplicates and future hours',()=>{
 const rows=[order('a','2026-09-30T10:00:00Z'),order('b','2026-10-07T10:00:00Z'),order('a','2026-09-30T10:00:00Z'),order('other','2026-10-06T10:00:00Z'),order('unpaid','2026-10-07T10:00:00Z',{paid:false}),order('cancelled','2026-10-07T10:00:00Z',{cancelled:true}),order('future','2026-10-08T10:00:00Z')];
 const result=orderPattern(rows,'2026-09-07T00:00:00Z',now)!;
 assert.equal(result.baselineDays,4);assert.equal(result.hours[10].average,1/4);assert.equal(result.hours[10].count,1);assert.equal(result.hours[13].count,null);assert.equal(result.totalOrders,2);
 assert.equal(JSON.stringify(result).includes('recordHash'),false);
});
test('partial source coverage excludes incomplete matching days and does not invent an average',()=>{
 const result=orderPattern([],'2026-09-23T12:00:00Z',now)!;
 assert.equal(result.baselineDays,1);assert.equal(result.hours[0].average,0);
 assert.equal(orderPattern([],'2026-10-05T00:00:00Z',now)!.hours[0].average,null);
 assert.equal(orderPattern([],'invalid',now),null);
});
test('store weekday and hour use local dates across a half-hour offset',()=>{
 const result=orderPattern([order('one','2026-10-06T20:00:00Z'),order('baseline','2026-09-29T20:00:00Z')],'2026-09-06T18:30:00Z',Date.parse('2026-10-07T00:30:00Z'),'Asia/Kolkata')!;
 assert.equal(result.day,'2026-10-07');assert.equal(result.timeZone,'Asia/Kolkata');assert.equal(result.baselineDays,4);assert.equal(result.hours[1].count,1);assert.equal(result.hours[1].average,0.25);assert.equal(result.hours[7].count,null);
 assert.equal(orderHistoryStart(Date.parse('2026-10-07T00:30:00Z'),'Asia/Kolkata'),'2026-09-06T18:30:00.000Z');
});
test('spring-forward missing hour is excluded from matching-weekday denominator',()=>{
 const result=orderPattern([order('one','2026-03-01T07:00:00Z')],'2026-03-01T05:00:00Z',Date.parse('2026-03-15T16:00:00Z'),'America/New_York')!;
 assert.equal(result.baselineDays,2);assert.equal(result.hours[2].average,1);
});
test('fall-back repeated hour counts both actual orders in the same local hour',()=>{
 const result=orderPattern([order('a','2026-11-01T05:30:00Z'),order('b','2026-11-01T06:30:00Z')],'2026-11-01T04:00:00Z',Date.parse('2026-11-08T15:00:00Z'),'America/New_York')!;
 assert.equal(result.baselineDays,1);assert.equal(result.hours[1].average,2);assert.equal(orderPattern([],'2026-10-01T00:00:00Z',now,'bad/zone'),null);
});
