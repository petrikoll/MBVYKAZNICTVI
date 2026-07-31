import test from 'node:test';
import assert from 'node:assert/strict';

import { PROJECT_TIME_OPTIONS, buildHalfHourTimeOptions } from '../src/lib/timeOptions.js';

test('časová nabídka výkonů KA1 a KA2 končí v 18:00', () => {
  assert.equal(PROJECT_TIME_OPTIONS[0], '7:00');
  assert.equal(PROJECT_TIME_OPTIONS.at(-1), '18:00');
  assert.equal(PROJECT_TIME_OPTIONS.length, 23);
});

test('časová nabídka používá půlhodinové kroky', () => {
  assert.deepEqual(buildHalfHourTimeOptions(17, 18), ['17:00', '17:30', '18:00']);
});
