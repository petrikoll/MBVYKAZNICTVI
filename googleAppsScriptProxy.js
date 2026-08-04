import { randomUUID } from 'node:crypto';

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 60000;
const DEFAULT_READ_CACHE_TTL_MS = 60000;
const CACHEABLE_GET_ACTIONS = new Set([
  'bootstrap',
  'bootstrapFast',
  'bootstrapCore',
  'bootstrapAuxiliary',
  'listClients',
  'listClientDirectory',
  'listPartners',
  'listIndividualPlans',
  'listPerformances',
  'listMeetings',
  'listNetworkMeetings',
  'listEducation',
  'listSupervision',
  'listStatistics'
]);
const LEGACY_READ_ACTIONS = new Map([
  ['bootstrapFast', 'bootstrapCore'],
  ['listClientDirectory', 'listClients']
]);

const readResponseCache = new Map();
const inFlightReads = new Map();
let mutationGeneration = 0;
const proxyInstanceRevision = randomUUID();

function getDataRevision() {
  return `${proxyInstanceRevision}:${mutationGeneration}`;
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Data-Revision': getDataRevision(),
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(new Error('Požadavek je příliš velký.'));
        request.destroy();
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function getProxyConfig(overrides = {}) {
  return {
    appsScriptUrl: overrides.appsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_CLIENTS_API_URL || '',
    appsScriptToken: overrides.appsScriptToken || process.env.GOOGLE_APPS_SCRIPT_TOKEN || process.env.VITE_CLIENTS_API_TOKEN || ''
  };
}

function buildReadCacheKey(upstreamUrl) {
  const safeUrl = new URL(upstreamUrl);
  safeUrl.searchParams.delete('token');
  safeUrl.searchParams.sort();
  return safeUrl.toString();
}

function sendUpstreamSnapshot(response, snapshot, cacheState = 'MISS') {
  response.writeHead(snapshot.status, {
    'Content-Type': snapshot.contentType || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Data-Revision': getDataRevision(),
    'X-Proxy-Cache': cacheState,
    'X-Upstream-Duration': String(cacheState === 'HIT' ? 0 : snapshot.durationMs || 0)
  });
  response.end(snapshot.body);
}

async function fetchUpstreamSnapshot(fetchImpl, upstreamUrl, fetchOptions, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const upstreamResponse = await fetchImpl(upstreamUrl, { ...fetchOptions, signal: controller.signal });
    return {
      status: upstreamResponse.status,
      contentType: upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      body: await upstreamResponse.text(),
      durationMs: Math.max(0, Date.now() - startedAt)
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isSuccessfulJsonSnapshot(snapshot) {
  if (snapshot.status < 200 || snapshot.status >= 300) return false;
  try {
    return JSON.parse(snapshot.body)?.ok !== false;
  } catch {
    return false;
  }
}

function parseJsonSnapshot(snapshot) {
  try {
    return JSON.parse(snapshot.body);
  } catch {
    return null;
  }
}

function isUnsupportedActionSnapshot(snapshot) {
  if (snapshot.status === 404) return true;
  const payload = parseJsonSnapshot(snapshot);
  return payload?.ok === false && /unknown action|nezn[aá]m[aá] akce/i.test(String(payload.error || ''));
}

function buildClientDirectorySnapshot(snapshot) {
  const payload = parseJsonSnapshot(snapshot);
  if (!isSuccessfulJsonSnapshot(snapshot) || !Array.isArray(payload?.clients)) return snapshot;
  const clients = payload.clients.map((client) => ({
    klient_id: client?.klient_id || '',
    jmeno: client?.jmeno || '',
    prijmeni: client?.prijmeni || '',
    stav_klienta: client?.stav_klienta || client?.status || '',
    klicovy_pracovnik: client?.klicovy_pracovnik || '',
    updated_at: client?.updated_at || ''
  }));
  return {
    ...snapshot,
    body: JSON.stringify({ ok: true, clients })
  };
}

async function fetchCompatibleReadSnapshot(fetchImpl, upstreamUrl, fetchOptions, timeoutMs, action) {
  const snapshot = await fetchUpstreamSnapshot(fetchImpl, upstreamUrl, fetchOptions, timeoutMs);
  const legacyAction = LEGACY_READ_ACTIONS.get(action);
  if (!legacyAction || !isUnsupportedActionSnapshot(snapshot)) return snapshot;

  const legacyUrl = new URL(upstreamUrl);
  legacyUrl.searchParams.set('action', legacyAction);
  const legacySnapshot = await fetchUpstreamSnapshot(fetchImpl, legacyUrl, fetchOptions, timeoutMs);
  if (action === 'listClientDirectory') return buildClientDirectorySnapshot(legacySnapshot);
  return legacySnapshot;
}

async function handleGoogleAppsScriptProxy(request, response, overrides = {}) {
  const { appsScriptUrl, appsScriptToken } = getProxyConfig(overrides);
  const fetchImpl = overrides.fetchImpl || fetch;
  const upstreamTimeoutMs = overrides.upstreamTimeoutMs || DEFAULT_UPSTREAM_TIMEOUT_MS;
  const readCacheTtlMs = overrides.readCacheTtlMs ?? DEFAULT_READ_CACHE_TTL_MS;
  if (!appsScriptUrl || !appsScriptToken) {
    sendJson(response, 503, { ok: false, error: 'Propojení s Google Sheets není bezpečně nakonfigurované.' });
    return;
  }

  if (!['GET', 'POST'].includes(request.method || '')) {
    response.writeHead(405, { Allow: 'GET, POST' });
    response.end();
    return;
  }

  try {
    const incomingUrl = new URL(request.url || '/', 'http://localhost');
    if (request.method === 'GET' && incomingUrl.searchParams.get('action') === 'getDataRevision') {
      sendJson(response, 200, { ok: true, revision: getDataRevision() });
      return;
    }
    const upstreamUrl = new URL(appsScriptUrl);
    incomingUrl.searchParams.forEach((value, key) => {
      if (key !== 'token') upstreamUrl.searchParams.set(key, value);
    });

    const fetchOptions = { method: request.method, redirect: 'follow' };
    if (request.method === 'GET') {
      upstreamUrl.searchParams.set('token', appsScriptToken);
    } else {
      const rawBody = await readRequestBody(request);
      const payload = rawBody ? JSON.parse(rawBody) : {};
      fetchOptions.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      fetchOptions.body = JSON.stringify({ ...payload, token: appsScriptToken });
    }

    const action = incomingUrl.searchParams.get('action') || '';
    const canCacheRead = request.method === 'GET' && CACHEABLE_GET_ACTIONS.has(action) && readCacheTtlMs > 0;
    if (canCacheRead) {
      const cacheKey = buildReadCacheKey(upstreamUrl);
      const cached = readResponseCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        sendUpstreamSnapshot(response, cached.snapshot, 'HIT');
        return;
      }
      if (cached) readResponseCache.delete(cacheKey);

      let upstreamRequest = inFlightReads.get(cacheKey);
      let cacheState = 'COALESCED';
      if (!upstreamRequest) {
        cacheState = 'MISS';
        const generationAtStart = mutationGeneration;
        upstreamRequest = fetchCompatibleReadSnapshot(
          fetchImpl,
          upstreamUrl,
          fetchOptions,
          upstreamTimeoutMs,
          action
        )
          .then((snapshot) => {
            if (generationAtStart === mutationGeneration && isSuccessfulJsonSnapshot(snapshot)) {
              readResponseCache.set(cacheKey, {
                expiresAt: Date.now() + readCacheTtlMs,
                snapshot
              });
            }
            return snapshot;
          })
          .finally(() => inFlightReads.delete(cacheKey));
        inFlightReads.set(cacheKey, upstreamRequest);
      }

      sendUpstreamSnapshot(response, await upstreamRequest, cacheState);
      return;
    }

    if (request.method === 'POST') {
      mutationGeneration += 1;
      readResponseCache.clear();
    }

    const snapshot = await fetchUpstreamSnapshot(fetchImpl, upstreamUrl, fetchOptions, upstreamTimeoutMs);
    sendUpstreamSnapshot(response, snapshot);
  } catch (error) {
    console.error('Google Apps Script proxy error:', error);
    const timedOut = error?.name === 'AbortError';
    sendJson(response, timedOut ? 504 : 502, {
      ok: false,
      error: timedOut
        ? 'Načítání dat z Google Sheets překročilo časový limit.'
        : 'Spojení s Google Sheets selhalo.'
    });
  }
}

export { getDataRevision, handleGoogleAppsScriptProxy };
