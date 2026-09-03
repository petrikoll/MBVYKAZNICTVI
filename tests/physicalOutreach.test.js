import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPhysicalSignedFiledOutreachText } from '../src/lib/physicalOutreach.js';
import { buildGeneratorRecord } from '../src/lib/projectUtils.js';

test('fyzicky založená depistáž vytvoří základní elektronický text', () => {
  const text = buildPhysicalSignedFiledOutreachText();

  assert.match(text, /fyzicky podepsán a založen/);
  assert.doesNotMatch(text, /Doplňující elektronický komentář:/);
});

test('komentář k fyzickému zápisu se přidá do elektronického dokumentu', () => {
  const text = buildPhysicalSignedFiledOutreachText('  Klient dostal kontaktní kartu.  ');

  assert.match(text, /Doplňující elektronický komentář: Klient dostal kontaktní kartu\./);
});

test('komentář zůstane uložený ve strukturovaných datech výkonu', () => {
  const record = buildGeneratorRecord({
    client: { id: 'client-1', fullName: 'Testovací klient' },
    generatorDraft: {
      selectedKey: 'consultation',
      date: '2026-07-31',
      worker: 'Mgr. Lea Ledecká',
      supportSpecific: {
        physicalSignedFiled: true,
        physicalRecordComment: 'Doplněn kontakt na službu.'
      }
    },
    generatedText: buildPhysicalSignedFiledOutreachText('Doplněn kontakt na službu.')
  });

  assert.equal(record.payload.supportSpecific.physicalRecordComment, 'Doplněn kontakt na službu.');
  assert.match(record.documentText, /Doplněn kontakt na službu\./);
});
