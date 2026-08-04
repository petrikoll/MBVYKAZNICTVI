import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');
const ka01Source = readFileSync(new URL('../src/app/Ka01View.jsx', import.meta.url), 'utf8');

test('obecná hláška už není v horní liště a zůstává viditelná při rolování', () => {
  assert.match(appSource, /statusMessage && \([\s\S]*?className="fixed bottom-5 left-1\/2 z-\[70\]/);
  assert.doesNotMatch(appSource, /border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700[\s\S]*?statusMessage/);
});

test('změna klíčového pracovníka ukazuje průběh a výsledek přímo u klienta', () => {
  assert.match(appSource, /const noticeKey = `client-worker:\$\{client\.id\}`/);
  assert.match(appSource, /setSaveButtonNotice\(noticeKey, 'progress', 'Ukládám pracovníka…'\)/);
  assert.match(appSource, /SaveInlineNotice notice=\{saveButtonNotices\[`client-worker:\$\{client\.id\}`\]\}/);
});

test('falešný konflikt pracovníka se ověří proti aktuálnímu řádku a bezpečně zopakuje', () => {
  assert.match(appSource, /if \(error\?\.code !== 'CONFLICT'\) throw error/);
  assert.match(appSource, /fetchGoogleSheetAction\('listClients', 1\)/);
  assert.match(appSource, /refreshedWorker === originalWorker/);
  assert.match(appSource, /savedClient = await saveKeyWorker\(refreshedClient\)/);
});

test('výsledek mazání zůstane v příslušném seznamu i po odstranění řádku', () => {
  assert.match(appSource, /const \[recordDeleteNotice, setRecordDeleteNotice\] = useState\(null\)/);
  assert.match(appSource, /showDeleteNotice\('success', `Záznam „\$\{record\.title \|\| 'bez názvu'\}“ byl smazán\.`/);
  assert.match(appSource, /recordDeleteNotice\?\.clientId === selectedClient\.id/);
  assert.match(appSource, /recordDeleteNotice\?\.entityType === 'education_records'/);
  assert.match(appSource, /recordDeleteNotice\?\.entityType === 'supervision_records'/);
  assert.match(ka01Source, /recordDeleteNotice\?\.entityType === 'network_activities'/);
  assert.match(ka01Source, /recordDeleteNotice\?\.entityType === 'actor_registry'/);
});

test('chyby ukládání výkonu se propíší k jeho ukládacímu tlačítku', () => {
  assert.match(appSource, /setSaveNotice\(\{ tone: 'error', text: message \}\);/);
  assert.match(appSource, /saveNotice=\{saveNotice\}/);
});
