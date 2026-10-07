import test from 'node:test';
import assert from 'node:assert/strict';
import {canSaveSyncedSnapshot} from '../shared/shopifySync.ts';
test('background sync cannot publish after disconnect or a replacement installation',()=>{
 assert.equal(canSaveSyncedSnapshot(200,100,undefined),true);
 assert.equal(canSaveSyncedSnapshot(200,undefined,undefined),false);
 assert.equal(canSaveSyncedSnapshot(200,100,200),false);
 assert.equal(canSaveSyncedSnapshot(200,100,150),false);
 assert.equal(canSaveSyncedSnapshot(200,250,150),false);
 assert.equal(canSaveSyncedSnapshot(300,250,150),true);
});
