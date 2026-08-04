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

function createPartnerSheet(initialRows) {
  const rows = initialRows.map((row) => [...row]);
  return {
    rows,
    getLastRow: () => rows.length + 1,
    getRange: (rowNumber, column = 1, rowCount = 1, columnCount = 1) => ({
      getValues: () => Array.from({ length: rowCount }, (_, offset) => {
        const row = rows[rowNumber - 2 + offset] || [];
        return row.slice(column - 1, column - 1 + columnCount);
      }),
      setValues: (values) => {
        values.forEach((valuesRow, offset) => {
          const targetIndex = rowNumber - 2 + offset;
          const target = rows[targetIndex] || [];
          valuesRow.forEach((value, valueIndex) => {
            target[column - 1 + valueIndex] = value;
          });
          rows[targetIndex] = target;
        });
      }
    })
  };
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

test('rychlá změna klíčového pracovníka zapisuje jen aktuální řádek a zachová verzování', () => {
  const context = createContext();
  const current = new Date('2026-08-04T08:00:00.000Z');
  const headers = ['klient_id', 'jmeno', 'klicovy_pracovnik', 'updated_at', 'updated_by'];
  let storedRow = ['KLIENT-0001', 'Alena', 'Lea Ledecká, Dis.', current, 'Lea Ledecká, Dis.'];
  let readCount = 0;
  let writeCount = 0;
  const sheet = {
    getRange: () => ({
      getValues: () => {
        readCount += 1;
        return [storedRow];
      },
      setValues: ([values]) => {
        writeCount += 1;
        storedRow = values;
      }
    })
  };
  context.getSpreadsheet_ = () => ({ getSheetByName: () => sheet });
  context.getHeaders_ = () => headers;
  context.findClientRows_ = () => [2];

  const saved = context.updateClientKeyWorker_({
    klient_id: 'KLIENT-0001',
    klicovy_pracovnik: 'Mgr. Radka Vysloužilová',
    expected_updated_at: current.toISOString(),
    updated_by: 'Mgr. Radka Vysloužilová'
  });

  assert.equal(saved.klicovy_pracovnik, 'Mgr. Radka Vysloužilová');
  assert.equal(storedRow[1], 'Alena');
  assert.equal(readCount, 1);
  assert.equal(writeCount, 1);
  assert.notEqual(saved.updated_at, current.toISOString());
});

test('rychlá změna klíčového pracovníka odmítne zastaralou verzi', () => {
  const context = createContext();
  const current = new Date('2026-08-04T08:00:00.000Z');
  const headers = ['klient_id', 'klicovy_pracovnik', 'updated_at'];
  const sheet = {
    getRange: () => ({
      getValues: () => [['KLIENT-0001', 'Lea Ledecká, Dis.', current]],
      setValues: () => assert.fail('zastaralý řádek se nesmí zapsat')
    })
  };
  context.getSpreadsheet_ = () => ({ getSheetByName: () => sheet });
  context.getHeaders_ = () => headers;
  context.findClientRows_ = () => [2];

  assert.throws(() => context.updateClientKeyWorker_({
    klient_id: 'KLIENT-0001',
    klicovy_pracovnik: 'Mgr. Radka Vysloužilová',
    expected_updated_at: '2026-08-04T07:00:00.000Z'
  }), (error) => error.code === 'CONFLICT');
});

test('performance update preserves Sheet columns not sent by the form', () => {
  const context = createContext();
  const current = new Date('2026-08-02T10:15:30.000Z');
  const headers = [
    'vykon_id',
    'klient_id',
    'popis',
    'document_url',
    'pomocny_sloupec',
    'status',
    'created_at',
    'updated_at'
  ];
  let storedRow = [
    'VYKON-0001',
    'KLIENT-0001',
    'Puvodni popis',
    'https://drive.google.com/document/d/existing',
    'Rucne spravovana hodnota',
    'Platny',
    new Date('2026-07-01T08:00:00.000Z'),
    current
  ];
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({
      getValues: () => [storedRow],
      setValues: ([values]) => { storedRow = values; }
    })
  };
  context.getOrCreateSheet_ = () => sheet;
  context.getHeaders_ = () => headers;
  context.findRowById_ = () => 2;
  context.upsertClientRecordDocument_ = (_record, _activity, _type, currentUrl) => currentUrl;
  context.upsertPerformanceStatistics_ = () => {};

  context.savePerformance_({
    vykon_id: 'VYKON-0001',
    popis: 'Novy popis',
    expected_updated_at: current.getTime()
  });

  const saved = Object.fromEntries(headers.map((header, index) => [header, storedRow[index]]));
  assert.equal(saved.popis, 'Novy popis');
  assert.equal(saved.klient_id, 'KLIENT-0001');
  assert.equal(saved.document_url, 'https://drive.google.com/document/d/existing');
  assert.equal(saved.pomocny_sloupec, 'Rucne spravovana hodnota');
});

test('updates with unknown ids fail closed instead of creating replacement rows', () => {
  const context = createContext();
  const sheet = {};
  context.getOrCreateSheet_ = () => sheet;
  context.getIndividualPlanSheet_ = () => sheet;
  context.setColumnListValidation_ = () => {};
  context.findRowById_ = () => null;
  context.findNetworkMeetingRow_ = () => null;
  context.findDuplicateRecordRow_ = () => null;

  const scenarios = [
    {
      headers: ['plan_id', 'klient_id', 'status', 'updated_at'],
      save: () => context.saveIndividualPlan_({ plan_id: 'PLAN-404', klient_id: 'KLIENT-0001' })
    },
    {
      headers: ['vykon_id', 'status', 'updated_at'],
      save: () => context.savePerformance_({ vykon_id: 'VYKON-404' })
    },
    {
      headers: ['meeting_id', 'status', 'updated_at'],
      save: () => context.saveMeeting_({ meeting_id: 'SETKANI-404' })
    },
    {
      headers: ['schuzka_site_id', 'status', 'updated_at'],
      save: () => context.saveNetworkMeeting_({ schuzka_site_id: 'SIT-404' })
    },
    {
      headers: ['vzdelavani_id', 'status', 'updated_at'],
      save: () => context.saveEducation_({ vzdelavani_id: 'VZDELAVANI-404' })
    },
    {
      headers: ['sepervize_id', 'status', 'updated_at'],
      save: () => context.saveSupervision_({ sepervize_id: 'SUPERVIZE-404' })
    }
  ];

  scenarios.forEach(({ headers, save }) => {
    context.getHeaders_ = () => headers;
    assert.throws(save, (error) => error.code === 'NOT_FOUND' && /nelze najit/.test(error.message));
  });
});

test('a soft-deleted row cannot be restored by a stale update', () => {
  const context = createContext();

  assert.throws(
    () => context.assertRecordCanBeUpdated_(
      'VYKON-0001',
      2,
      { status: 'Smazaný' },
      'Vykon'
    ),
    (error) => error.code === 'CONFLICT' && /je smazany/.test(error.message)
  );
});

test('technical Drive folder refresh does not change the client edit version', () => {
  const ensureFolderSource = source.match(/function ensureClientFolder_\([\s\S]*?\r?\n}\r?\n\r?\nfunction getOrCreateClientFolder_/m)?.[0] || '';

  assert.ok(ensureFolderSource);
  assert.doesNotMatch(ensureFolderSource, /indexOf\('updated_at'\)/);
  assert.doesNotMatch(ensureFolderSource, /indexOf\('updated_by'\)/);
});

test('actor create rejects an existing active subject even with a different contact', () => {
  const context = createContext();
  const headers = [
    'partner_id',
    'nazev_subjektu',
    'typ_aktera',
    'kontaktni_osoby_json',
    'status',
    'created_at',
    'updated_at',
    'updated_by'
  ];
  const sheet = createPartnerSheet([[
    'PARTNER-0001',
    'Město Moravský Beroun',
    'obec',
    JSON.stringify([{ id: 'contact-1', name: 'Jan Novák' }]),
    'Platný',
    new Date('2026-07-01T08:00:00.000Z'),
    new Date('2026-08-02T10:15:30.000Z'),
    'Radka'
  ]]);
  context.getSpreadsheet_ = () => ({ getSheetByName: () => sheet });
  context.getHeaders_ = () => headers;
  context.ensureHeader_ = () => {};

  assert.throws(
    () => context.savePartner_({
      partner_id: '',
      nazev_subjektu: '  Mesto   Moravsky Beroun ',
      typ_aktera: 'obec',
      kontaktni_osoby_json: JSON.stringify([{ id: 'contact-1', name: 'Jana Malá' }]),
      status: 'Platný'
    }),
    (error) => error.code === 'DUPLICATE' && /uz v registru existuje/.test(error.message)
  );
  assert.equal(sheet.rows.length, 1);
});

test('re-adding a deleted actor creates a new active row', () => {
  const context = createContext();
  const headers = [
    'partner_id',
    'nazev_subjektu',
    'typ_aktera',
    'kontaktni_osoby_json',
    'status',
    'created_at',
    'updated_at',
    'updated_by'
  ];
  const contactJson = JSON.stringify([{ id: 'contact-1', name: 'Jan Novák' }]);
  const sheet = createPartnerSheet([[
    'PARTNER-0001',
    'Město Moravský Beroun',
    'obec',
    contactJson,
    'Smazaný',
    new Date('2026-07-01T08:00:00.000Z'),
    new Date('2026-08-02T10:15:30.000Z'),
    'Radka'
  ]]);
  context.getSpreadsheet_ = () => ({ getSheetByName: () => sheet });
  context.getHeaders_ = () => headers;
  context.ensureHeader_ = () => {};

  const saved = context.savePartner_({
    partner_id: '',
    nazev_subjektu: 'Město Moravský Beroun',
    typ_aktera: 'obec',
    kontaktni_osoby_json: contactJson,
    status: 'Platný',
    updated_by: 'Radka'
  });

  assert.equal(saved.partner_id, 'PARTNER-0002');
  assert.equal(saved.status, 'Platný');
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[0][headers.indexOf('status')], 'Smazaný');
});

test('actor update with an unknown id fails closed', () => {
  const context = createContext();
  const headers = ['partner_id', 'nazev_subjektu', 'status', 'updated_at'];
  const sheet = createPartnerSheet([]);
  context.getSpreadsheet_ = () => ({ getSheetByName: () => sheet });
  context.getHeaders_ = () => headers;
  context.ensureHeader_ = () => {};

  assert.throws(
    () => context.savePartner_({
      partner_id: 'PARTNER-9999',
      nazev_subjektu: 'Neexistující subjekt',
      status: 'Platný'
    }),
    (error) => error.code === 'NOT_FOUND' && /nelze najit/.test(error.message)
  );
  assert.equal(sheet.rows.length, 0);
});
