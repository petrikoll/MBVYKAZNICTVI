import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGeneratorRecord, getEffectiveRecordKa } from '../src/lib/projectUtils.js';

const client = { id: 'client-1', fullName: 'Testovací klient' };

test('nové multioborové setkání se ukládá jako KA2', () => {
  const record = buildGeneratorRecord({
    client,
    generatorDraft: {
      selectedKey: 'consultation',
      caseManagementMode: true,
      consultationType: 'multioborové setkání',
      date: '2026-07-31',
      worker: 'Case manager',
      supportSpecific: {},
      partnerNames: []
    },
    generatedText: 'Proběhlo multioborové setkání.'
  });

  assert.equal(record.ka, 'KA2');
  assert.equal(record.payload.caseManagementMode, true);
  assert.equal(record.payload.consultationType, 'multioborové setkání');
});

test('starší chybně označený case management se pro filtr počítá jako KA2', () => {
  const legacyRecord = {
    ka: 'KA1',
    payload: {
      caseManagementMode: true,
      consultationType: 'multioborové setkání'
    }
  };

  assert.equal(getEffectiveRecordKa(legacyRecord), 'KA2');
});

test('běžný výkon KA1 zůstává ve své aktivitě', () => {
  assert.equal(getEffectiveRecordKa({ ka: 'KA1', payload: { caseManagementMode: false } }), 'KA1');
});
