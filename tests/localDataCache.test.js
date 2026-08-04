import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  APP_STORAGE_POLICY_MARKER_KEY,
  APP_STORAGE_POLICY_VERSION,
  purgeSensitiveLocalStorage,
  purgeSensitiveSessionStorage
} from '../src/lib/browserStoragePolicy.js';
import {
  SAFE_CLIENT_INDEX_SESSION_KEY,
  SAFE_RECORD_INDEX_STORAGE_KEY,
  buildSafeClientIndex,
  buildSafeRecordIndex,
  readSafeStartupRecords,
  writeSafeClientIndex,
  writeSafeRecordIndex
} from '../src/lib/safeDataCache.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test('start aplikace odstrani vsechny starsi citlive lokalni kopie', () => {
  const storage = createStorage({
    'projectReporting.clients.v1': '{"clients":[{"jmeno":"Alena"}]}',
    'projectReporting.records': '[{"documentText":"citlivy text"}]',
    'projectReporting.workReports.v1': '{"employeeName":"Pracovnik"}',
    'projectReporting.dismissedGoalAlertSignatures.v1': '["podpis"]',
    'projectReporting.globalWorker': 'Pracovnik',
    'mbVykaznictvi.globalWorker': 'Pracovnik',
    'unrelated.setting': 'zachovat'
  });

  const result = purgeSensitiveLocalStorage(storage);

  assert.equal(result.applied, true);
  assert.equal(result.removedKeys.length, 6);
  assert.equal(storage.getItem('unrelated.setting'), 'zachovat');
  assert.equal(storage.getItem(APP_STORAGE_POLICY_MARKER_KEY), String(APP_STORAGE_POLICY_VERSION));
});

test('cisteni je bezpecne opakovatelne a ponecha technicky marker', () => {
  const storage = createStorage();

  purgeSensitiveLocalStorage(storage);
  const secondRun = purgeSensitiveLocalStorage(storage);

  assert.deepEqual(secondRun.removedKeys, []);
  assert.equal(storage.getItem(APP_STORAGE_POLICY_MARKER_KEY), String(APP_STORAGE_POLICY_VERSION));
});

test('plna data zustavaji v React stavu a prohlizec dostane jen bezpecne indexy', async () => {
  const [appSource, workReportsSource, mainSource] = await Promise.all([
    readFile(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/work-reports/WorkReportsView.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/main.jsx', import.meta.url), 'utf8')
  ]);

  assert.match(appSource, /const \[records, setRecords\] = useState\(\(\) => readSafeStartupRecords\(\)\)/);
  assert.match(appSource, /const \[clients, setClients\] = useState\(\[\]\)/);
  assert.doesNotMatch(appSource, /loadLocalClients|loadLocalRecords|saveLocalClients|saveLocalRecords/);
  assert.match(appSource, /writeSafeRecordIndex\(records, currentDataRevisionRef\.current\)/);
  assert.match(appSource, /writeSafeClientIndex\(parsed, currentDataRevisionRef\.current\)/);
  assert.doesNotMatch(workReportsSource, /localStorage|projectReporting\.workReports/);
  assert.match(mainSource, /purgeSensitiveLocalStorage\(\)/);
  assert.match(mainSource, /purgeSensitiveSessionStorage\(\)/);
  assert.ok(mainSource.indexOf('purgeSensitiveLocalStorage()') < mainSource.indexOf('createRoot('));
});

test('index vykonu neobsahuje jmena, pracovniky ani volne texty', () => {
  const records = buildSafeRecordIndex([{
    id: 'VYKON-0001',
    remoteSource: 'google-sheet',
    entityType: 'consultations',
    ka: 'KA1',
    title: 'Dluhove poradenstvi - Alena Gaborova',
    activityDate: '2026-08-04',
    worker: 'Pracovnik',
    clientId: 'KLIENT-0001',
    clientName: 'Alena Gaborova',
    documentText: 'Citlivy text situace',
    payload: { durationMinutes: 90, topics: 'dluhy', outcome: 'dohoda' },
    updatedAt: 123
  }]);

  assert.equal(records.length, 1);
  assert.deepEqual(records[0].payload, { durationMinutes: 90, caseManagementMode: false });
  assert.equal(records[0].clientName, '');
  assert.equal(records[0].worker, '');
  const serialized = JSON.stringify(records);
  assert.doesNotMatch(serialized, /Alena|Gaborova|Pracovnik|Citlivy|dluhy|dohoda/i);
});

test('odvozeny identifikator obsahujici jmeno se do localStorage neulozi', () => {
  const records = buildSafeRecordIndex([{
    id: 'VYKON-0002',
    remoteSource: 'google-sheet',
    entityType: 'consultations',
    clientId: 'sheet-alena-gaborova-1980',
    payload: { durationMinutes: 60 }
  }]);
  assert.deepEqual(records, []);
});

test('session index klientu obsahuje pouze nepruhledne ID, stav a verzi', () => {
  const clients = buildSafeClientIndex([{
    id: 'KLIENT-0001',
    fullName: 'Alena Gaborova',
    jmeno: 'Alena',
    prijmeni: 'Gaborova',
    telefon: '123456789',
    projectStatus: 'active',
    updatedAt: 456
  }]);
  assert.deepEqual(clients, [{ id: 'KLIENT-0001', projectStatus: 'active', updatedAt: 456 }]);
});

test('bezpecne indexy preziji cisteni a po osmi hodinach vyprsi', () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  const now = 1_000_000;
  writeSafeRecordIndex([{
    id: 'VYKON-0001', remoteSource: 'google-sheet', entityType: 'consultations',
    clientId: 'KLIENT-0001', activityDate: '2026-08-04', payload: { durationMinutes: 60 }
  }], 'rev-1', localStorage, now);
  writeSafeClientIndex([{ id: 'KLIENT-0001', projectStatus: 'active' }], 'rev-1', sessionStorage, now);

  purgeSensitiveLocalStorage(localStorage);
  purgeSensitiveSessionStorage(sessionStorage);
  assert.ok(localStorage.getItem(SAFE_RECORD_INDEX_STORAGE_KEY));
  assert.ok(sessionStorage.getItem(SAFE_CLIENT_INDEX_SESSION_KEY));
  assert.equal(readSafeStartupRecords(localStorage, sessionStorage, now + 1000).length, 1);
  assert.equal(readSafeStartupRecords(localStorage, sessionStorage, now + 8 * 60 * 60 * 1000 + 1).length, 0);
});

test('pomocne oblasti se nactou i pri prazdnem registru klientu', async () => {
  const appSource = await readFile(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');
  assert.match(appSource, /const canLoadSheetRecords = Boolean\(GOOGLE_SHEET_MACRO_URL\);/);
});
