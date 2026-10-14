import test from 'node:test';
import assert from 'node:assert/strict';
import {nativePlan,nativeFilter,nativeVersionDecision,NATIVE_OVERLAP_MS,NATIVE_RECONCILE_MS} from '../shared/nativeSync.ts';
test('initial backfill, overlap and scheduled reconciliation use frozen, quoted bounds',()=>{
 const now=Date.parse('2026-10-09T12:00:00Z'),periodStart='2026-09-09T00:00:00.000Z';
 assert.deepEqual(nativePlan(now,periodStart,null),{mode:'backfill',filterStart:periodStart});
 const base={startedAt:now-60000,periodStart,lastFullAt:now-60000};
 const plan=nativePlan(now,periodStart,base);assert.equal(plan.mode,'incremental');assert.equal(Date.parse(plan.filterStart),base.startedAt-NATIVE_OVERLAP_MS);
 assert.equal(nativeFilter(plan.mode,plan.filterStart,now),`updated_at:>="${plan.filterStart}" updated_at:<="2026-10-09T12:00:00.000Z"`);
 assert.equal(nativePlan(now+NATIVE_RECONCILE_MS,periodStart,base).mode,'reconcile');
 assert.equal(nativePlan(now,'2026-09-08T00:00:00.000Z',base).mode,'reconcile');
 assert.throws(()=>nativeFilter('incremental','invalid',now));assert.throws(()=>nativeFilter('backfill',periodStart,0));
});
test('version decisions ignore duplicate and out-of-order updates and reject same-time conflicts',()=>{
 const old={sourceUpdatedAt:10,row:{paid:false,total:100}};
 assert.equal(nativeVersionDecision(null,old),'insert');assert.equal(nativeVersionDecision(old,{...old}),'ignore');
 assert.equal(nativeVersionDecision(old,{sourceUpdatedAt:9,row:{paid:true,total:0}}),'ignore');
 assert.equal(nativeVersionDecision(old,{sourceUpdatedAt:11,row:{paid:true,total:100}}),'update');
 assert.throws(()=>nativeVersionDecision(old,{sourceUpdatedAt:10,row:{paid:true,total:100}}),/Conflicting/);
 assert.throws(()=>nativeVersionDecision(null,{sourceUpdatedAt:NaN,row:{}}),/timestamp/);
});

test('verified identity enrichment publishes without modifying same-version source figures',()=>{
 const old={sourceUpdatedAt:10,row:{recordHash:'native',createdAt:'2026-10-09T12:00:00Z',subtotalCents:74995,totalCents:76495,recovered:false}};
 const linked={...old,row:{...old.row,sessionId:'a'.repeat(64)}};
 assert.equal(nativeVersionDecision(old,linked),'update');
 assert.equal(nativeVersionDecision(linked,linked),'ignore');
 assert.throws(()=>nativeVersionDecision(linked,old),/Conflicting/);
 assert.throws(()=>nativeVersionDecision(linked,{...linked,row:{...linked.row,sessionId:'b'.repeat(64)}}),/Conflicting/);
 assert.throws(()=>nativeVersionDecision(old,{...linked,row:{...linked.row,subtotalCents:76495}}),/Conflicting/);
 assert.throws(()=>nativeVersionDecision(old,{...linked,row:{...linked.row,recovered:true}}),/Conflicting/);
 assert.equal(nativeVersionDecision(old,{...linked,sourceUpdatedAt:9}),'ignore');
});
