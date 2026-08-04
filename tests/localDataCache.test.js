import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearLocalReportingCache,
  loadLocalClients,
  loadLocalRecords,
  saveLocalClients,
  saveLocalRecords
} from '../src/lib/projectUtils.js';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key)
  };
}

test('lokální kopie klientů je dostupná při dalším spuštění', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 7, 2, 12);
  const clients = [{ id: 'client-1', jmeno: 'Alena', updatedAt: now }];

  assert.equal(saveLocalClients(clients, storage, now), true);
  assert.deepEqual(loadLocalClients(storage, now + 1000), clients);
});

test('zastaralá lokální kopie se po sedmi dnech nepoužije', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 7, 2, 12);
  saveLocalClients([{ id: 'client-1' }], storage, now);

  const eightDaysLater = now + 8 * 24 * 60 * 60 * 1000;
  assert.deepEqual(loadLocalClients(storage, eightDaysLater), []);
  assert.equal(storage.has('projectReporting.clients.v1'), false);
});

test('lokální kopie výkonů a aktérů je dostupná hned při dalším spuštění', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 7, 3, 12);
  const records = [
    { id: 'VYKON-0001', entityType: 'consultations', remoteSource: 'google-sheet' },
    { id: 'PARTNER-0001', entityType: 'actor_registry', remoteSource: 'google-sheet' }
  ];

  assert.equal(saveLocalRecords(records, storage, now), true);
  assert.deepEqual(loadLocalRecords(storage, now + 1000), records);
});

test('původní lokální pole záznamů zůstane po aktualizaci použitelné', () => {
  const records = [{ id: 'VYKON-0002', entityType: 'consultations' }];
  const storage = createStorage({ 'projectReporting.records': JSON.stringify(records) });

  assert.deepEqual(loadLocalRecords(storage), records);
});

test('zastaralá lokální kopie záznamů se po sedmi dnech odstraní', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 7, 3, 12);
  saveLocalRecords([{ id: 'VYKON-0001' }], storage, now);

  assert.deepEqual(loadLocalRecords(storage, now + 8 * 24 * 60 * 60 * 1000), []);
  assert.equal(storage.has('projectReporting.records'), false);
});

test('aplikace při startu použije celou lokální kopii záznamů', () => {
  assert.match(appSource, /const cachedRecordsAtStartup = useMemo\(\(\) => loadLocalRecords\(\), \[\]\)/);
  assert.match(appSource, /const preservedPendingRemote = prev\.filter/);
});

test('aplikace ověřuje záznamy jedním dávkovým požadavkem a zachovává záložní načtení', () => {
  assert.match(appSource, /fetchGoogleSheetAction\('bootstrap', 1\)/);
  assert.match(appSource, /const bootstrapSources = \[/);
  assert.match(appSource, /Záložní cesta pro případ, že dávkový bootstrap selže/);
});

test('vymazání lokální kopie nezasahuje jiná nastavení aplikace', () => {
  const storage = createStorage({
    'projectReporting.clients.v1': '{}',
    'projectReporting.records': '[]',
    'projectReporting.globalWorker': 'Pracovník'
  });

  assert.equal(clearLocalReportingCache(storage), true);
  assert.equal(storage.has('projectReporting.clients.v1'), false);
  assert.equal(storage.has('projectReporting.records'), false);
  assert.equal(storage.has('projectReporting.globalWorker'), true);
});
