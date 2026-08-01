import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { DEFAULT_ACTIVITIES, DEFAULT_SETTINGS, getContractTerms } from '../src/features/work-reports/projectDefaults.js';
import { distributeHours, getHoursStatus, roundActivityHours } from '../src/features/work-reports/reportUtils.mjs';
import { getVacationOverview } from '../src/features/work-reports/vacationUtils.mjs';
import { buildWorkReportWorkbook } from '../src/features/work-reports/workbookExport.mjs';
import { getAutomaticWorkReportActivity } from '../src/features/work-reports/autoActivity.mjs';

test('generátor používá dvě základní činnosti a správné smluvní fondy', () => {
  assert.equal(DEFAULT_ACTIVITIES.length, 2);
  assert.deepEqual(getContractTerms({ year: 2026, month: 7 }), { contractType: 'DPP', monthlyHours: 24 });
  assert.deepEqual(getContractTerms({ year: 2027, month: 10 }), { contractType: 'DPČ', monthlyHours: 32 });
  assert.deepEqual(getContractTerms({ year: 2028, month: 6 }), { contractType: 'DPP', monthlyHours: 32 });
});

test('dovolená snižuje pracovní fond a činnosti se přesně dorovnají', () => {
  const period = { year: 2027, month: 10, key: '2027-10' };
  const vacation = getVacationOverview({ period, vacationByPeriod: { '2027-10': 8 }, vacationWeeks: 5 });
  const activities = distributeHours(DEFAULT_ACTIVITIES, 24);
  assert.equal(vacation.currentMonthVacation, 8);
  assert.equal(getHoursStatus(activities, 24).isBalanced, true);
});

test('hodiny činností se rozdělují po praktických půlhodinách', () => {
  assert.equal(roundActivityHours(2.66), 2.5);
  assert.deepEqual(distributeHours(DEFAULT_ACTIVITIES, 24).map((activity) => activity.hours), [14, 10]);
  assert.deepEqual(distributeHours(DEFAULT_ACTIVITIES, 32).map((activity) => activity.hours), [18.5, 13.5]);
});

test('integrovaný export vytvoří XLSX z projektové šablony', async () => {
  const templateBuffer = await readFile(new URL('../src/assets/SABLONA_Pracovni_vykaz_OPZ.xlsx', import.meta.url));
  const period = { year: 2026, month: 7, key: '2026-07' };
  const activities = distributeHours(DEFAULT_ACTIVITIES, 24);
  const workbook = await buildWorkReportWorkbook({
    templateBuffer,
    period,
    settings: { ...DEFAULT_SETTINGS, ...getContractTerms(period) },
    activities,
    workingDays: 23,
    workedHours: 24,
    vacationHours: 0,
  });
  assert.equal(workbook.worksheets[0].getCell('C9').value, DEFAULT_SETTINGS.employeeName);
  assert.equal(workbook.worksheets[0].getCell('G29').value, 24);
});

test('uložené porady, vzdělávání a supervize vytvoří třetí činnost paní Vysloužilové', () => {
  const records = [
    { entityType: 'education_records', activityDate: '2026-08-05', payload: { hours: '3,5', workers: ['Bc. Vysloužilová'] } },
    { entityType: 'supervision_records', activityDate: '2026-08-12', payload: { hours: '2', workers: ['Mgr. Radka Vysloužilová'] } },
    { entityType: 'network_activities', activityDate: '2026-08-19', payload: { type: 'Porada', startTime: '09:00', endTime: '10:30', rtMembers: ['Mgr. Radka Vysloužilová'] } },
    { entityType: 'education_records', activityDate: '2026-07-04', payload: { hours: '8', workers: ['Mgr. Radka Vysloužilová'] } },
    { entityType: 'supervision_records', activityDate: '2026-08-20', payload: { hours: '5', workers: ['Jiný pracovník'] } },
  ];
  const activity = getAutomaticWorkReportActivity({
    records,
    period: { year: 2026, month: 8 },
    employeeName: 'Mgr. Radka Vysloužilová, DiS.',
  });
  assert.equal(activity.hours, 7);
  assert.equal(activity.entries.length, 3);
  assert.match(activity.desc, /05\. 08\. 2026 – vzdělávání \(3,5 h\)/);
  assert.match(activity.desc, /19\. 08\. 2026 – porada \(1,5 h\)/);
  assert.match(activity.desc, /Celkem 7 h/);
});
