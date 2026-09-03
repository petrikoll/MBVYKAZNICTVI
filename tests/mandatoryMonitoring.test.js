import assert from 'node:assert/strict';
import test from 'node:test';

import {
  automaticClientMonitoring,
  buildMandatoryMonitoringOverview,
  buildMandatoryMonitoringXlsx
} from '../src/lib/mandatoryMonitoring.js';

const clients = [
  { id: 'client-1', fullName: 'Anna Nováková', znevyhodneni: 'národnostní menšiny' },
  { id: 'client-2', fullName: 'Boris Svoboda', znevyhodneni: 'osoby se zdravotním postižením' }
];

const workRecords = [
  {
    id: 'plan-1',
    entityType: 'plans',
    clientId: 'client-1',
    activityDate: '2026-08-05',
    goals: [
      { goalStatus: 'partially_completed', goalEvaluation: 'Dílčí posun' },
      { goalStatus: 'open' }
    ],
    finalEvaluation: ''
  },
  {
    id: 'counselling-1',
    entityType: 'consultations',
    clientId: 'client-1',
    activityDate: '2026-08-10',
    payload: { consultationType: 'Základní sociální poradenství' }
  },
  {
    id: 'plan-2',
    entityType: 'plans',
    clientId: 'client-2',
    activityDate: '2027-02-03',
    goals: [
      { goalStatus: 'completed', goalEvaluation: 'Splněno' },
      { goalStatus: 'completed', goalEvaluation: 'Splněno' }
    ],
    finalEvaluation: 'Individuální plán byl splněn.'
  },
  {
    id: 'other-support',
    entityType: 'consultations',
    clientId: 'client-2',
    activityDate: '2027-02-04',
    payload: { consultationType: 'Doprovázení' }
  }
];

test('pozitivní změna se načte ze splněného nebo částečně splněného cíle', () => {
  const monitoring = automaticClientMonitoring({ client: clients[0], workRecords });
  assert.equal(monitoring.entries.lifestyleChange.achieved, true);
  assert.equal(monitoring.entries.lifestyleChange.date, '2026-08-05');
  assert.equal(monitoring.entries.independentSolution.achieved, false);
});

test('získání informací se načte jen ze základního sociálního poradenství', () => {
  const first = automaticClientMonitoring({ client: clients[0], workRecords });
  const second = automaticClientMonitoring({ client: clients[1], workRecords });
  assert.equal(first.entries.informationReceived.achieved, true);
  assert.equal(second.entries.informationReceived.achieved, false);
});

test('zvýšení samostatnosti vyžaduje splnění celého IP a závěrečné vyhodnocení', () => {
  const monitoring = automaticClientMonitoring({ client: clients[1], workRecords });
  assert.equal(monitoring.entries.individualPlan.achieved, true);
  assert.equal(monitoring.entries.independentSolution.achieved, true);
  assert.equal(monitoring.entries.independentSolution.date, '2027-02-03');
});

test('souhrn respektuje období a počítá kvalifikovaný odhad z národnostních menšin', () => {
  const overview = buildMandatoryMonitoringOverview({
    clients,
    workRecords,
    period: { start: '2026-07-01', end: '2026-12-31' }
  });
  const counts = Object.fromEntries(overview.summary.map((item) => [item.key, item.count]));

  assert.equal(counts.lifestyleChange, 1);
  assert.equal(counts.informationReceived, 1);
  assert.equal(counts.individualPlan, 1);
  assert.equal(counts.independentSolution, 0);
  assert.equal(counts.romEstimate, 1);
});

test('automatický monitoring lze exportovat do XLSX', async () => {
  const result = await buildMandatoryMonitoringXlsx({ clients, workRecords });
  assert.equal(result.summary.find((item) => item.key === 'independentSolution')?.count, 1);
  assert.ok(result.buffer.byteLength > 0);
  const ExcelModule = await import('exceljs');
  const ExcelJS = ExcelModule.default || ExcelModule;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.buffer);
  const detailSheet = workbook.getWorksheet('Započtené osoby');
  assert.ok(detailSheet.getCell('E2').value instanceof Date);
  assert.equal(detailSheet.getCell('E2').numFmt, 'dd.mm.yyyy');
  assert.equal(detailSheet.pageSetup.fitToWidth, 1);
  assert.equal(detailSheet.pageSetup.orientation, 'landscape');
});
