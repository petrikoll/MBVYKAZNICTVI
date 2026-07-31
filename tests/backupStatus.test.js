import test from 'node:test';
import assert from 'node:assert/strict';

import { backupProgressText, isBackupStatusActive } from '../src/lib/backupStatus.js';

test('stav zálohy je aktivní jen ve frontě a během zpracování', () => {
  assert.equal(isBackupStatusActive({ state: 'queued' }), true);
  assert.equal(isBackupStatusActive({ state: 'running' }), true);
  assert.equal(isBackupStatusActive({ state: 'success' }), false);
  assert.equal(isBackupStatusActive({ state: 'error' }), false);
});

test('průběh zálohy zobrazuje počet skutečně zpracovaných souborů', () => {
  assert.equal(backupProgressText({ state: 'running', processedFiles: 17 }), 'Zpracováno souborů: 17');
  assert.equal(backupProgressText({ state: 'success', processedFiles: 17 }), '');
  assert.equal(backupProgressText({ state: 'running', processedFiles: 0 }), '');
});
