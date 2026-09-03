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

test('produkční ID tabulky z vlastností skriptu má přednost před vývojovým fallbackem', () => {
  let openedSpreadsheetId = '';
  const spreadsheetContext = vm.createContext({
    console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name) => name === 'SPREADSHEET_ID' ? 'PRODUCTION-SHEET-ID' : ''
      })
    },
    SpreadsheetApp: {
      openById: (id) => {
        openedSpreadsheetId = id;
        return { id };
      },
      getActive: () => ({ id: 'ACTIVE-SHEET' })
    }
  });
  vm.runInContext(source, spreadsheetContext);

  const spreadsheet = spreadsheetContext.getSpreadsheet_();

  assert.equal(openedSpreadsheetId, 'PRODUCTION-SHEET-ID');
  assert.equal(spreadsheet.id, 'PRODUCTION-SHEET-ID');
});

test('všechny provozní cesty používají jednotný resolver ID tabulky', () => {
  const directConfigReferences = source.match(/CONFIG\.spreadsheetId/g) || [];
  assert.equal(directConfigReferences.length, 1);
  assert.match(source, /function getConfiguredSpreadsheetId_\(\)/);
  assert.match(source, /function authorizeOnce\(\)[\s\S]*?const spreadsheet = getSpreadsheet_\(\)/);
  assert.match(source, /function installSpreadsheetEditTrigger\(\)[\s\S]*?\.forSpreadsheet\(getSpreadsheet_\(\)\)/);
  assert.match(source, /function createFullBackup_\(runtime\)[\s\S]*?const spreadsheet = getSpreadsheet_\(\)/);
});

test('české datum se pro API vždy normalizuje na ISO a neobrátí den s měsícem', () => {
  assert.equal(context.formatDateValue_('3/7/2026'), '2026-07-03');
  assert.equal(context.formatDateValue_('2026-07-03T10:15:00.000Z'), '2026-07-03');
});

test('neexistující datum se při zápisu tiše nepřevalí do dalšího měsíce', () => {
  assert.throws(
    () => context.toSheetDateValue_('2026-02-31'),
    (error) => error.code === 'VALIDATION' && /Neplatne datum/.test(error.message)
  );
});

test('datum výkonu se do Sheetu zapisuje jako datum, ne jako locale-dependent text', () => {
  let storedRow = null;
  const dateContext = vm.createContext({
    console,
    Utilities: {
      formatDate: (value, _zone, pattern) => pattern === 'yyyy-MM-dd'
        ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
        : ''
    }
  });
  vm.runInContext(source, dateContext);
  const headers = ['vykon_id', 'klient_id', 'datum', 'status', 'created_at', 'updated_at'];
  const sheet = {
    getLastRow: () => 1,
    getRange: () => ({
      getValues: () => [],
      setValues: ([values]) => { storedRow = values; }
    })
  };
  dateContext.getOrCreateSheet_ = () => sheet;
  dateContext.getHeaders_ = () => headers;
  dateContext.findRowById_ = () => null;
  dateContext.findDuplicateRecordRow_ = () => null;
  dateContext.upsertPerformanceStatistics_ = () => {};
  dateContext.queueRecordDocumentAfterSheetCommit_ = () => ({ pending: false, state: 'ready', warning: '' });

  dateContext.savePerformance_({
    klient_id: 'KLIENT-0001',
    datum: '3.7.2026',
    status: 'Platný'
  });

  const storedDate = storedRow[headers.indexOf('datum')];
  assert.equal(Object.prototype.toString.call(storedDate), '[object Date]');
  assert.equal(storedDate.getFullYear(), 2026);
  assert.equal(storedDate.getMonth() + 1, 7);
  assert.equal(storedDate.getDate(), 3);
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

test('nový výkon bez serverového ID neobejde kontrolu duplicit', () => {
  const performanceContext = vm.createContext({});
  vm.runInContext(source, performanceContext);
  const headers = ['vykon_id', 'klient_id', 'datum'];
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({ getValues: () => [['VYKON-0001', 'KLIENT-0021', '2026-07-22']] })
  };
  performanceContext.getOrCreateSheet_ = () => sheet;
  performanceContext.getHeaders_ = () => headers;
  performanceContext.findRowById_ = () => null;
  performanceContext.findDuplicateRecordRow_ = () => 2;
  performanceContext.upsertPerformanceStatistics_ = () => {};

  const saved = performanceContext.savePerformance_({
    vykon_id: '',
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

test('hromadné čtení dat nepoužívá opakovaně vzdálenou službu Session', () => {
  let sessionCalls = 0;
  const dateContext = vm.createContext({
    Utilities: { formatDate: (_value, zone, pattern) => `${zone}:${pattern}` },
    Session: { getScriptTimeZone: () => {
      sessionCalls += 1;
      return 'Unexpected/Remote';
    } }
  });
  vm.runInContext(source, dateContext);
  const dateValue = vm.runInContext('new Date(0)', dateContext);

  const result = dateContext.rowToObject_(
    ['datum', 'cas_od', 'created_at'],
    [dateValue, dateValue, dateValue]
  );

  assert.equal(result.datum, 'Europe/Prague:yyyy-MM-dd');
  assert.equal(result.cas_od, 'Europe/Prague:HH:mm');
  assert.equal(sessionCalls, 0);
  assert.doesNotMatch(source, /Session\.getScriptTimeZone\(\)/);
});
