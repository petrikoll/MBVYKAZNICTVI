import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');

function createContext() {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return context;
}

test('current version is accepted and stale concurrent edit is rejected', () => {
  const context = createContext();
  const current = new Date('2026-08-02T10:15:30.000Z');

  assert.doesNotThrow(() => context.assertExpectedVersion_(
    { updated_at: current },
    current.getTime(),
    'Vykon VYKON-0001'
  ));

  assert.throws(
    () => context.assertExpectedVersion_(
      { updated_at: current },
      new Date('2026-08-02T10:14:00.000Z').getTime(),
      'Vykon VYKON-0001'
    ),
    (error) => error.code === 'CONFLICT' && /mezitim upravil jiny uzivatel/.test(error.message)
  );

  assert.throws(
    () => context.assertExpectedVersion_({ updated_at: current }, '', 'Vykon VYKON-0001'),
    (error) => error.code === 'CONFLICT'
  );
});

test('idempotent retry ignores timestamps and expected version', () => {
  const context = createContext();
  const original = {
    vykon_id: 'VYKON-0001',
    klient_id: 'KLIENT-0001',
    datum: '2026-08-02',
    popis: 'Podpora klienta',
    updated_at: '2026-08-02T10:15:30.000Z',
    nepouzite_pole: ''
  };
  const retry = {
    vykon_id: '',
    klient_id: 'KLIENT-0001',
    datum: '2026-08-02',
    popis: 'Podpora klienta',
    expected_updated_at: '',
    updated_at: '2026-08-02T10:16:00.000Z'
  };

  assert.equal(
    context.buildRecordDuplicateKey_(original, 'vykon_id'),
    context.buildRecordDuplicateKey_(retry, 'vykon_id')
  );
});

test('delete keeps the row as an audit trail and checks its version', () => {
  const context = createContext();
  const headers = ['vykon_id', 'status', 'updated_at', 'updated_by'];
  const current = new Date('2026-08-02T10:15:30.000Z');
  const row = ['VYKON-0001', 'Platny', current, 'Lea'];
  const savedValues = {};
  const sheet = {
    getRange: (_row, column) => ({
      getValues: () => [row],
      setValue: (value) => { savedValues[column] = value; }
    })
  };
  context.getOrCreateSheet_ = () => sheet;
  context.getHeaders_ = () => headers;
  context.ensureHeader_ = () => {};
  context.findRowById_ = () => 2;

  context.deleteRecord_('Vykony', 'vykon_id', 'VYKON-0001', current.getTime(), 'Radka');

  assert.equal(savedValues[2], 'Smazan\u00fd');
  assert.equal(Object.prototype.toString.call(savedValues[3]), '[object Date]');
  assert.equal(savedValues[4], 'Radka');
});

test('actor update preserves partner columns not sent by the application', () => {
  const context = createContext();
  const current = new Date('2026-08-02T10:15:30.000Z');
  const headers = [
    'partner_id',
    'nazev_subjektu',
    'typ_aktera',
    'poznamka',
    'status',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by'
  ];
  let storedRow = [
    'PARTNER-0001',
    'Puvodni nazev',
    'obec',
    'Dulezita poznamka',
    'Platny',
    new Date('2026-07-01T08:00:00.000Z'),
    'Radka',
    current,
    'Radka'
  ];
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({
      getValues: () => [storedRow],
      setValues: ([values]) => { storedRow = values; }
    })
  };

  context.getSpreadsheet_ = () => ({ getSheetByName: () => sheet });
  context.getHeaders_ = () => headers;
  context.ensureHeader_ = () => {};
  context.findPartnerRow_ = () => 2;

  context.savePartner_({
    partner_id: 'PARTNER-0001',
    nazev_subjektu: 'Novy nazev',
    expected_updated_at: current.getTime(),
    status: 'Platny',
    updated_by: 'Josef'
  });

  const saved = Object.fromEntries(headers.map((header, index) => [header, storedRow[index]]));
  assert.equal(saved.nazev_subjektu, 'Novy nazev');
  assert.equal(saved.typ_aktera, 'obec');
  assert.equal(saved.poznamka, 'Dulezita poznamka');
  assert.equal(saved.created_by, 'Radka');
  assert.equal(saved.updated_by, 'Josef');
});
