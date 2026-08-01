import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalyticsRows,
  buildAnalyticsSummary,
  buildClientSupportDistribution,
  filterAnalyticsRows,
  getAnalyticsContactKind,
  groupAnalyticsByDimension,
  groupAnalyticsByMonth
} from '../src/lib/reportingAnalytics.js';

const clients = [
  { id: 'c1', fullName: 'Anna Nováková' },
  { id: 'c2', fullName: 'Petr Dvořák' }
];

const records = [
  {
    id: 'r1', entityType: 'consultations', activityDate: '2026-07-03', clientId: 'c1', worker: 'Lea Ledecká, Dis.',
    payload: { consultationType: 'Terénní sociální práce', supportArea: 'Bydlení', durationMinutes: 90, place: 'Terén', outcome: 'Domluven další postup', linkedPlanGoalId: 'g1', linkedPlanGoalLabel: 'Udržet bydlení' }
  },
  {
    id: 'r2', entityType: 'consultations', activityDate: '2026-07-10', clientId: 'c1', worker: 'Lea Ledecká, Dis.',
    payload: { consultationType: 'Základní sociální poradenství', supportArea: 'Finance/dluhy', durationMinutes: 30, place: 'Telefonicky', linkedPlanGoalId: 'one-time-order' }
  },
  {
    id: 'r3', entityType: 'consultations', activityDate: '2026-08-01', clientId: 'c2', worker: 'Bc. Josef Jakubec',
    payload: { consultationType: 'Depistáž', supportArea: '', durationMinutes: 45, supportSpecific: { physicalRecordComment: 'Doplněn komentář' } }
  }
];

test('analytické řádky rozpoznají klienta, telefonický výkon a vazbu na cíl', () => {
  const rows = buildAnalyticsRows(records, clients);
  assert.equal(rows[0].clientLabel, 'Anna Nováková');
  assert.equal(rows[0].contactKind, 'field');
  assert.equal(rows[0].goalLinkKind, 'linked');
  assert.equal(rows[1].contactKind, 'telephone');
  assert.equal(rows[1].goalLinkKind, 'one-time');
  assert.equal(rows[2].hasOutcome, true);
});

test('kombinované analytické filtry vracejí pouze odpovídající výkony', () => {
  const rows = buildAnalyticsRows(records, clients);
  const filtered = filterAnalyticsRows(rows, { clientId: 'c1', supportArea: 'Bydlení', contactKind: 'field' });
  assert.deepEqual(filtered.map((row) => row.key), ['r1']);
  assert.deepEqual(filterAnalyticsRows(rows, { supportArea: 'Neuvedeno' }).map((row) => row.key), ['r3']);
  assert.deepEqual(filterAnalyticsRows(rows, { smartFilter: 'missing-area' }).map((row) => row.key), ['r3']);
  assert.deepEqual(filterAnalyticsRows(rows, { smartFilter: 'outreach-comment' }).map((row) => row.key), ['r3']);
});

test('forma kontaktu používá pouze terénní, ambulantní nebo telefonickou hodnotu', () => {
  assert.equal(getAnalyticsContactKind({ payload: { place: 'terénní' } }), 'field');
  assert.equal(getAnalyticsContactKind({ payload: { place: 'ambulantní' } }), 'ambulatory');
  assert.equal(getAnalyticsContactKind({ payload: { place: 'Telefonní' } }), 'telephone');
  assert.equal(getAnalyticsContactKind({ payload: {} }), 'ambulatory');
});

test('souhrn rozlišuje počet výkonů, čas a telefonickou podporu', () => {
  const summary = buildAnalyticsSummary(buildAnalyticsRows(records, clients));
  assert.equal(summary.performanceCount, 3);
  assert.equal(summary.totalHours, 2.75);
  assert.equal(summary.telephoneCount, 1);
  assert.equal(summary.uniqueClientCount, 2);
  assert.equal(summary.latestDate, '2026-08-01');
});

test('měsíční a oblastní graf lze přepnout z počtu na hodiny', () => {
  const rows = buildAnalyticsRows(records, clients);
  const monthly = groupAnalyticsByMonth(rows, 'hours');
  assert.equal(monthly.months.length, 2);
  assert.equal(monthly.months[0].month, '2026-07');
  assert.equal(monthly.months[0].total, 2);
  const areas = groupAnalyticsByDimension(rows, 'supportArea', 'count');
  assert.equal(areas.find((item) => item.label === 'Bydlení').value, 1);
  assert.equal(areas.find((item) => item.label === 'Neuvedeno').value, 1);
});

test('projektový přehled rozdělí klienty do pásem podpory', () => {
  const distribution = buildClientSupportDistribution(buildAnalyticsRows(records, clients));
  assert.equal(distribution.find((item) => item.key === 'under-10').value, 2);
  assert.equal(distribution.reduce((sum, item) => sum + item.value, 0), 2);
});
