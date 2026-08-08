import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('pravá strana klienta používá kompaktní profil a souhrn osy', () => {
  const profileStart = appSource.indexOf('title={selectedClient.fullName}');
  const timelineStart = appSource.indexOf('title="Klientská osa"', profileStart);
  const timelineSlice = appSource.slice(timelineStart, timelineStart + 9000);

  assert.ok(profileStart >= 0 && timelineStart > profileStart);
  assert.match(appSource.slice(profileStart, timelineStart), /compact/);
  assert.match(appSource.slice(profileStart, timelineStart), /Další údaje klienta/);
  assert.match(timelineSlice, /clientJourneyTimeline\.length\} záznamů/);
  assert.match(timelineSlice, /formatSupportMinutes\(selectedClientSupportBreakdown\.totalMinutes\)/);
  assert.doesNotMatch(timelineSlice, /Podpory podle typu/);
  assert.doesNotMatch(appSource, /<Panel\s+title="Podpory podle typu"/);
});

test('záznamy klientské osy mají kompaktní světlé uspořádání', () => {
  assert.match(appSource, /grid-cols-\[20px_minmax\(0,1fr\)\]/);
  assert.match(appSource, /bg-slate-100 p-2\.5 pl-3\.5 shadow-sm/);
  assert.match(appSource, /\{meta\.stage\} · \{meta\.label\}/);
  assert.match(appSource, /formatDateLabel\(record\.activityDate\)/);
  assert.doesNotMatch(appSource, /md:grid-cols-\[72px_96px_24px_minmax\(0,1fr\)\]/);
});

test('úprava klienta a AI souhrn jsou v samostatných dialozích', () => {
  assert.match(appSource, /showClientEditForm && selectedClient/);
  assert.match(appSource, /aria-labelledby="client-edit-dialog-title"/);
  assert.match(appSource, /showClientCaseSummaryDialog && selectedClient/);
  assert.match(appSource, /aria-labelledby="client-summary-dialog-title"/);
  assert.match(appSource, /setShowClientCaseSummaryDialog\(true\)/);
});
