import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('clients and performances do not wait for the full bootstrap response', () => {
  const clientsStart = source.indexOf('const fetchClients = async () => {');
  const clientsEnd = source.indexOf('const clientIndex = useMemo', clientsStart);
  const clientsBlock = source.slice(clientsStart, clientsEnd);

  assert.ok(clientsStart >= 0 && clientsEnd > clientsStart);
  assert.match(clientsBlock, /fetchGoogleSheetAction\('listClients'\)/);
  assert.match(clientsBlock, /fetchGoogleSheetAction\('listPerformances'\)/);
  assert.doesNotMatch(clientsBlock, /fetchGoogleSheetAction\('bootstrap'\)/);

  const recordsStart = source.indexOf('const fetchSheetRecords = async () => {');
  const recordsEnd = source.indexOf('fetchSheetRecords();', recordsStart);
  const recordsBlock = source.slice(recordsStart, recordsEnd);
  const performanceAwait = recordsBlock.indexOf('const performances = await performancesPromise;');
  const bootstrapAwait = recordsBlock.indexOf('const bootstrapOutcome = await bootstrapPrefetch;');

  assert.ok(performanceAwait >= 0);
  assert.ok(bootstrapAwait > performanceAwait);
});
