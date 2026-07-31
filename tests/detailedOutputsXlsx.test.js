import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDetailedOutputRows, buildDetailedOutputsXlsx, isTelephoneRecord } from '../src/lib/detailedOutputsXlsx.js';

const clients = [
  { id: 'K1', fullName: 'Anna Nováková' },
  { id: 'K2', fullName: 'Petr Svoboda' }
];

const records = [
  {
    id: 'R1', clientId: 'K1', clientIds: ['K1'], activityDate: '2026-07-10', ka: 'KA1', worker: 'Pracovník',
    payload: { startTime: '09:00', endTime: '09:30', durationMinutes: 30, consultationType: 'Poradenství', supportArea: 'bydlení', place: 'Telefonní' },
    documentText: 'Telefonická konzultace.'
  },
  {
    id: 'R2', clientId: 'K1', clientIds: ['K1'], activityDate: '2026-07-11', ka: 'KA1', worker: 'Pracovník',
    payload: { durationMinutes: 90, consultationType: 'Terénní sociální práce', supportArea: 'služby', place: 'terénní' }
  },
  {
    id: 'R3', clientId: 'K2', clientIds: ['K2'], activityDate: '2026-07-12', ka: 'KA2', worker: 'Pracovník',
    payload: { durationMinutes: 60, consultationType: 'Koordinace', supportArea: 'zdraví', place: 'ambulantní' }
  }
];

test('podrobný export rozdělí telefonickou a ostatní podporu klienta', () => {
  const result = buildDetailedOutputRows(records, clients);
  const anna = result.clientRows.find((row) => row.clientId === 'K1');

  assert.equal(result.detailedRows.length, 3);
  assert.deepEqual(anna, {
    clientId: 'K1',
    clientName: 'Anna Nováková',
    totalCount: 2,
    totalHours: 2,
    telephoneCount: 1,
    telephoneHours: 0.5,
    otherCount: 1,
    otherHours: 1.5
  });
});

test('telefonický výkon se pozná bez ohledu na velikost písmen a diakritiku', () => {
  assert.equal(isTelephoneRecord({ payload: { place: 'TELEFONNÍ' } }), true);
  assert.equal(isTelephoneRecord({ payload: { place: 'terénní' } }), false);
});

test('XLSX sešit obsahuje oba základní listy', async () => {
  const result = await buildDetailedOutputsXlsx({ records, clients, filterLabel: 'Období: test' });
  const ExcelModule = await import('exceljs');
  const ExcelJS = ExcelModule.default || ExcelModule;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.buffer);

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Podrobné výkony', 'Klienti a podpora']);
  assert.equal(result.performanceCount, 3);
  assert.equal(result.clientCount, 2);
});
