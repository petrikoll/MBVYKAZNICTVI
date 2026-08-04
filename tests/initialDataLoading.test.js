import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('clients and record batches start concurrently with bounded retries', () => {
  const bootstrapStart = source.indexOf("const corePrefetch = prefetchAction('bootstrapFast')");
  const clientsStart = source.indexOf('const fetchClients = async () => {');
  const clientsEnd = source.indexOf('const clientIndex = useMemo', clientsStart);
  const clientsBlock = source.slice(clientsStart, clientsEnd);

  assert.ok(bootstrapStart >= 0 && clientsStart > bootstrapStart && clientsEnd > clientsStart);
  assert.match(clientsBlock, /fetchGoogleSheetAction\('listClientDirectory', 1, 30000\)/);
  assert.match(clientsBlock, /fetchGoogleSheetAction\('listClients', 1\)/);
  assert.match(clientsBlock, /window\.setTimeout\(fetchClients, consecutiveFailures === 1 \? 1000 : 8000\)/);
  assert.match(source.slice(bootstrapStart, clientsStart), /prefetchAction\('bootstrapAuxiliary'\)/);
  assert.match(source.slice(bootstrapStart, clientsStart), /corePrefetch\.then\(\(\) => prefetchAction\('listIndividualPlans'\)\)/);
  assert.doesNotMatch(clientsBlock, /fetchGoogleSheetAction\('listPerformances'\)/);

  const recordsStart = source.indexOf('const fetchSheetRecords = async () => {');
  const recordsEnd = source.indexOf('fetchSheetRecords();', recordsStart);
  const recordsBlock = source.slice(recordsStart, recordsEnd);
  assert.match(recordsBlock, /processProgressiveBootstrap\('bootstrapFast', coreSources\)/);
  assert.match(recordsBlock, /processProgressiveBootstrap\('bootstrapAuxiliary', auxiliarySources\)/);
  assert.match(recordsBlock, /loadSingleProgressiveSource\(plansSource\)/);
  assert.match(recordsBlock, /applySingleProgressiveSource/);
  assert.match(recordsBlock, /scheduleFailedActionRecovery/);
  assert.match(recordsBlock, /timeoutMs: 20000/);
  assert.match(recordsBlock, /fetchGoogleSheetAction\(action, 1, timeoutMs\)/);
  assert.match(recordsBlock, /const progressiveSources = \[/);
  assert.match(recordsBlock, /prefetchedSheetActionsRef\.current\.get\(groupAction\)/);
  assert.match(source, /const canLoadSheetRecords = Boolean\(GOOGLE_SHEET_MACRO_URL\);/);
  assert.match(source, /if \(!canLoadSheetRecords \|\| !GOOGLE_SHEET_MACRO_URL/);
  assert.match(source, /\}, \[canLoadSheetRecords\]\);/);
  assert.doesNotMatch(source, /\}, \[clients, clientIndex\]\);/);
  assert.match(source, /const GOOGLE_SHEET_REQUEST_TIMEOUT_MS = 65000;/);
});
