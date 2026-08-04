import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackGeneratedText,
  getClientSupportBreakdown,
  isDepistageRecord,
  isLongTermProjectGoalEvidenceRecord,
  isShortTermProjectGoalEvidenceRecord,
  mapSheetRowToClient
} from '../src/lib/projectUtils.js';

test('depistáž s komentářem se započítá pouze do krátkodobých cílů', () => {
  const outreach = {
    entityType: 'consultations',
    payload: { consultationType: 'Depistáž' }
  };
  const commentedOutreach = {
    entityType: 'consultations',
    payload: {
      consultationType: 'Depistáž',
      supportSpecific: { physicalRecordComment: 'Klient dostal kontakt na službu.' }
    }
  };
  const fieldWork = {
    entityType: 'consultations',
    payload: { consultationType: 'Terénní sociální práce' }
  };

  assert.equal(isDepistageRecord(outreach), true);
  assert.equal(isShortTermProjectGoalEvidenceRecord(outreach), false);
  assert.equal(isShortTermProjectGoalEvidenceRecord(commentedOutreach), true);
  assert.equal(isLongTermProjectGoalEvidenceRecord(commentedOutreach), false);
  assert.equal(isShortTermProjectGoalEvidenceRecord(fieldWork), true);
  assert.equal(isLongTermProjectGoalEvidenceRecord(fieldWork), true);
  assert.equal(isShortTermProjectGoalEvidenceRecord({ entityType: 'plans' }), false);
});

test('import pole převede starší roli klíčového pracovníka na skutečné jméno', () => {
  const row = Array(23).fill('');
  row[1] = 'Jan';
  row[2] = 'Novák';
  row[18] = 'Case manager';
  row[22] = 'Ano';

  assert.equal(mapSheetRowToClient(row, 0).keyWorker, 'Bc. Josef Jakubec');
});

test('import objektu správně mapuje neaktivní stavy klienta', () => {
  const cancelled = mapSheetRowToClient({ klient_id: '1', jmeno: 'Jan', stav_klienta: 'Stornovaný' }, 0);
  const pending = mapSheetRowToClient({ klient_id: '2', jmeno: 'Eva', stav_klienta: 'Rozpracovaný' }, 1);

  assert.equal(cancelled.projectStatus, 'inactive');
  assert.equal(pending.projectStatus, 'waiting');
});

test('klient se v aplikaci zobrazuje jednotně jako příjmení a jméno', () => {
  const client = mapSheetRowToClient({
    klient_id: 'KLIENT-0018',
    jmeno: 'František',
    prijmeni: 'Král'
  }, 0);

  assert.equal(client.fullName, 'Král František');
});

test('import objektu načte vzdělání i ze staršího nebo popisného záhlaví', () => {
  const legacy = mapSheetRowToClient({
    klient_id: '1',
    jmeno: 'Jan',
    vzdelani: 'SOU'
  }, 0);
  const descriptive = mapSheetRowToClient({
    klient_id: '2',
    jmeno: 'Eva',
    'Nejvyšší dosažené vzdělání': 'VŠ'
  }, 1);

  assert.equal(legacy.vzdelani, 'SOU');
  assert.equal(descriptive.vzdelani, 'VŠ');
});

test('import objektu převede číselné datum Google Sheets na běžné datum', () => {
  const client = mapSheetRowToClient({
    klient_id: '1',
    jmeno: 'Dagmar',
    datum_narozeni: 16280
  }, 0);

  assert.equal(client.datumNarozeni, '27.7.1944');
});

test('import klienta zachová přesnou verzi řádku pro bezpečnou úpravu', () => {
  const updatedAt = '2026-08-04T09:15:30.123Z';
  const client = mapSheetRowToClient({
    klient_id: 'KLIENT-0001',
    jmeno: 'Alena',
    updated_at: updatedAt
  }, 0);

  assert.equal(client.expectedUpdatedAt, updatedAt);
  assert.equal(client.updatedAt, Date.parse(updatedAt));
});

test('statistika použije délku v minutách, když nejsou časy od-do', () => {
  const summary = getClientSupportBreakdown('client-1', [{
    id: 'record-1',
    clientId: 'client-1',
    entityType: 'consultations',
    payload: { durationMinutes: 90 }
  }]);

  assert.equal(summary.totalMinutes, 90);
  assert.equal(summary.totalHours, 1.5);
});

test('pracovní fallback zápisu podpory nepůsobí jako export formuláře', () => {
  const text = buildFallbackGeneratedText('Zápis podpory', { fullName: 'Jan Novák' }, {
    selectedKey: 'consultation',
    consultationType: 'Základní sociální poradenství',
    supportArea: 'zdraví',
    topics: 'Klientovi byla poskytnuta informace o prodloužení pracovní neschopnosti.',
    nextSteps: 'V případě ukončení PN ohlásit tuto skutečnost ÚP.'
  });

  assert.match(text, /Klientovi byla poskytnuta informace/);
  assert.doesNotMatch(text, /Typ podpory:/);
  assert.doesNotMatch(text, /Oblast podpory:/);
});
