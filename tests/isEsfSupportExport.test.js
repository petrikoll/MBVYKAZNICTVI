import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MBV_IS_ESF_SUPPORT_CODE,
  SUPPORT_OUTPUT_HEADERS,
  buildIsEsfSupportExport,
  matchClientsToIsEsfPersonRows,
  parseIsEsfPersonTemplateCsv,
  serializeIsEsfSupportCsv
} from '../src/lib/isEsfSupportExport.js';

const officialHeader = 'Jmeno_Osoby;Prijmeni_Osoby;DatumNarozeni_Osoby;Obec_TrvaleBydlisteOsoby;CastObce_TrvaleBydlisteOsoby;Ulice_TrvaleBydlisteOsoby;CisloPopisne_TrvaleBydlisteOsoby;CisloOrientacni_TrvaleBydlisteOsoby;ZnakCislaOrientacniho_TrvaleBydlisteOsoby;PSC_TrvaleBydlisteOsoby;KodSpecifikace;RozsahPodporyPrezencne;RozsahPodporyElektronicky;CenaPodpory;DatumOd;DatumDo;Poznamka';
const clients = [{ id: 'c1', fullName: 'Anna Nováková', datumVstupu: '2026-07-10' }];
const personRows = [{
  Jmeno_Osoby: 'Anna', Prijmeni_Osoby: 'Nováková', DatumNarozeni_Osoby: '1.2.1980',
  Obec_TrvaleBydlisteOsoby: 'Moravský Beroun', CastObce_TrvaleBydlisteOsoby: '',
  Ulice_TrvaleBydlisteOsoby: 'Náměstí', CisloPopisne_TrvaleBydlisteOsoby: '1',
  CisloOrientacni_TrvaleBydlisteOsoby: '', ZnakCislaOrientacniho_TrvaleBydlisteOsoby: '',
  PSC_TrvaleBydlisteOsoby: '79305'
}];

test('export podpor MBV používá oficiální šablonu a specifikaci sociální práce 7.1', () => {
  const result = buildIsEsfSupportExport({
    clients,
    personRows,
    records: [{
      id: 'r1', clientId: 'c1', activityDate: '2026-07-15',
      payload: { consultationType: 'Odborné sociální poradenství', durationMinutes: 90, place: 'ambulantní' }
    }]
  });
  assert.equal(MBV_IS_ESF_SUPPORT_CODE, '7.1');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].values.KodSpecifikace, '7.1');
  assert.equal(result.rows[0].values.RozsahPodporyPrezencne, '1,5');
  assert.equal(result.rows[0].values.RozsahPodporyElektronicky, '0');
  const csv = serializeIsEsfSupportCsv(result.validRows.map((row) => row.values));
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  assert.equal(lines[0], officialHeader);
  assert.equal(SUPPORT_OUTPUT_HEADERS.length, 17);
  assert.equal(lines[1].split(';').length, 17);
  assert.match(lines[1], /;"7\.1";1,5;0;;15\.7\.2026;15\.7\.2026;/);
});

test('výkony jedné osoby se za období sečtou a telefonická podpora se oddělí', () => {
  const result = buildIsEsfSupportExport({
    clients,
    personRows,
    records: [
      { id: 'r1', clientIds: ['c1'], activityDate: '2026-07-15', payload: { durationMinutes: 60, place: 'terénní' } },
      { id: 'r2', clientIds: ['c1'], activityDate: '2026-08-20', payload: { durationMinutes: 30, place: 'Telefonní' } }
    ]
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].values.RozsahPodporyPrezencne, '1');
  assert.equal(result.rows[0].values.RozsahPodporyElektronicky, '0,5');
  assert.equal(result.rows[0].values.DatumOd, '15.7.2026');
  assert.equal(result.rows[0].values.DatumDo, '20.8.2026');
});

test('první monitorovací období začíná vstupem klienta a končí koncem období', () => {
  const result = buildIsEsfSupportExport({
    clients,
    personRows,
    reportingPeriod: { start: '2026-07-01', end: '2026-12-31' },
    isFirstReportingPeriod: true,
    records: [{ id: 'r1', clientId: 'c1', activityDate: '2026-09-01', payload: { durationMinutes: 60 } }]
  });
  assert.equal(result.rows[0].values.DatumOd, '10.7.2026');
  assert.equal(result.rows[0].values.DatumDo, '31.12.2026');
});

test('chybné datum nebo nulová délka zablokují řádek podpory', () => {
  const result = buildIsEsfSupportExport({
    clients,
    personRows,
    records: [{ id: 'r-bad', clientId: 'c1', activityDate: '', payload: { durationMinutes: 0 } }]
  });
  assert.equal(result.validRows.length, 0);
  assert.equal(result.errorCount, 2);
});

test('načte identifikační CSV z IS ESF a zachová adresu pro export podpor', () => {
  const csv = '\uFEFF' + SUPPORT_OUTPUT_HEADERS.join(';') + '\r\n'
    + 'Anna;Nováková;1.2.1980;Olomouc;;"Třída; Svobody";12;;;;;;;;;;;\r\n';
  const parsed = parseIsEsfPersonTemplateCsv(csv);
  assert.equal(parsed.rowCount, 1);
  assert.equal(parsed.rows[0].Ulice_TrvaleBydlisteOsoby, 'Třída; Svobody');
});

test('import z IS ESF přijme i úplný export osob s dalšími sloupci', () => {
  const csv = [
    [...SUPPORT_OUTPUT_HEADERS.slice(0, 10), 'TitulPredJmenem_Osoby', 'Partner'].join(';'),
    'Anna;Nováková;01.02.1980;Olomouc;;Náměstí;12;;;;Mgr.;Město'
  ].join('\r\n');
  const parsed = parseIsEsfPersonTemplateCsv(csv);
  assert.equal(parsed.rowCount, 1);
  assert.equal(parsed.rows[0].Jmeno_Osoby, 'Anna');
});

test('klienty spáruje s importem IS ESF podle jména, příjmení a data narození', () => {
  const match = matchClientsToIsEsfPersonRows([
    { id: 'c1', jmeno: 'Anna', prijmeni: 'Nováková', datumNarozeni: '1980-02-01' },
    { id: 'c2', jmeno: 'Petr', prijmeni: 'Malý', datumNarozeni: '2.3.1970' }
  ], personRows);
  assert.deepEqual(match.matchedClients.map((client) => client.id), ['c1']);
  assert.deepEqual(match.unmatchedClients.map((client) => client.id), ['c2']);
  assert.equal(match.ambiguousClients.length, 0);
});

test('duplicitní osoba v importu IS ESF se nepřiřadí nejednoznačně', () => {
  const match = matchClientsToIsEsfPersonRows([
    { id: 'c1', jmeno: 'Anna', prijmeni: 'Nováková', datumNarozeni: '1.2.1980' }
  ], [personRows[0], { ...personRows[0] }]);
  assert.equal(match.matchedClients.length, 0);
  assert.deepEqual(match.ambiguousClients.map((client) => client.id), ['c1']);
});
