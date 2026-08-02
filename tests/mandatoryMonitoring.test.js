import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMandatoryMonitoringOverview,
  buildMandatoryMonitoringXlsx,
  effectiveClientMonitoring
} from '../src/lib/mandatoryMonitoring.js';

const clients = [
  { id: 'client-1', fullName: 'Anna Nováková' },
  { id: 'client-2', fullName: 'Boris Svoboda' }
];

const monitoringRecords = [
  {
    id: 'monitoring-1',
    clientId: 'client-1',
    payload: {
      entries: {
        lifestyleChange: { achieved: true, date: '2026-08-10', evidence: 'Vyhodnocení podpory' },
        informationReceived: { achieved: true, date: '2026-08-12', evidence: 'Předány kontakty' },
        independentSolution: { achieved: false, date: '', evidence: '' }
      }
    }
  },
  {
    id: 'monitoring-2',
    clientId: 'client-2',
    payload: {
      entries: {
        lifestyleChange: { achieved: true, date: '2027-02-03', evidence: 'Změna návyků' },
        informationReceived: { achieved: true, date: '', evidence: '' },
        independentSolution: { achieved: false, date: '', evidence: '' }
      }
    }
  }
];

const workRecords = [
  { id: 'plan-1', entityType: 'plans', clientId: 'client-1', activityDate: '2026-08-05', title: 'Individuální plán podpory' }
];

test('monitoring počítá osobu jednou v každé splněné položce a dovolí ji v několika položkách', () => {
  const overview = buildMandatoryMonitoringOverview({ clients, monitoringRecords, workRecords, romEstimate: 1 });
  const counts = Object.fromEntries(overview.summary.map((item) => [item.key, item.count]));

  assert.equal(counts.lifestyleChange, 2);
  assert.equal(counts.informationReceived, 1);
  assert.equal(counts.individualPlan, 1);
  assert.equal(counts.romEstimate, 1);
  assert.equal(overview.details.filter((row) => row.clientId === 'client-1').length, 3);
});

test('individuální plán se přebírá automaticky z existujícího záznamu', () => {
  const effective = effectiveClientMonitoring({ client: clients[0], monitoringRecords, workRecords });
  assert.equal(effective.entries.individualPlan.achieved, true);
  assert.equal(effective.entries.individualPlan.date, '2026-08-05');
});

test('neúplný ruční záznam se nezapočítá a období omezuje započtené osoby', () => {
  const overview = buildMandatoryMonitoringOverview({
    clients,
    monitoringRecords,
    workRecords,
    period: { start: '2026-07-01', end: '2026-12-31' }
  });
  const counts = Object.fromEntries(overview.summary.map((item) => [item.key, item.count]));

  assert.equal(counts.lifestyleChange, 1);
  assert.equal(counts.informationReceived, 1);
  assert.equal(overview.incompleteCount, 1);
});

test('kvalifikovaný odhad Romů zůstává jen v souhrnu a není připsán konkrétním osobám', async () => {
  const overview = buildMandatoryMonitoringOverview({ clients, monitoringRecords, workRecords, romEstimate: 1 });
  assert.equal(overview.details.some((row) => row.itemKey === 'romEstimate'), false);

  const result = await buildMandatoryMonitoringXlsx({ clients, monitoringRecords, workRecords, romEstimate: 1 });
  assert.deepEqual(result.summary.find((item) => item.key === 'romEstimate')?.count, 1);
  assert.ok(result.buffer.byteLength > 0);
});
