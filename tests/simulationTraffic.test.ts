import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {simulate,snapshot,HOUR} from '../local/simulation/model.ts';
import {executeBatch} from '../local/simulation/batch.ts';

test('consecutive hourly batches vary traffic and conversion while retries keep the saved batch',()=>{
 const dir=mkdtempSync(join(tmpdir(),'checkout-traffic-'));
 try{
  const url=pathToFileURL(dir+'/'),start=Date.UTC(2026,9,13,11,30);
  const batches=Array.from({length:6},(_,hour)=>executeBatch(url,start+hour*HOUR+10*60000));
  const hours=batches.map(b=>b.batch);
  assert.ok(hours.every(h=>h.sessions>=90&&h.sessions<=120));
  assert.ok(new Set(hours.map(h=>h.sessions)).size>=4,'adjacent hourly seeds should produce varied volumes');
  assert.ok(new Set(hours.map(h=>h.completed)).size>=3,'completed totals should vary');
  assert.ok(Math.max(...hours.map(h=>h.completed/h.sessions))-Math.min(...hours.map(h=>h.completed/h.sessions))>.03,'completion rates should vary as well as volume');
  const retry=executeBatch(url,start+5*HOUR+20*60000);
  assert.equal(retry.created,false);
  assert.deepEqual(retry.batch,hours[5]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('varied traffic remains repeatable and preserves problem and recovery signals',()=>{
 assert.deepEqual(simulate(42,{hours:1}),simulate(42,{hours:1}));
 for(const seed of [42,497748,497749,497750]){
  const run=simulate(seed);
  for(const [hour,expected] of [[6,['stable','stable','stable']],[9,['review','stable','review']],[15,['stable','review','stable']],[24,['stable','stable','stable']]] as const){
   assert.deepEqual(snapshot(run,hour).trends.map(t=>t.state),expected,`seed ${seed}, hour ${hour}`);
  }
 }
});
