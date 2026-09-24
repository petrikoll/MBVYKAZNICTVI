import { UI_NOTICE_EVENT } from './uiNoticeLog.js';
import { createDiagnosticsStore } from './localDiagnosticsStore.js';

const DIAGNOSTICS_SETTING_KEY = 'mb-local-diagnostics-enabled-v1';
const MAX_DIAGNOSTIC_EVENTS = 2000;
const MAX_DIAGNOSTIC_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FLUSH_DELAY_MS = 5000;

const ACTION_LABELS = new Set([
  'Klienti', 'KA1-Individuální podpora', 'KA2-Case management', 'KA2-Tvorba sítě',
  'Porady', 'Vzdělávání a supervize', 'Dashboard', 'Upravit', 'Smazat', 'Detail', 'Skrýt',
  'Uložit', 'Uložit aktivitu', 'Uložit úpravu aktéra', 'Uložit aktéra do registru',
  'Zrušit úpravu', 'Přidat osobu', 'Odebrat', 'Změnit osoby', 'Přidat klienta',
  'Zavřít formulář', 'Uložit klienta', 'Uložit změny', 'Uložit výkon', 'Uložit záznam',
  'Vygenerovat návrh AI', 'Hromadné stažení', 'Podrobné výstupy', 'Zpět',
  'Zavřít', 'Zrušit', 'Potvrdit', 'DOCX', 'PDF', 'XLSX', 'Tisk', 'Nainstalovat aplikaci'
]);

// Never copy field values, record titles, client-card text, link URLs or data payloads.
function describeDiagnosticClick(target) {
  const element = target?.closest?.('button, a, [role="button"], input, select, textarea, summary');
  if (!element || element.closest('[data-diagnostics-ignore]')) return null;
  if (element.closest('[aria-label="Seznam klientů"]')) return { action: 'Ovládání seznamu klientů' };
  const tag = element.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) return { action: `Pole: ${tag === 'input' ? element.type : tag}` };
  const label = String(element.textContent || '').trim().replace(/\s+/g, ' ');
  if (ACTION_LABELS.has(label)) return { action: label };
  if (label.startsWith('Vytvořit prezenční listinu')) return { action: 'Vytvořit prezenční listinu' };
  if (String(element.getAttribute('aria-label') || '').startsWith('Nápověda:')) return { action: 'Nápověda' };
  const verb = ['Uložit', 'Upravit', 'Smazat', 'Přidat', 'Vybrat', 'Změnit', 'Vygenerovat', 'Stáhnout', 'Exportovat', 'Obnovit', 'Kopírovat']
    .find((action) => label.startsWith(`${action} `));
  if (verb) return { action: verb };
  return { action: tag === 'a' ? 'Otevřít odkaz' : tag === 'summary' ? 'Rozbalit oddíl' : 'Tlačítko' };
}

const safeStorage = () => { try { return globalThis.localStorage; } catch { return null; } };
const text = (value, limit) => String(value || '').slice(0, limit);

function createLocalDiagnostics({
  storage = safeStorage(), store = createDiagnosticsStore(), eventTarget = globalThis,
  clock = () => Date.now(), schedule = globalThis.setTimeout, cancel = globalThis.clearTimeout,
  sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
} = {}) {
  let enabled = true;
  try { enabled = storage?.getItem(DIAGNOSTICS_SETTING_KEY) !== '0'; } catch { /* Memory remains available. */ }
  let context = {};
  let sequence = 0;
  let timer = null;
  let writing = null;
  let storageFailed = false;
  let started = false;
  const memory = new Map();
  const pending = new Map();
  const subscribers = new Set();
  const limits = () => ({ cutoff: clock() - MAX_DIAGNOSTIC_AGE_MS, maxEvents: MAX_DIAGNOSTIC_EVENTS });
  const snapshot = () => ({ enabled, storageFailed });
  const notify = () => subscribers.forEach((subscriber) => subscriber(snapshot()));
  const failStorage = () => { storageFailed = true; pending.clear(); notify(); };

  function queueFlush() {
    if (timer !== null || storageFailed || !pending.size || !started) return;
    timer = schedule(() => { timer = null; void flush(); }, FLUSH_DELAY_MS);
  }

  function record(kind, fields = {}) {
    if (!enabled) return null;
    const timestamp = clock();
    const event = {
      id: `${sessionId}:${String(++sequence).padStart(10, '0')}`,
      sessionId, timestamp, at: new Date(timestamp).toISOString(), kind,
      view: text(context.view, 60), worker: text(context.worker, 100), clientId: text(context.clientId, 80),
      ...fields
    };
    memory.set(event.id, event);
    if (!storageFailed) pending.set(event.id, event);
    if (memory.size > MAX_DIAGNOSTIC_EVENTS) memory.delete(memory.keys().next().value);
    if (pending.size > MAX_DIAGNOSTIC_EVENTS) pending.delete(pending.keys().next().value);
    queueFlush();
    return event;
  }

  function enqueue({ message, tone = 'info', source = 'app', clientId } = {}) {
    if (!message) return null;
    return record('notice', {
      message: text(message, 1200), tone: text(tone, 20), source: text(source, 60),
      ...(clientId ? { clientId: text(clientId, 80) } : {})
    });
  }

  async function flush() {
    if (timer !== null) { cancel(timer); timer = null; }
    if (storageFailed) return false;
    if (writing) return writing;
    const batch = [...pending.values()];
    if (!batch.length) return true;
    writing = (async () => {
      try {
        await store.append(batch, limits());
        batch.forEach((event) => pending.delete(event.id));
        return true;
      } catch { failStorage(); return false; }
      finally { writing = null; queueFlush(); }
    })();
    return writing;
  }

  function setEnabled(value, persist = true) {
    const next = Boolean(value);
    if (enabled === next) return;
    if (!next) record('recording', { action: 'Záznam vypnut' });
    enabled = next;
    if (persist) try { storage?.setItem(DIAGNOSTICS_SETTING_KEY, next ? '1' : '0'); } catch { /* No blocking retry. */ }
    if (next) record('recording', { action: 'Záznam zapnut' });
    else void flush();
    notify();
  }

  const onClick = (event) => {
    if (!enabled) return;
    const details = describeDiagnosticClick(event.target);
    if (details) record('click', details);
  };
  const onNotice = (event) => enqueue(event.detail || {});
  const onOnline = () => record('connection', { action: 'Připojení obnoveno' });
  const onOffline = () => record('connection', { action: 'Prohlížeč je offline' });
  const onHidden = () => { if (eventTarget.document?.hidden) void flush(); };
  const onPageHide = () => { void flush(); };
  const onStorage = (event) => {
    if (event.key === DIAGNOSTICS_SETTING_KEY) setEnabled(event.newValue !== '0', false);
  };

  function start() {
    if (started) return;
    started = true;
    eventTarget.document?.addEventListener('click', onClick, { capture: true, passive: true });
    eventTarget.document?.addEventListener('visibilitychange', onHidden);
    eventTarget.addEventListener?.(UI_NOTICE_EVENT, onNotice);
    eventTarget.addEventListener?.('online', onOnline);
    eventTarget.addEventListener?.('offline', onOffline);
    eventTarget.addEventListener?.('pagehide', onPageHide);
    eventTarget.addEventListener?.('storage', onStorage);
    record('session', { action: 'Otevření aplikace' });
    queueFlush();
  }

  function stop() {
    started = false;
    eventTarget.document?.removeEventListener('click', onClick, true);
    eventTarget.document?.removeEventListener('visibilitychange', onHidden);
    eventTarget.removeEventListener?.(UI_NOTICE_EVENT, onNotice);
    eventTarget.removeEventListener?.('online', onOnline);
    eventTarget.removeEventListener?.('offline', onOffline);
    eventTarget.removeEventListener?.('pagehide', onPageHide);
    eventTarget.removeEventListener?.('storage', onStorage);
    if (timer !== null) { cancel(timer); timer = null; }
    void flush();
  }

  async function exportSnapshot() {
    await flush();
    let stored = [];
    if (!storageFailed) try { stored = await store.read(limits()); } catch { failStorage(); }
    const merged = new Map(stored.map((event) => [event.id, event]));
    memory.forEach((event, id) => merged.set(id, event));
    const events = [...merged.values()].filter((event) => event.timestamp >= limits().cutoff)
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)).slice(-MAX_DIAGNOSTIC_EVENTS);
    return {
      schemaVersion: 1, application: 'Moravský Beroun – projektové výkaznictví',
      exportedAt: new Date(clock()).toISOString(), recordingEnabled: enabled,
      storage: storageFailed ? 'memory-only' : 'indexeddb',
      retention: { maxEvents: MAX_DIAGNOSTIC_EVENTS, days: 7 },
      eventCount: events.length, events
    };
  }

  return {
    enqueue, start, stop, flush, snapshot, setEnabled, exportSnapshot,
    setContext: (value) => { context = value || {}; },
    navigation: (view) => record('navigation', { action: text(view, 60) }),
    subscribe: (subscriber) => { subscribers.add(subscriber); return () => subscribers.delete(subscriber); }
  };
}

export { createLocalDiagnostics, describeDiagnosticClick, DIAGNOSTICS_SETTING_KEY, MAX_DIAGNOSTIC_EVENTS };
