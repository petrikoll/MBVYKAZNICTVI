import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('clients load first and record fallbacks run concurrently with bounded retries', () => {
  const clientsStart = source.indexOf('const fetchClients = async () => {');
  const clientsEnd = source.indexOf('const clientIndex = useMemo', clientsStart);
  const clientsBlock = source.slice(clientsStart, clientsEnd);

  assert.ok(clientsStart >= 0 && clientsEnd > clientsStart);
  assert.match(clientsBlock, /fetchGoogleSheetAction\('listClients', 1\)/);
  assert.match(clientsBlock, /window\.setTimeout\(fetchClients, 8000\)/);
  assert.match(clientsBlock, /\['bootstrapCore', 'bootstrapAuxiliary'\]/);
  assert.match(clientsBlock, /fetchGoogleSheetAction\(action, 1\)/);
  assert.doesNotMatch(clientsBlock, /fetchGoogleSheetAction\('listPerformances'\)/);

  const recordsStart = source.indexOf('const fetchSheetRecords = async () => {');
  const recordsEnd = source.indexOf('fetchSheetRecords();', recordsStart);
  const recordsBlock = source.slice(recordsStart, recordsEnd);
  assert.match(recordsBlock, /const \[performances, meetings, plans\] = await Promise\.all/);
  assert.match(recordsBlock, /const \[networkMeetings, partners, education, supervision, statistics\] = await Promise\.all/);
  assert.match(recordsBlock, /scheduleFailedActionRecovery/);
  assert.match(recordsBlock, /timeoutMs: 20000/);
  assert.match(recordsBlock, /fetchGoogleSheetAction\(action, 1, timeoutMs\)/);
  assert.match(recordsBlock, /const bootstrapSources = \[/);
  assert.match(recordsBlock, /const bootstrapPrefetched = prefetchedSheetActionsRef\.current\.get\('bootstrapSections'\)/);
});
