import assert from 'node:assert/strict';
import test from 'node:test';

import { PROJECT_END_DATE, PROJECT_START_DATE, REPORTING_PERIODS } from '../src/config/projectConfig.js';

test('monitorovací období pokrývají celý projekt od července 2026 do června 2028', () => {
  const periods = REPORTING_PERIODS.filter((period) => period.value !== 'all');

  assert.equal(PROJECT_START_DATE, '2026-07-01');
  assert.equal(PROJECT_END_DATE, '2028-06-30');
  assert.equal(periods[0].start, PROJECT_START_DATE);
  assert.equal(periods.at(-1).end, PROJECT_END_DATE);
  assert.deepEqual(periods.map((period) => period.label), [
    '07/2026 - 12/2026',
    '01/2027 - 06/2027',
    '07/2027 - 12/2027',
    '01/2028 - 06/2028'
  ]);
});

test('monitorovací období na sebe navazují bez mezery nebo překryvu', () => {
  const periods = REPORTING_PERIODS.filter((period) => period.value !== 'all');

  for (let index = 1; index < periods.length; index += 1) {
    const previousEnd = new Date(`${periods[index - 1].end}T00:00:00Z`);
    previousEnd.setUTCDate(previousEnd.getUTCDate() + 1);
    assert.equal(previousEnd.toISOString().slice(0, 10), periods[index].start);
  }
});
