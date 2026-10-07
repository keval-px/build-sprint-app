import test from 'node:test';
import assert from 'node:assert/strict';
import {sortJourneys} from '../shared/journeySort.ts';

const rows = [{id:'unknown',startedAt:4}, {id:'zero',startedAt:3,basketCents:0}, {id:'high',startedAt:2,basketCents:200}, {id:'low',startedAt:1,basketCents:100}];
test('sorts dates in both directions without changing the source rows', () => {
  assert.deepEqual(sortJourneys(rows,'newest').map(row=>row.id), ['unknown','zero','high','low']);
  assert.deepEqual(sortJourneys(rows,'oldest').map(row=>row.id), ['low','high','zero','unknown']);
  assert.equal(rows[0].id, 'unknown');
});
test('basket sorts keep unknown last and zero as a recorded value', () => {
  assert.deepEqual(sortJourneys(rows,'value-high').map(row=>row.id), ['high','low','zero','unknown']);
  assert.deepEqual(sortJourneys(rows,'value-low').map(row=>row.id), ['zero','low','high','unknown']);
});
