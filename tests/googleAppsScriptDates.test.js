import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);

test('Apps Script zapisuje ISO datum bez záměny dne a měsíce', () => {
  const date = context.toSheetDateValue_('2026-07-03');

  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth() + 1, 7);
  assert.equal(date.getDate(), 3);
});

test('Apps Script správně převede i český formát data', () => {
  const date = context.toSheetDateValue_('3.7.2026');

  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth() + 1, 7);
  assert.equal(date.getDate(), 3);
});

test('neúplný klient se stejným jménem je rozpoznán jako duplicita', () => {
  const headers = ['klient_id', 'jmeno', 'prijmeni', 'datum_narozeni', 'email', 'telefon', 'datum_vstupu_do_projektu'];
  const rows = [['KLIENT-0021', 'Valerie', 'Lacková', '1990-05-12', '', '', '2026-07-13']];
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({ getValues: () => rows })
  };

  const duplicateRow = context.findDuplicateClientRow_(sheet, headers, {
    jmeno: ' Valerie ',
    prijmeni: 'LACKOVA',
    datum_narozeni: '',
    email: '',
    telefon: '',
    datum_vstupu_do_projektu: ''
  }, null);

  assert.equal(duplicateRow, 2);
});

test('server najde existující plán klienta a respektuje upravovaný řádek', () => {
  const headers = ['plan_id', 'klient_id'];
  const rows = [['PLAN-0001', 'KLIENT-0021'], ['PLAN-0002', 'KLIENT-0042']];
  const sheet = {
    getLastRow: () => 3,
    getRange: (_row, column) => ({ getValues: () => rows.map((item) => [item[column - 1]]) })
  };

  assert.equal(context.findRowByHeaderValue_(sheet, headers, 'klient_id', 'KLIENT-0021', null), 2);
  assert.equal(context.findRowByHeaderValue_(sheet, headers, 'klient_id', 'KLIENT-0021', 2), null);
});

test('nové Firebase ID neobejde serverovou kontrolu duplicitního výkonu', () => {
  const performanceContext = vm.createContext({});
  vm.runInContext(source, performanceContext);
  const headers = ['vykon_id', 'klient_id', 'datum'];
  const sheet = {
    getRange: () => ({ getValues: () => [['VYKON-0001', 'KLIENT-0021', '2026-07-22']] })
  };
  performanceContext.getOrCreateSheet_ = () => sheet;
  performanceContext.getHeaders_ = () => headers;
  performanceContext.findRowById_ = () => null;
  performanceContext.findDuplicateRecordRow_ = () => 2;
  performanceContext.upsertPerformanceStatistics_ = () => {};

  const saved = performanceContext.savePerformance_({
    vykon_id: 'firebase-new-id',
    klient_id: 'KLIENT-0021',
    datum: '2026-07-22'
  });

  assert.equal(saved.vykon_id, 'VYKON-0001');
});

test('čas výkonu z buňky se převádí na HH:mm, ne na datum', () => {
  const timeContext = vm.createContext({
    Utilities: { formatDate: (value, _zone, pattern) => pattern === 'HH:mm' ? value.__time : '2026-07-22' },
    Session: { getScriptTimeZone: () => 'Europe/Prague' }
  });
  vm.runInContext(source, timeContext);
  const timeValue = vm.runInContext("Object.assign(new Date(0), { __time: '09:05' })", timeContext);

  assert.equal(timeContext.rowToObject_(['cas_od'], [timeValue]).cas_od, '09:05');
});
