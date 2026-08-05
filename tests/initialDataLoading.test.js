import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('startup loads clients independently while keeping other areas staged', () => {
  const prefetchStart = source.indexOf("const clientsPrefetch = prefetchAction('listClients', DEFERRED_DATA_TIMEOUT_MS)");
  const clientsStart = source.indexOf('const fetchClients = async () => {');
  const clientsEnd = source.indexOf('const clientIndex = useMemo', clientsStart);
  const clientsBlock = source.slice(clientsStart, clientsEnd);

  assert.ok(prefetchStart >= 0 && clientsStart > prefetchStart && clientsEnd > clientsStart);
  const startupPrefetchBlock = source.slice(source.indexOf('const prefetchAction ='), clientsStart);
  assert.match(startupPrefetchBlock, /const clientsPrefetch = prefetchAction\('listClients', DEFERRED_DATA_TIMEOUT_MS\)/);
  assert.match(startupPrefetchBlock, /prefetchedSheetActionsRef\.current\.set\('startupClientReady', clientsPrefetch\)/);
  assert.doesNotMatch(startupPrefetchBlock, /prefetchAction\('bootstrapFast'/);
  assert.match(clientsBlock, /const clientOutcome = await clientsPrefetch/);
  assert.match(clientsBlock, /Array\.isArray\(clientOutcome\.result\.clients\)/);
  assert.doesNotMatch(clientsBlock, /await corePrefetch/);
  assert.match(clientsBlock, /fetchGoogleSheetAction\('listClients', 1, DEFERRED_DATA_TIMEOUT_MS\)/);
  assert.doesNotMatch(clientsBlock, /listClientDirectory/);
  assert.match(clientsBlock, /const retryDelayMs = consecutiveFailures === 1 \? 1000 : consecutiveFailures === 2 \? 2000 : 8000/);
  assert.doesNotMatch(startupPrefetchBlock, /prefetchAction\('bootstrapAuxiliary'/);
  assert.doesNotMatch(clientsBlock, /fetchGoogleSheetAction\('listPerformances'\)/);

  const recordsStart = source.indexOf('const fetchSheetRecords = async () => {');
  const recordsEnd = source.indexOf('fetchSheetRecords();', recordsStart);
  const recordsBlock = source.slice(recordsStart, recordsEnd);
  assert.match(recordsBlock, /await startupClientReady/);
  assert.match(recordsBlock, /await loadSingleProgressiveSource\(performancesSource\)/);
  assert.match(recordsBlock, /await Promise\.all\(remainingCoreSources\.map\(loadSingleProgressiveSource\)\)/);
  assert.match(recordsBlock, /await loadSingleProgressiveSource\(plansSource\)/);
  assert.match(recordsBlock, /\.\.\.auxiliarySources\.map\(loadSingleProgressiveSource\)/);
  assert.doesNotMatch(recordsBlock, /processProgressiveBootstrap\('bootstrapFast'/);
  assert.doesNotMatch(recordsBlock, /processProgressiveBootstrap\('bootstrapAuxiliary'/);
  assert.match(recordsBlock, /\['listNetworkMeetings', 'listEducation', 'listSupervision', 'listStatistics'\]/);
  assert.match(recordsBlock, /loadSingleProgressiveSource\(plansSource\)/);
  assert.match(recordsBlock, /bootstrapContainsAction/);
  assert.match(recordsBlock, /applySingleProgressiveSource/);
  assert.match(recordsBlock, /scheduleFailedActionRecovery/);
  assert.match(recordsBlock, /action === 'listIndividualPlans'[\s\S]*?DEFERRED_DATA_TIMEOUT_MS[\s\S]*?: 20000/);
  assert.match(recordsBlock, /sourceTimeoutMs/);
  assert.match(recordsBlock, /recoveryTimeoutMs/);
  assert.match(recordsBlock, /fetchGoogleSheetAction\(action, 1, timeoutMs\)/);
  assert.match(recordsBlock, /const progressiveSources = \[/);
  assert.match(recordsBlock, /prefetchedSheetActionsRef\.current\.get\(groupAction\)/);
  assert.match(recordsBlock, /setSheetError\(''\)/);
  assert.match(source, /const canLoadSheetRecords = Boolean\(GOOGLE_SHEET_MACRO_URL\);/);
  assert.match(source, /if \(!canLoadSheetRecords \|\| !GOOGLE_SHEET_MACRO_URL/);
  assert.match(source, /\}, \[canLoadSheetRecords\]\);/);
  assert.doesNotMatch(source, /\}, \[clients, clientIndex\]\);/);
  assert.match(source, /const GOOGLE_SHEET_REQUEST_TIMEOUT_MS = 65000;/);
  assert.match(source, /const STARTUP_BOOTSTRAP_TIMEOUT_MS = 45000;/);
  assert.match(source, /const DEFERRED_DATA_TIMEOUT_MS = 30000;/);
});
