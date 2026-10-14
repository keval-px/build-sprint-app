import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {executeBatch,hourStart} from '../local/simulation/batch.ts';
import {HOUR} from '../local/simulation/model.ts';
test('hourly execution creates one batch, retries never duplicate it, next hour adds one',()=>{
 const dir=mkdtempSync(join(tmpdir(),'checkout-batch-')),url=pathToFileURL(dir+'/');
 try{
 const now=Date.parse('2026-10-13T11:55:00Z');
 assert.equal(new Date(hourStart(now)).toISOString(),'2026-10-13T11:30:00.000Z');
 const first=executeBatch(url,now);
 assert.equal(first.totalBatches,1);assert.ok(first.batch.sessions>=90&&first.batch.sessions<=120);
 assert.ok(first.observedSoFar.started<first.batch.sessions);
 const retry=executeBatch(url,now);assert.equal(retry.created,false);assert.equal(retry.totalPlannedSessions,first.totalPlannedSessions);
 const next=executeBatch(url,now+HOUR);assert.equal(next.totalBatches,2);
 assert.equal(next.totalPlannedSessions,first.batch.sessions+next.batch.sessions);
 const shipping=executeBatch(url,now+6*HOUR);assert.equal(shipping.batch.phase,'Shipping drop-offs');
 const mobile=executeBatch(url,now+12*HOUR);assert.equal(mobile.batch.phase,'Mobile issues');
 const recovery=executeBatch(url,now+18*HOUR);assert.equal(recovery.batch.phase,'Recovery');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
