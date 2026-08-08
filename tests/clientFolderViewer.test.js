import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const appsScriptSource = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

function iterator(items) {
  let index = 0;
  return {
    hasNext: () => index < items.length,
    next: () => items[index++]
  };
}

function createTextFile(id, name, updatedAt, text = '') {
  return {
    getId: () => id,
    getName: () => name,
    getMimeType: () => 'text/plain',
    getSize: () => text.length,
    getLastUpdated: () => new Date(updatedAt),
    getUrl: () => `https://drive.google.com/file/d/${id}/view`,
    getBlob: () => ({ getDataAsString: () => text })
  };
}

test('prohlížeč vrací pouze soubory z ověřené klientské složky', () => {
  const context = vm.createContext({});
  vm.runInContext(appsScriptSource, context);
  const older = createTextFile('file-older', 'Starší zápis.txt', '2026-07-01T10:00:00Z', 'starší');
  const newer = createTextFile('file-newer', 'Novější zápis.txt', '2026-08-01T10:00:00Z', 'obsah náhledu');
  const folder = {
    getId: () => 'client-folder',
    getName: () => 'KLIENT-0001 - Novák - Jan',
    getUrl: () => 'https://drive.google.com/drive/folders/client-folder',
    getFiles: () => iterator([older, newer])
  };
  context.getClientFolderForBrowse_ = () => ({ client: { klient_id: 'KLIENT-0001' }, folder });

  const listed = context.listClientFolderFiles_('KLIENT-0001');
  assert.deepEqual(Array.from(listed.files, (file) => file.id), ['file-newer', 'file-older']);
  assert.equal(listed.files[0].previewable, true);

  const preview = context.getClientFolderFilePreview_('KLIENT-0001', 'file-newer');
  assert.equal(preview.type, 'text');
  assert.equal(preview.text, 'obsah náhledu');
  assert.throws(
    () => context.getClientFolderFilePreview_('KLIENT-0001', 'foreign-file'),
    /nepatri do slozky vybraneho klienta/
  );
});

test('kliknutí na klientskou složku otevírá interní dialog', () => {
  assert.match(appSource, /onClick=\{openClientFolderViewer\}/);
  assert.match(appSource, /Složka\s*<\/button>/);
  assert.match(appSource, /aria-labelledby="client-folder-viewer-title"/);
  assert.match(appSource, /getClientFolderFilePreview/);
  assert.doesNotMatch(appSource, /title: 'Klientská složka - ZDE'/);
});
