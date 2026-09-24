import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';
import { createDiagnosticsStore } from '../src/lib/localDiagnosticsStore.js';
import { createLocalDiagnostics, DIAGNOSTICS_SETTING_KEY, MAX_DIAGNOSTIC_EVENTS } from '../src/lib/localDiagnostics.js';
import { UI_NOTICE_EVENT } from '../src/lib/uiNoticeLog.js';

function fixture(options = {}) {
  const indexedDB = new IDBFactory();
  const jobs = new Map();
  let jobId = 0;
  let now = Date.parse('2026-09-24T10:00:00Z');
  const settings = new Map();
  const storage = { getItem: (key) => settings.get(key) ?? null, setItem: (key, value) => settings.set(key, value) };
  const makeRecorder = (overrides = {}) => createLocalDiagnostics({
    storage, store: createDiagnosticsStore({ indexedDB }), clock: () => now,
    schedule: (callback) => { jobs.set(++jobId, callback); return jobId; }, cancel: (id) => jobs.delete(id),
    ...options, ...overrides
  });
  return { makeRecorder, jobs, storage, advance: (ms) => { now += ms; } };
}

test('místní historie přežije nové otevření a zachová přesnou hlášku bez síťového požadavku', async () => {
  const dom = new JSDOM('<button>Uložit úpravu aktéra</button>');
  let fetchCalls = 0;
  dom.window.fetch = () => { fetchCalls += 1; throw new Error('Unexpected network'); };
  const f = fixture({ eventTarget: dom.window });
  const first = f.makeRecorder();
  first.setContext({ worker: 'Pracovník testu', view: 'ka01', clientId: 'KLIENT-TEST' });
  first.start();
  dom.window.document.querySelector('button').click();
  dom.window.dispatchEvent(new dom.window.CustomEvent(UI_NOTICE_EVENT, {
    detail: { message: 'Aktér nebyl uložen: vyberte původ sítě.', tone: 'error', source: 'inline' }
  }));
  await first.flush();
  first.stop();
  const reopened = f.makeRecorder();
  const report = await reopened.exportSnapshot();
  assert.equal(fetchCalls, 0);
  assert.equal(report.storage, 'indexeddb');
  assert.deepEqual(report.events.map((event) => event.kind), ['session', 'click', 'notice']);
  assert.equal(report.events[1].action, 'Uložit úpravu aktéra');
  assert.equal(report.events[2].message, 'Aktér nebyl uložen: vyberte původ sítě.');
  assert.equal(report.events[2].clientId, 'KLIENT-TEST');
  assert.equal(report.events[2].worker, 'Pracovník testu');
  dom.window.close();
});

test('kliknutí nekopírují klientské karty, vlastní popisky, hodnoty polí ani adresy odkazů', async () => {
  const dom = new JSDOM('<div aria-label="Seznam klientů"><button>Tajný Klient — tajný zápis</button></div><input value="tajný obsah"><textarea>tajný text</textarea><a href="https://example.test/?token=secret">tajný odkaz</a><button>tajný vlastní název</button><div data-diagnostics-ignore><button>Diagnostika</button></div>');
  const f = fixture({ eventTarget: dom.window });
  const recorder = f.makeRecorder();
  recorder.start();
  dom.window.document.querySelector('a').addEventListener('click', (event) => event.preventDefault());
  dom.window.document.querySelectorAll('button,input,textarea,a').forEach((element) => {
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  const report = await recorder.exportSnapshot();
  const encoded = JSON.stringify(report);
  assert.doesNotMatch(encoded, /tajný|Tajný|secret|example\.test/);
  assert.deepEqual(report.events.filter((event) => event.kind === 'click').map((event) => event.action), [
    'Ovládání seznamu klientů', 'Pole: text', 'Pole: textarea', 'Otevřít odkaz', 'Tlačítko'
  ]);
  recorder.stop();
  dom.window.close();
});

test('historie je omezená na 2000 nejnovějších událostí a sedm dní i po obnovení', async () => {
  const f = fixture();
  const first = f.makeRecorder({ sessionId: 'retention' });
  first.enqueue({ message: 'stará hláška' });
  await first.flush();
  f.advance(8 * 86400000);
  for (let index = 0; index < MAX_DIAGNOSTIC_EVENTS + 10; index += 1) first.enqueue({ message: `nová ${index}` });
  await first.flush();
  const report = await f.makeRecorder().exportSnapshot();
  assert.equal(report.eventCount, MAX_DIAGNOSTIC_EVENTS);
  assert.equal(report.events[0].message, 'nová 10');
  assert.equal(report.events.at(-1).message, 'nová 2009');
  f.advance(8 * 86400000);
  assert.equal((await f.makeRecorder().exportSnapshot()).eventCount, 0);
});

test('souběžné karty si navzájem nepřepisují historii', async () => {
  const f = fixture();
  const first = f.makeRecorder({ sessionId: 'first-tab' });
  const second = f.makeRecorder({ sessionId: 'second-tab' });
  first.enqueue({ message: 'první karta' });
  second.enqueue({ message: 'druhá karta' });
  await Promise.all([first.flush(), second.flush()]);
  assert.deepEqual(new Set((await f.makeRecorder().exportSnapshot()).events.map((event) => event.message)), new Set(['první karta', 'druhá karta']));
});

test('kliknutí a hlášky jen zařadí jednu dávku a nezapisují synchronně', async () => {
  let writes = 0;
  const f = fixture({ store: { append: async () => { writes += 1; }, read: async () => [] } });
  const recorder = f.makeRecorder();
  let notifications = 0;
  recorder.subscribe(() => { notifications += 1; });
  recorder.start();
  for (let index = 0; index < 100; index += 1) recorder.enqueue({ message: `hláška ${index}` });
  assert.equal(writes, 0);
  assert.equal(f.jobs.size, 1);
  assert.equal(notifications, 0);
  await recorder.flush();
  assert.equal(writes, 1);
  assert.equal(f.jobs.size, 0);
  recorder.stop();
});

test('selhání místního úložiště ponechá export v paměti bez dalších pokusů', async () => {
  let writes = 0;
  const f = fixture({ store: { append: async () => { writes += 1; throw new Error('QuotaExceeded'); }, read: async () => { throw new Error('Must not retry'); } } });
  const recorder = f.makeRecorder();
  recorder.start();
  recorder.enqueue({ message: 'hláška před chybou' });
  assert.equal(await recorder.flush(), false);
  recorder.enqueue({ message: 'hláška po chybě' });
  const report = await recorder.exportSnapshot();
  assert.equal(writes, 1);
  assert.equal(f.jobs.size, 0);
  assert.equal(report.storage, 'memory-only');
  assert.equal(report.events.at(-1).message, 'hláška po chybě');
  assert.equal(recorder.snapshot().storageFailed, true);
  recorder.stop();
});

test('vypnutí platí po obnovení, zachová historii a změna z jiné karty záznam znovu zapne', async () => {
  const dom = new JSDOM('');
  const f = fixture({ eventTarget: dom.window });
  const recorder = f.makeRecorder();
  recorder.start();
  recorder.enqueue({ message: 'zachovat' });
  recorder.setEnabled(false);
  assert.equal(recorder.enqueue({ message: 'nezaznamenat' }), null);
  await recorder.flush();
  recorder.stop();
  const reopened = f.makeRecorder();
  assert.equal(reopened.snapshot().enabled, false);
  reopened.start();
  const before = await reopened.exportSnapshot();
  assert.equal(before.events.some((event) => event.message === 'zachovat'), true);
  assert.equal(before.events.some((event) => event.message === 'nezaznamenat'), false);
  dom.window.dispatchEvent(new dom.window.StorageEvent('storage', { key: DIAGNOSTICS_SETTING_KEY, newValue: '1' }));
  assert.equal(reopened.snapshot().enabled, true);
  reopened.enqueue({ message: 'znovu zapnuto' });
  assert.equal((await reopened.exportSnapshot()).events.at(-1).message, 'znovu zapnuto');
  reopened.stop();
  dom.window.close();
});

test('událost vzniklá během zápisu zůstane pro další dávku', async () => {
  let finish;
  const saved = [];
  let firstWrite = true;
  const f = fixture({ store: {
    append: async (events) => {
      if (firstWrite) { firstWrite = false; await new Promise((resolve) => { finish = resolve; }); }
      saved.push(...events);
    }, read: async () => saved
  } });
  const recorder = f.makeRecorder();
  recorder.enqueue({ message: 'první' });
  const writing = recorder.flush();
  recorder.enqueue({ message: 'druhá' });
  finish();
  await writing;
  await recorder.flush();
  assert.deepEqual(saved.map((event) => event.message), ['první', 'druhá']);
});
