import { randomUUID } from 'node:crypto';

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 60000;
const DEFAULT_READ_TOTAL_BUDGET_MS = 58000;
const DEFAULT_FAST_READ_RETRY_THRESHOLD_MS = 10000;
const DEFAULT_READ_CACHE_TTL_MS = 60000;
const MAX_READ_CACHE_ENTRIES = 64;
const DELETE_CONFIRMATION_DELAYS_MS = [0, 500, 1500, 3000];
const DELETE_CONFIRMATION_TIMEOUT_MS = 15000;
const DATASET_READ_RETRY_DELAYS_MS = [250];
const RETRYABLE_DATASET_ACTIONS = new Set([
  'listClients',
  'listPartners',
  'listIndividualPlans',
  'listPerformances',
  'listMeetings',
  'listNetworkMeetings',
  'listEducation',
  'listSupervision',
  'listStatistics'
]);
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
const IDEMPOTENT_MUTATION_ACTIONS = new Set([
  'saveClient', 'deleteClient', 'updateClientKeyWorker',
  'savePartner', 'deletePartner',
  'saveIndividualPlan', 'deleteIndividualPlan',
  'savePerformance', 'deletePerformance',
  'saveMeeting', 'deleteMeeting',
  'saveNetworkMeeting', 'deleteNetworkMeeting',
  'saveEducation', 'deleteEducation',
  'saveSupervision', 'deleteSupervision'
]);
const MUTATION_RESPONSE_KEYS = new Map([
  ['updateClientKeyWorker', 'client'],
  ['savePartner', 'partner'],
  ['saveIndividualPlan', 'individualPlan'],
  ['savePerformance', 'performance'],
  ['saveMeeting', 'meeting'],
  ['saveNetworkMeeting', 'networkMeeting'],
  ['saveEducation', 'education'],
  ['saveSupervision', 'supervision']
]);
const READ_CACHE_BYPASS_PARAMS = new Set([
  'fresh',
  'verification_nonce',
  'write_verification_nonce',
  'folder_verification_nonce',
  'proxy_dataset_retry'
]);

const readResponseCache = new Map();
const inFlightReads = new Map();
let mutationGeneration = 0;
const proxyInstanceRevision = randomUUID();

function getDataRevision() {
  return `${proxyInstanceRevision}:${mutationGeneration}`;
}

function normalizeRequestId(value) {
  const normalized = String(value || '').trim();
  return /^[A-Za-z0-9._:-]{8,128}$/.test(normalized) ? normalized : randomUUID();
}

function responseDiagnostics(response, extraHeaders = {}) {
  const startedAt = Number(response.__proxyStartedAt || Date.now());
  const totalMs = Math.max(0, Date.now() - startedAt);
  return {
    'X-Request-ID': response.__proxyRequestId || randomUUID(),
    'Server-Timing': `proxy;dur=${totalMs}`,
    ...extraHeaders
  };
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Data-Revision': getDataRevision(),
    ...responseDiagnostics(response),
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
  READ_CACHE_BYPASS_PARAMS.forEach((key) => safeUrl.searchParams.delete(key));
  safeUrl.searchParams.sort();
  return safeUrl.toString();
}

function shouldBypassReadCache(incomingUrl) {
  return Array.from(READ_CACHE_BYPASS_PARAMS).some((key) => incomingUrl.searchParams.has(key));
}

function pruneReadResponseCache(now = Date.now()) {
  for (const [key, cached] of readResponseCache) {
    if (!cached || cached.expiresAt <= now) readResponseCache.delete(key);
  }
  while (readResponseCache.size > MAX_READ_CACHE_ENTRIES) {
    const oldestKey = readResponseCache.keys().next().value;
    if (!oldestKey) break;
    readResponseCache.delete(oldestKey);
  }
}

function sendUpstreamSnapshot(response, snapshot, cacheState = 'MISS') {
  const upstreamMs = cacheState === 'HIT' ? 0 : snapshot.durationMs || 0;
  response.writeHead(snapshot.status, {
    'Content-Type': snapshot.contentType || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Data-Revision': getDataRevision(),
    'X-Proxy-Cache': cacheState,
    'X-Upstream-Duration': String(upstreamMs),
    'X-Upstream-Attempts': String(cacheState === 'HIT' ? 0 : snapshot.attempts || 1),
    ...responseDiagnostics(response, {
      'Server-Timing': `proxy;dur=${Math.max(0, Date.now() - Number(response.__proxyStartedAt || Date.now()))}, upstream;dur=${upstreamMs}`
    })
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
      durationMs: Math.max(0, Date.now() - startedAt),
      attempts: 1
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
  if (!normalizedRequestId || !IDEMPOTENT_MUTATION_ACTIONS.has(expectedAction)) return null;

  const verificationUrl = new URL(appsScriptUrl);
  verificationUrl.searchParams.set('action', 'getMutationResult');
  verificationUrl.searchParams.set('request_id', normalizedRequestId);
  verificationUrl.searchParams.set('token', appsScriptToken);
  const timeoutMs = Math.min(upstreamTimeoutMs, DELETE_CONFIRMATION_TIMEOUT_MS);

  for (const delayMs of DELETE_CONFIRMATION_DELAYS_MS) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      let snapshot = await fetchUpstreamSnapshot(
        fetchImpl,
        verificationUrl,
        { method: 'GET', redirect: 'follow' },
        timeoutMs
      );
      if (isUnsupportedActionSnapshot(snapshot)) {
        if (!['saveClient', 'deleteClient'].includes(expectedAction)) return null;
        const clientVerificationUrl = new URL(verificationUrl);
        clientVerificationUrl.searchParams.set('action', 'getClientMutationResult');
        snapshot = await fetchUpstreamSnapshot(
          fetchImpl,
          clientVerificationUrl,
          { method: 'GET', redirect: 'follow' },
          timeoutMs
        );
        if (isUnsupportedActionSnapshot(snapshot)) return null;
      }
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
      const responseKey = MUTATION_RESPONSE_KEYS.get(expectedAction);
      if (responseKey && mutation[responseKey]) {
        return {
          statusCode: 200,
          payload: {
            ok: true,
            [responseKey]: mutation[responseKey],
            mutation,
            verified_after_response_failure: true
          }
        };
      }
      if (expectedAction.startsWith('delete') && mutation.deleted === true) {
        return {
          statusCode: 200,
          payload: { ok: true, mutation, verified_after_response_failure: true }
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

async function fetchCompatibleReadSnapshot(
  fetchImpl,
  upstreamUrl,
  fetchOptions,
  timeoutMs,
  action,
  totalBudgetMs = DEFAULT_READ_TOTAL_BUDGET_MS,
  fastRetryThresholdMs = DEFAULT_FAST_READ_RETRY_THRESHOLD_MS
) {
  const deadlineAt = Date.now() + Math.max(1, totalBudgetMs);
  const fetchStableAction = async (targetUrl, targetAction) => {
    const fetchWithinBudget = async (url) => {
      const remainingMs = deadlineAt - Date.now();
      if (remainingMs <= 0) return null;
      return fetchUpstreamSnapshot(fetchImpl, url, fetchOptions, Math.max(1, Math.min(timeoutMs, remainingMs)));
    };

    let snapshot = await fetchWithinBudget(targetUrl);
    if (!snapshot) return null;
    let attempts = 1;
    const isTransientFailure = () => snapshot.status === 404 || snapshot.status >= 500;
    if (!RETRYABLE_DATASET_ACTIONS.has(targetAction) || !isTransientFailure()) return snapshot;

    for (let index = 0; index < DATASET_READ_RETRY_DELAYS_MS.length; index += 1) {
      if (snapshot.durationMs > fastRetryThresholdMs) break;
      const delayMs = DATASET_READ_RETRY_DELAYS_MS[index] + Math.floor(Math.random() * 151);
      if (Date.now() + delayMs >= deadlineAt) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const retryUrl = new URL(targetUrl);
      retryUrl.searchParams.set('proxy_dataset_retry', `${Date.now()}-${index + 1}`);
      const retrySnapshot = await fetchWithinBudget(retryUrl);
      if (!retrySnapshot) break;
      snapshot = retrySnapshot;
      attempts += 1;
      if (!isTransientFailure()) break;
    }
    return { ...snapshot, attempts };
  };

  const snapshot = await fetchStableAction(upstreamUrl, action);
  if (!snapshot) throw new DOMException('read deadline exceeded', 'AbortError');
  const legacyAction = LEGACY_READ_ACTIONS.get(action);
  if (!legacyAction || !isUnsupportedActionSnapshot(snapshot)) return snapshot;

  const legacyUrl = new URL(upstreamUrl);
  legacyUrl.searchParams.set('action', legacyAction);
  const legacySnapshot = await fetchStableAction(legacyUrl, legacyAction);
  if (!legacySnapshot) return snapshot;
  legacySnapshot.attempts = Number(snapshot.attempts || 1) + Number(legacySnapshot.attempts || 1);
  if (action === 'listClientDirectory') return buildClientDirectorySnapshot(legacySnapshot);
  return legacySnapshot;
}

async function handleGoogleAppsScriptProxy(request, response, overrides = {}) {
  response.__proxyStartedAt = Date.now();
  response.__proxyRequestId = normalizeRequestId(request.headers?.['x-request-id']);
  const { appsScriptUrl, appsScriptToken } = getProxyConfig(overrides);
  const fetchImpl = overrides.fetchImpl || fetch;
  const upstreamTimeoutMs = overrides.upstreamTimeoutMs || DEFAULT_UPSTREAM_TIMEOUT_MS;
  const readTotalBudgetMs = overrides.readTotalBudgetMs ?? DEFAULT_READ_TOTAL_BUDGET_MS;
  const fastReadRetryThresholdMs = overrides.fastReadRetryThresholdMs ?? DEFAULT_FAST_READ_RETRY_THRESHOLD_MS;
  const readCacheTtlMs = overrides.readCacheTtlMs ?? DEFAULT_READ_CACHE_TTL_MS;
  if (!appsScriptUrl || !appsScriptToken) {
    sendJson(response, 503, { ok: false, error: 'Propojení s Google Sheets není bezpečně nakonfigurované.' });
    return;
  }

  if (!['GET', 'POST'].includes(request.method || '')) {
    response.writeHead(405, { Allow: 'GET, POST', ...responseDiagnostics(response) });
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
      if (key !== 'token' && !READ_CACHE_BYPASS_PARAMS.has(key)) upstreamUrl.searchParams.set(key, value);
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
    const isDatasetRead = request.method === 'GET' && CACHEABLE_GET_ACTIONS.has(action);
    if (isDatasetRead) {
      const bypassCache = readCacheTtlMs <= 0 || shouldBypassReadCache(incomingUrl);
      const cacheKey = buildReadCacheKey(upstreamUrl);
      pruneReadResponseCache();
      const cached = bypassCache ? null : readResponseCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        sendUpstreamSnapshot(response, cached.snapshot, 'HIT');
        return;
      }
      if (cached) readResponseCache.delete(cacheKey);

      const inFlightKey = `${bypassCache ? 'bypass' : 'cache'}:${mutationGeneration}:${cacheKey}`;
      let upstreamRequest = inFlightReads.get(inFlightKey);
      let cacheState = 'COALESCED';
      if (!upstreamRequest) {
        cacheState = bypassCache ? 'BYPASS' : 'MISS';
        const generationAtStart = mutationGeneration;
        upstreamRequest = fetchCompatibleReadSnapshot(
          fetchImpl,
          upstreamUrl,
          fetchOptions,
          upstreamTimeoutMs,
          action,
          readTotalBudgetMs,
          fastReadRetryThresholdMs
        )
          .then((snapshot) => {
            if (!bypassCache && generationAtStart === mutationGeneration && isSuccessfulJsonSnapshot(snapshot)) {
              readResponseCache.set(cacheKey, {
                expiresAt: Date.now() + readCacheTtlMs,
                snapshot
              });
              pruneReadResponseCache();
            }
            return snapshot;
          })
          .finally(() => inFlightReads.delete(inFlightKey));
        inFlightReads.set(inFlightKey, upstreamRequest);
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
      && IDEMPOTENT_MUTATION_ACTIONS.has(postPayload?.action)
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
      && IDEMPOTENT_MUTATION_ACTIONS.has(postPayload?.action)
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
        console.warn('Mutation confirmation failed after proxy error:', postPayload.action, verificationError);
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
