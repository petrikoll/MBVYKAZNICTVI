import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  APP_STORAGE_POLICY_MARKER_KEY,
  APP_STORAGE_POLICY_VERSION,
  purgeSensitiveLocalStorage
} from '../src/lib/browserStoragePolicy.js';

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

test('klienti, zaznamy a vykazy prace zustavaji pouze v React stavu', async () => {
  const [appSource, workReportsSource, mainSource] = await Promise.all([
    readFile(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/work-reports/WorkReportsView.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/main.jsx', import.meta.url), 'utf8')
  ]);

  assert.match(appSource, /const \[records, setRecords\] = useState\(\[\]\)/);
  assert.match(appSource, /const \[clients, setClients\] = useState\(\[\]\)/);
  assert.doesNotMatch(appSource, /localStorage|loadLocalClients|loadLocalRecords|saveLocalClients|saveLocalRecords/);
  assert.doesNotMatch(workReportsSource, /localStorage|projectReporting\.workReports/);
  assert.match(mainSource, /purgeSensitiveLocalStorage\(\)/);
  assert.ok(mainSource.indexOf('purgeSensitiveLocalStorage()') < mainSource.indexOf('createRoot('));
});

test('pomocne oblasti se nactou i pri prazdnem registru klientu', async () => {
  const appSource = await readFile(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');
  assert.match(appSource, /const canLoadSheetRecords = Boolean\(GOOGLE_SHEET_MACRO_URL\);/);
});
