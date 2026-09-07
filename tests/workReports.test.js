import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { DEFAULT_ACTIVITIES, DEFAULT_SETTINGS, getAvailableMonths, getContractTerms } from '../src/features/work-reports/projectDefaults.js';
import { balanceHours, distributeHours, getHoursStatus, getWorkingDays, roundActivityHours } from '../src/features/work-reports/reportUtils.mjs';
import { getPlannedHoursForYear, getVacationOverview } from '../src/features/work-reports/vacationUtils.mjs';
import { buildWorkReportWorkbook } from '../src/features/work-reports/workbookExport.mjs';
import { getAutomaticWorkReportActivity } from '../src/features/work-reports/autoActivity.mjs';

test('generátor používá dvě základní činnosti a správné smluvní fondy', () => {
  assert.equal(DEFAULT_ACTIVITIES.length, 2);
  for (const period of getAvailableMonths()) {
    assert.deepEqual(getContractTerms(period), {
      contractType: period.year === 2027 && period.month >= 10 ? 'DPČ' : 'DPP',
      monthlyHours: period.year === 2026 && period.month <= 8 ? 25 : 32,
    }, period.key);
  }
});

test('podklady pro dovolenou zahrnují 25 hodin za červenec i srpen 2026', () => {
  assert.equal(getPlannedHoursForYear(2026, 7), 25);
  assert.equal(getPlannedHoursForYear(2026, 8), 50);
  assert.equal(getPlannedHoursForYear(2026, 9), 82);
  assert.equal(getPlannedHoursForYear(2026), 178);
  assert.equal(getPlannedHoursForYear(2027), 384);
  assert.equal(getPlannedHoursForYear(2028), 192);
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
  assert.deepEqual(distributeHours(DEFAULT_ACTIVITIES, 25).map((activity) => activity.hours), [14.5, 10.5]);
  assert.deepEqual(distributeHours(DEFAULT_ACTIVITIES, 32).map((activity) => activity.hours), [18.5, 13.5]);
  assert.equal(getHoursStatus(balanceHours(distributeHours(DEFAULT_ACTIVITIES, 24), 25), 25).isBalanced, true);
});

test('fond 25 hodin se rozdělí mezi dovolenou, základní a automatickou činnost', () => {
  const period = { year: 2026, month: 8, key: '2026-08' };
  const { monthlyHours } = getContractTerms(period);
  const vacation = getVacationOverview({ period, vacationByPeriod: { '2026-08': 2 } });
  const automaticActivity = getAutomaticWorkReportActivity({
    period,
    employeeName: DEFAULT_SETTINGS.employeeName,
    records: [{ entityType: 'education_records', activityDate: '2026-08-05', payload: { hours: '3,5', workers: [DEFAULT_SETTINGS.employeeName] } }],
  });
  const workTargetHours = monthlyHours - vacation.currentMonthVacation;
  const activities = [
    ...distributeHours(DEFAULT_ACTIVITIES, workTargetHours - automaticActivity.hours),
    automaticActivity,
  ];
  assert.equal(workTargetHours, 23);
  assert.equal(getHoursStatus(activities, workTargetHours).isBalanced, true);
  assert.equal(getHoursStatus(activities, workTargetHours).actual + vacation.currentMonthVacation, 25);
});

for (const month of [7, 8]) {
  test(`integrovaný export pro měsíc ${month}/2026 zapíše fond 25 hodin do XLSX`, async () => {
    const templateBuffer = await readFile(new URL('../src/assets/SABLONA_Pracovni_vykaz_OPZ.xlsx', import.meta.url));
    const period = { year: 2026, month, key: `2026-${String(month).padStart(2, '0')}` };
    const settings = { ...DEFAULT_SETTINGS, ...getContractTerms(period) };
    const activities = distributeHours(DEFAULT_ACTIVITIES, settings.monthlyHours);
    const workbook = await buildWorkReportWorkbook({
      templateBuffer,
      period,
      settings,
      activities,
      workingDays: getWorkingDays(month, period.year),
      workedHours: getHoursStatus(activities, settings.monthlyHours).actual,
      vacationHours: 0,
    });
    assert.equal(workbook.worksheets[0].getCell('C9').value, DEFAULT_SETTINGS.employeeName);
    for (const address of ['G11', 'G13', 'G28', 'G29', 'G40', 'G41']) {
      assert.equal(workbook.worksheets[0].getCell(address).value, 25, address);
    }
    assert.equal(workbook.worksheets[0].getCell('G17').value, 14.5);
    assert.equal(workbook.worksheets[0].getCell('G18').value, 10.5);
    assert.ok(workbook.worksheets[0].getCell('C44').value instanceof Date);
    assert.equal(workbook.worksheets[0].getCell('C44').numFmt, 'dd.mm.yyyy');
    assert.equal(workbook.worksheets[0].pageSetup.fitToWidth, 1);
    assert.equal(workbook.worksheets[0].pageSetup.fitToHeight, 1);
    assert.equal(workbook.worksheets[0].pageSetup.printArea, 'A1:G45');
  });
}

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
