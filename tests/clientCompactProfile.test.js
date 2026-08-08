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
  assert.match(timelineSlice, /Podpory podle typu/);
  assert.doesNotMatch(appSource, /<Panel\s+title="Podpory podle typu"/);
});

test('úprava klienta a AI souhrn jsou v samostatných dialozích', () => {
  assert.match(appSource, /showClientEditForm && selectedClient/);
  assert.match(appSource, /aria-labelledby="client-edit-dialog-title"/);
  assert.match(appSource, /showClientCaseSummaryDialog && selectedClient/);
  assert.match(appSource, /aria-labelledby="client-summary-dialog-title"/);
  assert.match(appSource, /setShowClientCaseSummaryDialog\(true\)/);
});
