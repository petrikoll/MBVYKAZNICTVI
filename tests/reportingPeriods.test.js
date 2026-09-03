import assert from 'node:assert/strict';
import test from 'node:test';

import { PROJECT_END_DATE, PROJECT_START_DATE, REPORTING_PERIODS } from '../src/config/projectConfig.js';
import { isDateWithinReportingPeriod } from '../src/lib/reportingPeriod.js';

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

test('dashboard nezapočítá chybné, mimoprojektové ani budoucí datum', () => {
  const all = REPORTING_PERIODS.find((period) => period.value === 'all');
  const options = {
    projectStartDate: PROJECT_START_DATE,
    projectEndDate: PROJECT_END_DATE,
    referenceDate: '2026-09-03'
  };

  assert.equal(isDateWithinReportingPeriod('', all, options), false);
  assert.equal(isDateWithinReportingPeriod('2026-02-30', all, options), false);
  assert.equal(isDateWithinReportingPeriod('2026-06-30', all, options), false);
  assert.equal(isDateWithinReportingPeriod('2026-08-31', all, options), true);
  assert.equal(isDateWithinReportingPeriod('2026-09-04', all, options), false);
  assert.equal(isDateWithinReportingPeriod('2028-07-01', all, options), false);
});

test('konkrétní období je omezené také dnešním datem', () => {
  const period = REPORTING_PERIODS.find((item) => item.value === '2026-07_2026-12');
  const options = {
    projectStartDate: PROJECT_START_DATE,
    projectEndDate: PROJECT_END_DATE,
    referenceDate: '2026-09-03'
  };

  assert.equal(isDateWithinReportingPeriod('2026-08-31', period, options), true);
  assert.equal(isDateWithinReportingPeriod('2026-10-01', period, options), false);
});
