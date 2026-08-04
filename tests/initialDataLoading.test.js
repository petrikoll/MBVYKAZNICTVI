import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('clients load first and records prefer one cached bootstrap with a sequential fallback', () => {
  const clientsStart = source.indexOf('const fetchClients = async () => {');
  const clientsEnd = source.indexOf('const clientIndex = useMemo', clientsStart);
  const clientsBlock = source.slice(clientsStart, clientsEnd);

  assert.ok(clientsStart >= 0 && clientsEnd > clientsStart);
  assert.match(clientsBlock, /fetchGoogleSheetAction\('listClients'\)/);
  assert.match(clientsBlock, /fetchGoogleSheetAction\('bootstrap', 1\)/);
  assert.doesNotMatch(clientsBlock, /fetchGoogleSheetAction\('listPerformances'\)/);

  const recordsStart = source.indexOf('const fetchSheetRecords = async () => {');
  const recordsEnd = source.indexOf('fetchSheetRecords();', recordsStart);
  const recordsBlock = source.slice(recordsStart, recordsEnd);
  const performanceAwait = recordsBlock.indexOf('const performances = await performancesPromise;');
  const meetingsAwait = recordsBlock.indexOf("const meetings = await loadAction('listMeetings'");
  const plansAwait = recordsBlock.indexOf("const plans = await loadAction('listIndividualPlans'");
  const supervisionAwait = recordsBlock.indexOf("const supervision = await loadAction('listSupervision'");

  assert.ok(performanceAwait >= 0);
  assert.ok(meetingsAwait > performanceAwait);
  assert.ok(plansAwait > meetingsAwait);
  assert.ok(supervisionAwait > plansAwait);
  assert.doesNotMatch(recordsBlock, /Promise\.all/);
  assert.match(recordsBlock, /fetchGoogleSheetAction\(action, 1\)/);
  assert.match(recordsBlock, /const bootstrapSources = \[/);
  assert.match(recordsBlock, /const bootstrapPrefetched = prefetchedSheetActionsRef\.current\.get\('bootstrap'\)/);
});
