import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyDate} from '../shared/journeyDate.ts';
test('recent dates use local calendar days and 24-hour time', () => {
  const now = new Date(2026,9,7,0,5);
  assert.equal(journeyDate(new Date(2026,9,7,0,1).getTime(),now), 'Today, 00:01');
  assert.equal(journeyDate(new Date(2026,9,6,19,35).getTime(),now), 'Yesterday, 19:35');
  assert.ok(!journeyDate(new Date(2026,9,5,19,35).getTime(),now).includes('Today'));
});
test('yesterday crosses month and year boundaries correctly', () => {
  assert.equal(journeyDate(new Date(2025,11,31,19,35).getTime(),new Date(2026,0,1,8)), 'Yesterday, 19:35');
});
