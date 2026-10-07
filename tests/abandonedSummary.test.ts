import test from 'node:test';
import assert from 'node:assert/strict';
import {abandonedSummary} from '../shared/abandonedSummary.ts';
const start=Date.parse('2026-10-01T00:00:00Z'),end=Date.parse('2026-11-01T00:00:00Z');
test('totals every unrecovered Shopify basket in the dates, without requiring a session link',()=>{
  const rows=[60000,74995,0].map(subtotalCents=>({createdAt:'2026-10-05T12:00:00Z',subtotalCents,recovered:false}));
  const result=abandonedSummary([...rows,{...rows[0],recovered:true},{...rows[0],createdAt:'2026-09-30T23:59:59Z'}],start,end);
  assert.equal(result.count,3);assert.equal(result.totalCents,134995);assert.equal(result.averageCents,44998);
});
test('missing prices never become zero or a misleading total',()=>{
  const result=abandonedSummary([{createdAt:'2026-10-05',subtotalCents:null,recovered:false}],start,end);
  assert.equal(result.count,1);assert.equal(result.totalCents,null);assert.equal(result.averageCents,null);
  const empty=abandonedSummary([],start,end);assert.equal(empty.totalCents,0);assert.equal(empty.averageCents,null);
});
