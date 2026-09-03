import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WORKERS,
  canonicalizeWorkerName,
  canonicalizeWorkerReferences,
  isCaseManagerWorker,
  isGarantWorker
} from '../src/config/projectConfig.js';

test('aplikace nabízí skutečná jména pracovníků ve správném pořadí', () => {
  assert.deepEqual(WORKERS, [
    'Mgr. Lea Ledecká',
    'Bc. Josef Jakubec',
    'Mgr. Radka Vysloužilová'
  ]);
});

test('starší názvy rolí se při načtení převedou na skutečná jména', () => {
  assert.equal(canonicalizeWorkerName('Sociální pracovník'), 'Mgr. Lea Ledecká');
  assert.equal(canonicalizeWorkerName('Case manager'), 'Bc. Josef Jakubec');
  assert.equal(canonicalizeWorkerName('Garant projektu'), 'Mgr. Radka Vysloužilová');
});

test('starý chybný titul pracovnice se při načtení opraví', () => {
  assert.equal(canonicalizeWorkerName('Lea Ledecká, Dis.'), 'Mgr. Lea Ledecká');
  assert.equal(canonicalizeWorkerName('Lea Ledecká'), 'Mgr. Lea Ledecká');
});

test('převod zachová oprávnění case managera a garantky', () => {
  assert.equal(isCaseManagerWorker('Bc. Josef Jakubec'), true);
  assert.equal(isCaseManagerWorker('Case manager'), true);
  assert.equal(isGarantWorker('Mgr. Radka Vysloužilová'), true);
  assert.equal(isGarantWorker('Odborný garant'), true);
});

test('starší jména se převedou také uvnitř načtených záznamů', () => {
  assert.deepEqual(canonicalizeWorkerReferences({
    worker: 'Lea Ledecká, Dis.',
    payload: { workers: ['Case manager', 'Garant projektu'] }
  }), {
    worker: 'Mgr. Lea Ledecká',
    payload: { workers: ['Bc. Josef Jakubec', 'Mgr. Radka Vysloužilová'] }
  });
});
