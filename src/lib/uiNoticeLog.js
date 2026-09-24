const NOTICE_STORAGE_PREFIX = 'mb-ui-notice-v1:';
const UI_NOTICE_EVENT = 'mb:ui-notice';
const MAX_PENDING_NOTICES = 200;
const MAX_NOTICE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 20;

function createUiNoticeLogger({
  storage = safeLocalStorage(),
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  eventTarget = globalThis,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
  makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
} = {}) {
  const memory = new Map();
  let timer = null;
  let sending = false;
  let retryDelayMs = 3000;
  let started = false;
  let lastNoticeSignature = '';
  let lastNoticeTime = 0;

  function storedNotices() {
    const notices = new Map(memory);
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key?.startsWith(NOTICE_STORAGE_PREFIX)) continue;
        const value = JSON.parse(storage.getItem(key) || 'null');
        if (value?.event_id && value?.message) notices.set(value.event_id, value);
      }
    } catch {
      // Prohlížeč může lokální úložiště zakázat; zprávy zůstanou v paměti karty.
    }
    const cutoff = clock().getTime() - MAX_NOTICE_AGE_MS;
    const sorted = [...notices.values()]
      .filter((notice) => Number.isFinite(Date.parse(notice.shown_at)) && Date.parse(notice.shown_at) >= cutoff)
      .sort((left, right) => left.shown_at.localeCompare(right.shown_at));
    for (const notice of notices.values()) {
      if (sorted.includes(notice)) continue;
      memory.delete(notice.event_id);
      try { storage.removeItem(NOTICE_STORAGE_PREFIX + notice.event_id); } catch { /* úložiště není dostupné */ }
    }
    return sorted;
  }

  function persist(notice) {
    memory.set(notice.event_id, notice);
    try { storage.setItem(NOTICE_STORAGE_PREFIX + notice.event_id, JSON.stringify(notice)); } catch { /* úložiště není dostupné */ }
    const notices = storedNotices();
    notices.slice(0, Math.max(0, notices.length - MAX_PENDING_NOTICES)).forEach((old) => {
      memory.delete(old.event_id);
      try { storage.removeItem(NOTICE_STORAGE_PREFIX + old.event_id); } catch { /* úložiště není dostupné */ }
    });
  }

  function queueFlush(delayMs = 3000) {
    if (timer !== null) cancel(timer);
    timer = schedule(() => {
      timer = null;
      void flush();
    }, delayMs);
  }

  function enqueue({ message, tone = 'info', source = 'app', worker = '', view = '', clientId = '' } = {}) {
    const text = String(message || '').trim().slice(0, 1200);
    if (!text) return null;
    const shownAt = clock();
    const signature = [text, tone, source, worker, view, clientId].join('\u001f');
    if (signature === lastNoticeSignature && shownAt.getTime() - lastNoticeTime < 1000) return null;
    lastNoticeSignature = signature;
    lastNoticeTime = shownAt.getTime();
    const notice = {
      event_id: makeId(),
      shown_at: shownAt.toISOString(),
      worker: String(worker || '').slice(0, 100),
      view: String(view || '').slice(0, 60),
      client_id: String(clientId || '').slice(0, 80),
      source: String(source || 'app').slice(0, 60),
      tone: String(tone || 'info').slice(0, 20),
      message: text
    };
    persist(notice);
    if (started) queueFlush();
    return notice;
  }

  async function flush() {
    if (sending || typeof fetchImpl !== 'function') return false;
    const batch = storedNotices().slice(0, BATCH_SIZE);
    if (!batch.length) return true;
    sending = true;
    try {
      const response = await fetchImpl('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logUiNotices', notices: batch }),
        keepalive: true
      });
      const result = await response.json();
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || 'Uložení hlášek selhalo.');
      batch.forEach((notice) => {
        memory.delete(notice.event_id);
        try { storage.removeItem(NOTICE_STORAGE_PREFIX + notice.event_id); } catch { /* úložiště není dostupné */ }
      });
      retryDelayMs = 3000;
      if (storedNotices().length) queueFlush(250);
      return true;
    } catch {
      // Chyba evidence nesmí změnit výsledek původní operace. Události zůstávají ve frontě.
      if (started) queueFlush(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 60000);
      return false;
    } finally {
      sending = false;
    }
  }

  const resume = () => { if (storedNotices().length) queueFlush(0); };
  const onVisible = () => { if (!eventTarget.document?.hidden) resume(); };

  function start() {
    if (started) return;
    started = true;
    eventTarget.addEventListener?.('online', resume);
    eventTarget.addEventListener?.('focus', resume);
    eventTarget.document?.addEventListener?.('visibilitychange', onVisible);
    resume();
  }

  function stop() {
    started = false;
    if (timer !== null) cancel(timer);
    timer = null;
    eventTarget.removeEventListener?.('online', resume);
    eventTarget.removeEventListener?.('focus', resume);
    eventTarget.document?.removeEventListener?.('visibilitychange', onVisible);
  }

  return { enqueue, flush, start, stop, pendingCount: () => storedNotices().length };
}

function safeLocalStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export { NOTICE_STORAGE_PREFIX, UI_NOTICE_EVENT, createUiNoticeLogger };
