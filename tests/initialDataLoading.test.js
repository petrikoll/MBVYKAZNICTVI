import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('cold startup loads clients first and stages heavier Sheet reads', () => {
  const prefetchStart = source.indexOf('const prefetchAction =');
  const clientsStart = source.indexOf('const fetchClients = async () => {');
  const clientsEnd = source.indexOf('const clientIndex = useMemo', clientsStart);
  const startupPrefetchBlock = source.slice(prefetchStart, clientsStart);
  const clientsBlock = source.slice(clientsStart, clientsEnd);

  assert.ok(prefetchStart >= 0 && clientsStart > prefetchStart && clientsEnd > clientsStart);
  assert.match(startupPrefetchBlock, /const clientsPrefetch = prefetchAction\('listClients'\)/);
  assert.doesNotMatch(startupPrefetchBlock, /prefetchAction\('bootstrapFast'\)/);
  assert.match(startupPrefetchBlock, /let startupCoreReady = startupClientReady/);
  assert.match(startupPrefetchBlock, /'listPerformances',[\s\S]*?'listMeetings',[\s\S]*?'listPartners'/);
  assert.match(startupPrefetchBlock, /const actionPrefetch = startupCoreReady\.then\(\(\) => prefetchAction\(action\)\)/);
  assert.match(startupPrefetchBlock, /startupCoreReady = actionPrefetch\.then\(\(\) => undefined\)/);
  assert.doesNotMatch(startupPrefetchBlock, /fetchGoogleSheetAction\('getDataRevision'/);

  assert.match(startupPrefetchBlock, /const individualPlansPrefetch = startupCoreReady\.then\(\(\) => prefetchAction\('listIndividualPlans'\)\)/);
  assert.match(startupPrefetchBlock, /const auxiliaryPrefetch = startupCoreReady\.then\(\(\) => prefetchAction\('bootstrapAuxiliary'\)\)/);
  assert.match(startupPrefetchBlock, /\['listNetworkMeetings', 'networkMeetings'\]/);
  assert.match(startupPrefetchBlock, /\['listStatistics', 'statistics'\]/);
  assert.match(startupPrefetchBlock, /prefetchedSheetActionsRef\.current\.set\('startupClientReady', startupClientReady\)/);

  assert.match(clientsBlock, /const clientOutcome = await clientsPrefetch/);
  assert.match(clientsBlock, /if \(!json\) json = await fetchGoogleSheetAction\('listClients', 1, GOOGLE_SHEET_REQUEST_TIMEOUT_MS\)/);
  assert.match(clientsBlock, /resolveStartupClientReady\(\)/);
  assert.match(clientsBlock, /const retryDelayMs = consecutiveFailures === 1 \? 1000 : consecutiveFailures === 2 \? 2000 : 8000/);
});

test('record startup reuses shared bundles and recovers failed actions sequentially', () => {
  const recordsStart = source.indexOf('const fetchSheetRecords = async () => {');
  const recordsEnd = source.indexOf('fetchSheetRecords();', recordsStart);
  const recordsBlock = source.slice(recordsStart, recordsEnd);

  assert.ok(recordsStart >= 0 && recordsEnd > recordsStart);
  assert.match(recordsBlock, /await startupClientReady/);
  assert.match(recordsBlock, /await mapSourcesWithConcurrency\(progressiveSources, 2, loadSingleProgressiveSource\)/);
  assert.match(recordsBlock, /pendingSources,[\s\S]*?1,[\s\S]*?async \(\[action, bundleKey, fallback\]\)/);
  assert.match(recordsBlock, /const progressiveSources = \[/);
  assert.match(recordsBlock, /applySingleProgressiveSource/);
  assert.match(recordsBlock, /scheduleFailedActionRecovery/);
  assert.match(recordsBlock, /timeoutMs: GOOGLE_SHEET_REQUEST_TIMEOUT_MS/);
  assert.match(recordsBlock, /fetchGoogleSheetAction\(action, 1, timeoutMs\)/);
  assert.doesNotMatch(recordsBlock, /processProgressiveBootstrap/);
  assert.match(source, /const canLoadSheetRecords = Boolean\(GOOGLE_SHEET_MACRO_URL\);/);
  assert.match(source, /const GOOGLE_SHEET_REQUEST_TIMEOUT_MS = 65000;/);
});
