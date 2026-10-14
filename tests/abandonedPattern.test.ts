import test from 'node:test';
import assert from 'node:assert/strict';
import {abandonedPattern,abandonedSeriesName,abandonedTooltipValue,ABANDONED_LINE_COLOR} from '../shared/abandonedPattern.ts';
import {orderPattern} from '../shared/orderPattern.ts';
const now=Date.parse('2026-10-09T12:30:00Z');
const pattern=orderPattern([], '2026-09-09T00:00:00Z',now)!;
const row=(id:string,at:string,recovered=false)=>({recordHash:id,createdAt:at,recovered});
test('native abandoned series counts unique unrecovered records by creation hour and leaves missing hours unknown',()=>{
 const result=abandonedPattern([row('a','2026-10-09T10:05:00Z'),row('a','2026-10-09T10:05:00Z'),row('b','2026-10-09T10:10:00Z'),row('recovered','2026-10-09T10:10:00Z',true),row('prior','2026-10-08T11:00:00Z'),row('future','2026-10-09T13:00:00Z')],pattern);
 assert.equal(result.observed,2);assert.equal(result.hours[10],2);assert.equal(result.hours[9],null);assert.equal(result.hours[13],null);
 assert.ok(!result.hours.includes(0));assert.equal(JSON.stringify(result).includes('recordHash'),false);
});
test('missing or empty native payload never creates a trusted zero abandoned curve',()=>{
 for(const records of [null,[]])assert.deepEqual(abandonedPattern(records,pattern),{hours:Array(24).fill(null),observed:0});
});
test('abandoned record day and hour follow store timezone with future timestamps excluded',()=>{
 const local=orderPattern([], '2026-09-09T00:00:00Z',Date.parse('2026-10-09T03:30:00Z'),'America/New_York')!;
 const result=abandonedPattern([row('same-local-day','2026-10-09T02:00:00Z'),row('future','2026-10-09T04:00:00Z'),row('old','2026-10-08T02:00:00Z')],local);
 assert.equal(result.observed,1);assert.equal(result.hours[22],1);assert.equal(result.hours[0],null);
});
test('tooltip distinguishes unknown gaps, future hours and observed minimum counts; line has chart contrast',()=>{
 assert.equal(abandonedTooltipValue(null,false),'0');assert.equal(abandonedTooltipValue(null,true),'Not reached');assert.equal(abandonedTooltipValue(2,false),'2');
 const channels=ABANDONED_LINE_COLOR.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const luminance=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];assert.ok(1.05/(luminance+.05)>=3,'contrast at least 3:1 against white chart background');
});
test('retained native series dates its snapshot after UTC store midnight',()=>{
 const snapshot=orderPattern([], '2026-09-09T00:00:00Z',Date.parse('2026-10-08T23:59:00Z'),'UTC')!;
 const native=abandonedPattern([row('prior','2026-10-08T22:00:00Z')],snapshot);
 assert.equal(abandonedSeriesName(snapshot,Date.parse('2026-10-08T23:59:30Z')),'Today’s abandoned checkouts');
 assert.equal(abandonedSeriesName(snapshot,Date.parse('2026-10-09T00:01:00Z')),'2026-10-08 abandoned checkouts');
 assert.equal(abandonedTooltipValue(native.hours[22],false),'1');
});
test('retained native series label follows non-UTC store midnight rather than UTC midnight',()=>{
 const snapshot=orderPattern([], '2026-09-09T00:00:00Z',Date.parse('2026-10-09T03:59:00Z'),'America/New_York')!;
 const native=abandonedPattern([row('prior','2026-10-09T02:00:00Z')],snapshot);
 assert.equal(snapshot.day,'2026-10-08');
 assert.equal(abandonedSeriesName(snapshot,Date.parse('2026-10-09T03:59:30Z')),'Today’s abandoned checkouts');
 assert.equal(abandonedSeriesName(snapshot,Date.parse('2026-10-09T04:01:00Z')),'2026-10-08 abandoned checkouts');
 assert.equal(abandonedTooltipValue(native.hours[22],false),'1');
});
