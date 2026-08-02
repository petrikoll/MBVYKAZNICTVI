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
