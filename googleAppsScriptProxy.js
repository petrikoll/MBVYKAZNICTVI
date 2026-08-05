import { randomUUID } from 'node:crypto';

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 60000;
const DEFAULT_READ_CACHE_TTL_MS = 60000;
const DELETE_CONFIRMATION_DELAYS_MS = [0, 500, 1500, 3000];
const DELETE_CONFIRMATION_TIMEOUT_MS = 15000;
const CLIENT_REGISTRY_NOT_FOUND_RETRY_DELAYS_MS = [250, 750];
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

function isAmbiguousMutationSnapshot(snapshot) {
  return parseJsonSnapshot(snapshot) === null || snapshot.status >= 500;
}

async function verifyClientMutationResult(fetchImpl, appsScriptUrl, appsScriptToken, requestId, expectedAction, upstreamTimeoutMs) {
  const normalizedRequestId = String(requestId || '').trim();
  if (!normalizedRequestId || !['saveClient', 'deleteClient'].includes(expectedAction)) return null;

  const verificationUrl = new URL(appsScriptUrl);
  verificationUrl.searchParams.set('action', 'getClientMutationResult');
  verificationUrl.searchParams.set('request_id', normalizedRequestId);
  verificationUrl.searchParams.set('token', appsScriptToken);
  const timeoutMs = Math.min(upstreamTimeoutMs, DELETE_CONFIRMATION_TIMEOUT_MS);

  for (const delayMs of DELETE_CONFIRMATION_DELAYS_MS) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const snapshot = await fetchUpstreamSnapshot(
        fetchImpl,
        verificationUrl,
        { method: 'GET', redirect: 'follow' },
        timeoutMs
      );
      if (isUnsupportedActionSnapshot(snapshot)) return null;
      const payload = parseJsonSnapshot(snapshot);
      const mutation = payload?.mutation;
      if (
        snapshot.status < 200
        || snapshot.status >= 300
        || payload?.ok !== true
        || mutation?.request_id !== normalizedRequestId
        || mutation?.action !== expectedAction
      ) continue;

      if (mutation.state === 'failed') {
        return {
          statusCode: mutation.code === 'CONFLICT' ? 409 : 400,
          payload: {
            ok: false,
            code: mutation.code || '',
            error: mutation.error || 'Operace klienta selhala.',
            mutation,
            verified_after_response_failure: true
          }
        };
      }
      if (mutation.state !== 'completed') continue;

      if (expectedAction === 'saveClient' && mutation.client?.klient_id) {
        return {
          statusCode: 200,
          payload: {
            ok: true,
            client: mutation.client,
            mutation,
            verified_after_response_failure: true
          }
        };
      }
      if (expectedAction === 'deleteClient' && mutation.deletion?.deleted === true) {
        return {
          statusCode: 200,
          payload: {
            ok: true,
            deletion: mutation.deletion,
            mutation,
            verified_after_response_failure: true
          }
        };
      }
    } catch (error) {
      console.warn('Client mutation confirmation retry failed:', expectedAction, error);
    }
  }
  return null;
}

async function verifyDeletedClient(fetchImpl, appsScriptUrl, appsScriptToken, clientId, upstreamTimeoutMs) {
  const normalizedClientId = String(clientId || '').trim();
  if (!normalizedClientId) return null;

  const verificationUrl = new URL(appsScriptUrl);
  verificationUrl.searchParams.set('action', 'verifyClientDeletion');
  verificationUrl.searchParams.set('klient_id', normalizedClientId);
  verificationUrl.searchParams.set('token', appsScriptToken);
  const timeoutMs = Math.min(upstreamTimeoutMs, DELETE_CONFIRMATION_TIMEOUT_MS);

  for (const delayMs of DELETE_CONFIRMATION_DELAYS_MS) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const snapshot = await fetchUpstreamSnapshot(
        fetchImpl,
        verificationUrl,
        { method: 'GET', redirect: 'follow' },
        timeoutMs
      );
      const payload = parseJsonSnapshot(snapshot);
      if (
        snapshot.status >= 200
        && snapshot.status < 300
        && payload?.ok === true
        && payload?.deletion?.found === true
        && payload?.deletion?.deleted === true
      ) {
        return {
          ok: true,
          deletion: {
            ...payload.deletion,
            deleted: true,
            archive_warning: ''
          },
          verified_after_response_failure: true
        };
      }
    } catch (error) {
      console.warn('Client deletion confirmation retry failed:', error);
    }
  }
  return null;
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
  const fetchStableAction = async (targetUrl, targetAction) => {
    let snapshot = await fetchUpstreamSnapshot(fetchImpl, targetUrl, fetchOptions, timeoutMs);
    if (targetAction !== 'listClients' || snapshot.status !== 404) return snapshot;

    for (let index = 0; index < CLIENT_REGISTRY_NOT_FOUND_RETRY_DELAYS_MS.length; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, CLIENT_REGISTRY_NOT_FOUND_RETRY_DELAYS_MS[index]));
      const retryUrl = new URL(targetUrl);
      retryUrl.searchParams.set('proxy_registry_retry', `${Date.now()}-${index + 1}`);
      snapshot = await fetchUpstreamSnapshot(fetchImpl, retryUrl, fetchOptions, timeoutMs);
      if (snapshot.status !== 404) break;
    }
    return snapshot;
  };

  const snapshot = await fetchStableAction(upstreamUrl, action);
  const legacyAction = LEGACY_READ_ACTIONS.get(action);
  if (!legacyAction || !isUnsupportedActionSnapshot(snapshot)) return snapshot;

  const legacyUrl = new URL(upstreamUrl);
  legacyUrl.searchParams.set('action', legacyAction);
  const legacySnapshot = await fetchStableAction(legacyUrl, legacyAction);
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

  let incomingUrl = null;
  let postPayload = null;
  let action = '';
  try {
    incomingUrl = new URL(request.url || '/', 'http://localhost');
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
      postPayload = payload;
      fetchOptions.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      fetchOptions.body = JSON.stringify({ ...payload, token: appsScriptToken });
    }

    action = incomingUrl.searchParams.get('action') || '';
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
    if (
      request.method === 'POST'
      && ['saveClient', 'deleteClient'].includes(postPayload?.action)
      && postPayload?.request_id
      && isAmbiguousMutationSnapshot(snapshot)
    ) {
      const confirmedMutation = await verifyClientMutationResult(
        fetchImpl,
        appsScriptUrl,
        appsScriptToken,
        postPayload.request_id,
        postPayload.action,
        upstreamTimeoutMs
      );
      if (confirmedMutation) {
        sendJson(response, confirmedMutation.statusCode, confirmedMutation.payload, {
          'X-Mutation-Verified': postPayload.action
        });
        return;
      }
    }
    if (
      request.method === 'POST'
      && postPayload?.action === 'deleteClient'
      && isAmbiguousMutationSnapshot(snapshot)
    ) {
      const confirmedDeletion = await verifyDeletedClient(
        fetchImpl,
        appsScriptUrl,
        appsScriptToken,
        postPayload?.client?.klient_id || postPayload?.client?.id,
        upstreamTimeoutMs
      );
      if (confirmedDeletion) {
        sendJson(response, 200, confirmedDeletion, { 'X-Mutation-Verified': 'deleteClient' });
        return;
      }
    }
    if (request.method === 'GET' && action === 'getRecordDocumentStatus') {
      const payload = parseJsonSnapshot(snapshot);
      if (payload?.document?.state === 'ready' && payload.document.clientFolderUrl) {
        mutationGeneration += 1;
        readResponseCache.clear();
      }
    }
    sendUpstreamSnapshot(response, snapshot);
  } catch (error) {
    console.error('Google Apps Script proxy error:', postPayload?.action || action || 'unknown', error);
    if (
      request.method === 'POST'
      && ['saveClient', 'deleteClient'].includes(postPayload?.action)
      && postPayload?.request_id
    ) {
      try {
        const confirmedMutation = await verifyClientMutationResult(
          fetchImpl,
          appsScriptUrl,
          appsScriptToken,
          postPayload.request_id,
          postPayload.action,
          upstreamTimeoutMs
        );
        if (confirmedMutation) {
          sendJson(response, confirmedMutation.statusCode, confirmedMutation.payload, {
            'X-Mutation-Verified': postPayload.action
          });
          return;
        }
      } catch (verificationError) {
        console.warn('Client mutation confirmation failed after proxy error:', postPayload.action, verificationError);
      }
    }
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
