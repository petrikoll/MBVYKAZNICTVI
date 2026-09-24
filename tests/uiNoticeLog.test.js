import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createUiNoticeLogger } from '../src/lib/uiNoticeLog.js';

function createStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
}

test('hláška přečká chybné odeslání a další otevření aplikace', async () => {
  const storage = createStorage();
  const timestamp = new Date('2026-09-24T05:28:00.000Z');
  const first = createUiNoticeLogger({
    storage,
    clock: () => timestamp,
    makeId: () => 'notice-0001',
    fetchImpl: async () => { throw new Error('offline'); }
  });
  first.enqueue({ message: 'Záznam nebyl uložen.', worker: 'Bc. Josef Jakubec', clientId: 'KLIENT-0064', view: 'ka02', tone: 'error' });
  assert.equal(first.pendingCount(), 1);
  assert.equal(await first.flush(), false);

  let sent;
  const second = createUiNoticeLogger({
    storage,
    clock: () => timestamp,
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, saved: 1 }) };
    }
  });
  assert.equal(await second.flush(), true);
  assert.equal(second.pendingCount(), 0);
  assert.equal(sent.action, 'logUiNotices');
  assert.deepEqual(sent.notices[0], {
    event_id: 'notice-0001',
    shown_at: timestamp.toISOString(),
    worker: 'Bc. Josef Jakubec',
    view: 'ka02',
    client_id: 'KLIENT-0064',
    source: 'app',
    tone: 'error',
    message: 'Záznam nebyl uložen.'
  });
});

test('Apps Script uloží přesný čas a při opakování event_id nepřidá duplicitní řádek', () => {
  const source = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const rows = [];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => Array.from({ length: rowCount }, (_, offset) =>
        (rows[row + offset - 2] || []).slice(column - 1, column - 1 + columnCount)),
      setValues: (values) => values.forEach((value, offset) => { rows[row + offset - 2] = value; })
    })
  };
  context.getSpreadsheet_ = () => ({ getSheetByName: () => sheet });
  context.getOrCreateSheet_ = () => sheet;
  const notice = {
    event_id: 'notice-0001',
    shown_at: '2026-09-24T05:28:00.000Z',
    worker: 'Bc. Josef Jakubec',
    view: 'ka02',
    client_id: 'KLIENT-0064',
    source: 'inline',
    tone: 'error',
    message: '=záznam nebyl uložen'
  };
  assert.equal(context.logUiNotices_([notice, notice]), 1);
  assert.equal(context.logUiNotices_([notice]), 0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][1].toISOString(), notice.shown_at);
  assert.equal(rows[0][8], "'=záznam nebyl uložen");
});
