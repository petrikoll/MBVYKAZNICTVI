import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');
const context = vm.createContext({
  Utilities: {
    formatDate: () => '2026-07-22-153045'
  },
  Session: {
    getScriptTimeZone: () => 'Europe/Prague'
  }
});
vm.runInContext(source, context);

test('Google dokument se v záloze exportuje jako DOCX', () => {
  const spec = context.backupExportSpec_('application/vnd.google-apps.document', 'Zápis klienta');

  assert.equal(spec.exportMimeType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(spec.fileName, 'Zápis klienta.docx');
});

test('běžný soubor si v záloze zachová název i formát', () => {
  const spec = context.backupExportSpec_('application/pdf', 'příloha.pdf');

  assert.equal(spec.exportMimeType, '');
  assert.equal(spec.fileName, 'příloha.pdf');
});

test('název ZIP zálohy obsahuje jednoznačné datum a čas', () => {
  assert.equal(context.buildBackupFileName_(new Date()), 'kompletni-zaloha-2026-07-22-153045.zip');
});

test('správu kompletní zálohy povolí jen odbornému garantovi', () => {
  assert.doesNotThrow(() => context.assertBackupManager_('Odborný garant'));
  assert.throws(() => context.assertBackupManager_('Sociální pracovník'), /pouze odborny garant/);
});

test('rotace ponechá posledních 12 kompletních záloh', () => {
  const trashed = [];
  const files = Array.from({ length: 14 }, (_, index) => ({
    getName: () => `kompletni-zaloha-${index}.zip`,
    getId: () => `backup-${index}`,
    getDateCreated: () => new Date(2026, 0, index + 1),
    setTrashed: (value) => { if (value) trashed.push(`backup-${index}`); }
  }));
  const folder = {
    getFiles: () => {
      let index = 0;
      return {
        hasNext: () => index < files.length,
        next: () => files[index++]
      };
    }
  };

  context.pruneOldBackups_(folder, 'backup-13');

  assert.deepEqual(trashed.sort(), ['backup-0', 'backup-1']);
});

test('duplicitní názvy souborů v ZIPu dostanou číselnou příponu', () => {
  const usedPaths = {};

  assert.equal(
    context.uniqueBackupArchivePath_('klientske-slozky/KLIENT-0007/MON list.xlsx', usedPaths),
    'klientske-slozky/KLIENT-0007/MON list.xlsx'
  );
  assert.equal(
    context.uniqueBackupArchivePath_('klientske-slozky/KLIENT-0007/MON list.xlsx', usedPaths),
    'klientske-slozky/KLIENT-0007/MON list-2.xlsx'
  );
  assert.equal(
    context.uniqueBackupArchivePath_('klientske-slozky/KLIENT-0007/MON LIST.xlsx', usedPaths),
    'klientske-slozky/KLIENT-0007/MON LIST-3.xlsx'
  );
});
