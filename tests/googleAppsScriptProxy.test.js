import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { handleGoogleAppsScriptProxy } from '../googleAppsScriptProxy.js';
import { readFile } from 'node:fs/promises';

function createRequest(method, url, body = '') {
  const request = Readable.from(body ? [body] : []);
  request.method = method;
  request.url = url;
  return request;
}

function createResponse() {
  let resolveEnd;
  const ended = new Promise((resolve) => {
    resolveEnd = resolve;
  });
  return {
    statusCode: 0,
    headers: {},
    body: '',
    ended,
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = '') {
      this.body = String(body || '');
      resolveEnd();
    }
  };
}

test('proxy odmítne požadavek bez serverového tajného klíče', async () => {
  const request = createRequest('GET', '/api/google-sheets?action=listClients');
  const response = createResponse();

  await handleGoogleAppsScriptProxy(request, response, { appsScriptUrl: 'https://example.test/macros/s/test/exec' });

  assert.equal(response.statusCode, 503);
  assert.equal(JSON.parse(response.body).ok, false);
});

test('GET proxy odstraní token klienta a použije serverový token', async () => {
  let requestedUrl = '';
  const request = createRequest('GET', '/api/google-sheets?action=listClients&token=attacker');
  const response = createResponse();

  await handleGoogleAppsScriptProxy(request, response, {
    appsScriptUrl: 'https://example.test/macros/s/test/exec',
    appsScriptToken: 'server-secret',
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const upstreamUrl = new URL(requestedUrl);
  assert.equal(upstreamUrl.searchParams.get('action'), 'listClients');
  assert.equal(upstreamUrl.searchParams.get('token'), 'server-secret');
  assert.equal(response.statusCode, 200);
});

test('POST proxy přepíše token v těle serverovým tokenem', async () => {
  let forwardedBody = null;
  const request = createRequest('POST', '/api/google-sheets', JSON.stringify({ action: 'saveClient', token: 'attacker' }));
  const response = createResponse();

  await handleGoogleAppsScriptProxy(request, response, {
    appsScriptUrl: 'https://example.test/macros/s/test/exec',
    appsScriptToken: 'server-secret',
    fetchImpl: async (_url, options) => {
      forwardedBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  assert.equal(forwardedBody.action, 'saveClient');
  assert.equal(forwardedBody.token, 'server-secret');
  assert.equal(response.statusCode, 200);
});

test('proxy ceka dele nez puvodnich 45 sekund na pomaly Apps Script', async () => {
  const source = await readFile(new URL('../googleAppsScriptProxy.js', import.meta.url), 'utf8');
  assert.match(source, /DEFAULT_UPSTREAM_TIMEOUT_MS = 60000/);
  assert.match(source, /DEFAULT_READ_CACHE_TTL_MS = 60000/);
});

test('rychla revize dat nevola Apps Script', async () => {
  let upstreamCalls = 0;
  const response = createResponse();
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=getDataRevision'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/revision/exec',
      appsScriptToken: 'server-secret',
      fetchImpl: async () => {
        upstreamCalls += 1;
        return new Response('{}');
      }
    }
  );

  assert.equal(upstreamCalls, 0);
  assert.equal(response.statusCode, 200);
  assert.ok(JSON.parse(response.body).revision);
  assert.ok(response.headers['X-Data-Revision']);
});

test('zapis zmeni revizi bez ulozeni osobnich dat do proxy', async () => {
  const overrides = {
    appsScriptUrl: 'https://example.test/macros/s/revision-write/exec',
    appsScriptToken: 'server-secret',
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  };
  const before = createResponse();
  await handleGoogleAppsScriptProxy(createRequest('GET', '/api/google-sheets?action=getDataRevision'), before, overrides);
  const beforeRevision = JSON.parse(before.body).revision;
  await handleGoogleAppsScriptProxy(
    createRequest('POST', '/api/google-sheets', JSON.stringify({ action: 'savePerformance' })),
    createResponse(),
    overrides
  );
  const after = createResponse();
  await handleGoogleAppsScriptProxy(createRequest('GET', '/api/google-sheets?action=getDataRevision'), after, overrides);
  assert.notEqual(JSON.parse(after.body).revision, beforeRevision);
});

test('souběžné stejné GET požadavky sdílejí jedno volání Apps Scriptu a krátkou cache', async () => {
  let upstreamCalls = 0;
  const fetchImpl = async () => {
    upstreamCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return new Response(JSON.stringify({ ok: true, performances: [{ vykon_id: 'VYKON-0001' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const overrides = {
    appsScriptUrl: 'https://example.test/macros/s/cache-test/exec',
    appsScriptToken: 'server-secret',
    fetchImpl,
    readCacheTtlMs: 1000
  };
  const responseA = createResponse();
  const responseB = createResponse();

  await Promise.all([
    handleGoogleAppsScriptProxy(createRequest('GET', '/api/google-sheets?action=listPerformances'), responseA, overrides),
    handleGoogleAppsScriptProxy(createRequest('GET', '/api/google-sheets?action=listPerformances'), responseB, overrides)
  ]);
  const responseC = createResponse();
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listPerformances'),
    responseC,
    overrides
  );

  assert.equal(upstreamCalls, 1);
  assert.equal(responseA.statusCode, 200);
  assert.equal(responseB.statusCode, 200);
  assert.equal(responseC.statusCode, 200);
});

test('zápis zneplatní cache čtecích požadavků', async () => {
  let upstreamCalls = 0;
  const fetchImpl = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ ok: true, partners: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const overrides = {
    appsScriptUrl: 'https://example.test/macros/s/invalidation-test/exec',
    appsScriptToken: 'server-secret',
    fetchImpl,
    readCacheTtlMs: 1000
  };

  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listPartners'),
    createResponse(),
    overrides
  );
  await handleGoogleAppsScriptProxy(
    createRequest('POST', '/api/google-sheets', JSON.stringify({ action: 'savePartner', partner: {} })),
    createResponse(),
    overrides
  );
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listPartners'),
    createResponse(),
    overrides
  );

  assert.equal(upstreamCalls, 3);
});

test('proxy ukončí zaseknutý Apps Script časovým limitem', async () => {
  const response = createResponse();
  const fetchImpl = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')), { once: true });
  });

  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listSupervision'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/timeout-test/exec',
      appsScriptToken: 'server-secret',
      fetchImpl,
      upstreamTimeoutMs: 5,
      readCacheTtlMs: 0
    }
  );

  assert.equal(response.statusCode, 504);
  assert.equal(JSON.parse(response.body).ok, false);
});
