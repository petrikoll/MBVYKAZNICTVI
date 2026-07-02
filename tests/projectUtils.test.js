import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackGeneratedText, getClientSupportBreakdown, mapSheetRowToClient } from '../src/lib/projectUtils.js';

test('import pole načte klíčového pracovníka ze sloupce S', () => {
  const row = Array(23).fill('');
  row[1] = 'Jan';
  row[2] = 'Novák';
  row[18] = 'Case manager';
  row[22] = 'Ano';

  assert.equal(mapSheetRowToClient(row, 0).keyWorker, 'Case manager');
});

test('import objektu správně mapuje neaktivní stavy klienta', () => {
  const cancelled = mapSheetRowToClient({ klient_id: '1', jmeno: 'Jan', stav_klienta: 'Stornovaný' }, 0);
  const pending = mapSheetRowToClient({ klient_id: '2', jmeno: 'Eva', stav_klienta: 'Rozpracovaný' }, 1);

  assert.equal(cancelled.projectStatus, 'inactive');
  assert.equal(pending.projectStatus, 'waiting');
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
