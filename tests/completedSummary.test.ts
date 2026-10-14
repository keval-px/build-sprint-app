import test from 'node:test';
import assert from 'node:assert/strict';
import {completedSummary,type CompletedOrder} from '../shared/completedSummary.ts';
const start=Date.parse('2026-10-13T00:00:00Z'),end=start+86400000;
const row=(id:string,changes:Partial<CompletedOrder>={}):CompletedOrder=>({recordHash:id,createdAt:new Date(start).toISOString(),paid:true,cancelled:false,subtotalCents:1000,totalCents:1200,...changes});
test('completed cards count unique paid, non-cancelled orders in the selected dates',()=>{
 const records=[row('one'),row('one'),row('two',{totalCents:2000}),row('unpaid',{paid:false}),row('cancelled',{cancelled:true}),row('old',{createdAt:new Date(start-1).toISOString()}),row('end',{createdAt:new Date(end).toISOString()}),row('invalid',{createdAt:'invalid'})];
 assert.deepEqual(completedSummary(records,start,end),{count:2,totalCents:3200,averageCents:1600});
});
test('missing prices keep the order count but do not invent totals or averages',()=>{
 assert.deepEqual(completedSummary([row('one'),row('unknown',{totalCents:null})],start,end),{count:2,totalCents:null,averageCents:null});
 assert.deepEqual(completedSummary([],start,end),{count:0,totalCents:0,averageCents:null});
 assert.deepEqual(completedSummary([row('legacy',{totalCents:undefined}),row('free',{totalCents:0})],start,end),{count:2,totalCents:1000,averageCents:500});
});
