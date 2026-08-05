import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { handleGoogleAppsScriptProxy } from '../googleAppsScriptProxy.js';
import { readFile } from 'node:fs/promises';

function createRequest(method, url, body = '', headers = {}) {
  const request = Readable.from(body ? [body] : []);
  request.method = method;
  request.url = url;
  request.headers = headers;
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

test('proxy retries a transient 404 while loading the authoritative client registry', async () => {
  const requestedUrls = [];
  const response = createResponse();

  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listClients'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/transient-clients/exec',
      appsScriptToken: 'server-secret',
      fetchImpl: async (url) => {
        requestedUrls.push(String(url));
        if (requestedUrls.length === 1) return new Response('Page Not Found', { status: 404 });
        return new Response(JSON.stringify({ ok: true, clients: [{ klient_id: 'KLIENT-0001' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  );

  assert.equal(requestedUrls.length, 2);
  assert.equal(new URL(requestedUrls[1]).searchParams.get('action'), 'listClients');
  assert.ok(new URL(requestedUrls[1]).searchParams.get('proxy_dataset_retry'));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).clients[0].klient_id, 'KLIENT-0001');
});

test('proxy retries a transient failure while loading individual plans', async () => {
  let calls = 0;
  const response = createResponse();

  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listIndividualPlans'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/transient-plans/exec',
      appsScriptToken: 'server-secret',
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return new Response('Service Unavailable', { status: 503 });
        return new Response(JSON.stringify({ ok: true, individualPlans: [{ plan_id: 'PLAN-0001' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  );

  assert.equal(calls, 2);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).individualPlans[0].plan_id, 'PLAN-0001');
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

test('novy rychly bootstrap pouzije starsi bootstrapCore bez laviny dilcich pozadavku', async () => {
  const requestedActions = [];
  const response = createResponse();
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=bootstrapFast'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/legacy-bootstrap/exec',
      appsScriptToken: 'server-secret',
      readCacheTtlMs: 1000,
      fetchImpl: async (url) => {
        const action = new URL(url).searchParams.get('action');
        requestedActions.push(action);
        if (action === 'bootstrapFast') {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(JSON.stringify({
          ok: true,
          performances: [{ vykon_id: 'VYKON-0001' }],
          meetings: [],
          partners: [],
          individualPlans: [{ plan_id: 'PLAN-0001' }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  );

  assert.deepEqual(requestedActions, ['bootstrapFast', 'bootstrapCore']);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).performances[0].vykon_id, 'VYKON-0001');
});

test('adresar klientu ze starsiho Apps Scriptu neposle do prohlizece plne zaznamy', async () => {
  const requestedActions = [];
  const response = createResponse();
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listClientDirectory'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/legacy-clients/exec',
      appsScriptToken: 'server-secret',
      readCacheTtlMs: 1000,
      fetchImpl: async (url) => {
        const action = new URL(url).searchParams.get('action');
        requestedActions.push(action);
        if (action === 'listClientDirectory') {
          return new Response(JSON.stringify({ ok: false, error: 'Unknown action' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({
          ok: true,
          clients: [{
            klient_id: 'KLIENT-0001',
            jmeno: 'Alena',
            prijmeni: 'Gaborova',
            stav_klienta: 'aktivni',
            klicovy_pracovnik: 'Pracovnik',
            updated_at: '2026-08-04T10:00:00Z',
            telefon: '123456789',
            poznamka: 'citlivy text'
          }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  );

  const payload = JSON.parse(response.body);
  assert.deepEqual(requestedActions, ['listClientDirectory', 'listClients']);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(payload.clients[0]).sort(), [
    'jmeno', 'klicovy_pracovnik', 'klient_id', 'prijmeni', 'stav_klienta', 'updated_at'
  ]);
  assert.doesNotMatch(response.body, /123456789|citlivy text/);
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

test('ready document with a new folder invalidates the proxied client cache', async () => {
  let clientReads = 0;
  const fetchImpl = async (url) => {
    const action = new URL(url).searchParams.get('action');
    if (action === 'listClients') {
      clientReads += 1;
      return new Response(JSON.stringify({ ok: true, clients: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      document: {
        state: 'ready',
        clientId: 'KLIENT-0001',
        clientFolderUrl: 'https://drive.google.com/drive/folders/folder-1'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const overrides = {
    appsScriptUrl: 'https://example.test/macros/s/document-folder-cache/exec',
    appsScriptToken: 'server-secret',
    fetchImpl,
    readCacheTtlMs: 60000
  };

  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listClients'),
    createResponse(),
    overrides
  );
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=getRecordDocumentStatus&record_type=performance&record_id=VYKON-0001'),
    createResponse(),
    overrides
  );
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listClients'),
    createResponse(),
    overrides
  );

  assert.equal(clientReads, 2);
});

test('invalid delete response is confirmed against the authoritative client row', async () => {
  const requestedActions = [];
  const request = createRequest('POST', '/api/google-sheets', JSON.stringify({
    action: 'deleteClient',
    client: { klient_id: 'KLIENT-0054' }
  }));
  const response = createResponse();

  await handleGoogleAppsScriptProxy(request, response, {
    appsScriptUrl: 'https://example.test/macros/s/delete-confirmation/exec',
    appsScriptToken: 'server-secret',
    fetchImpl: async (url, options) => {
      if (options.method === 'POST') {
        requestedActions.push('deleteClient');
        return new Response('<html>ContentService response failed</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      }
      const action = new URL(url).searchParams.get('action');
      requestedActions.push(action);
      return new Response(JSON.stringify({
        ok: true,
        deletion: {
          klient_id: 'KLIENT-0054',
          found: true,
          deleted: true
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const payload = JSON.parse(response.body);
  assert.deepEqual(requestedActions, ['deleteClient', 'verifyClientDeletion']);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['X-Mutation-Verified'], 'deleteClient');
  assert.equal(payload.ok, true);
  assert.equal(payload.deletion.deleted, true);
  assert.equal(payload.verified_after_response_failure, true);
});

test('invalid create response is confirmed by its exact mutation request id', async () => {
  const requestedActions = [];
  const requestId = 'create-client-1234567890abcdef';
  const response = createResponse();

  await handleGoogleAppsScriptProxy(
    createRequest('POST', '/api/google-sheets', JSON.stringify({
      action: 'saveClient',
      request_id: requestId,
      client: { jmeno: 'Test', prijmeni: 'Klient' }
    })),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/create-confirmation/exec',
      appsScriptToken: 'server-secret',
      fetchImpl: async (url, options) => {
        if (options.method === 'POST') {
          requestedActions.push('saveClient');
          return new Response('<html>ContentService response failed</html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          });
        }
        const action = new URL(url).searchParams.get('action');
        requestedActions.push(action);
        return new Response(JSON.stringify({
          ok: true,
          mutation: {
            request_id: requestId,
            action: 'saveClient',
            state: 'completed',
            klient_id: 'KLIENT-0055',
            client: { klient_id: 'KLIENT-0055', jmeno: 'Test', prijmeni: 'Klient' }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  );

  const payload = JSON.parse(response.body);
  assert.deepEqual(requestedActions, ['saveClient', 'getMutationResult']);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['X-Mutation-Verified'], 'saveClient');
  assert.equal(payload.client.klient_id, 'KLIENT-0055');
  assert.equal(payload.verified_after_response_failure, true);
});

test('timed out delete is confirmed by request id before returning an error', async () => {
  const requestId = 'delete-client-1234567890abcdef';
  const response = createResponse();
  let mutationChecks = 0;

  await handleGoogleAppsScriptProxy(
    createRequest('POST', '/api/google-sheets', JSON.stringify({
      action: 'deleteClient',
      request_id: requestId,
      client: { klient_id: 'KLIENT-0056' }
    })),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/delete-timeout-confirmation/exec',
      appsScriptToken: 'server-secret',
      fetchImpl: async (url, options) => {
        if (options.method === 'POST') throw new DOMException('timeout', 'AbortError');
        mutationChecks += 1;
        return new Response(JSON.stringify({
          ok: true,
          mutation: {
            request_id: requestId,
            action: 'deleteClient',
            state: 'completed',
            deletion: { klient_id: 'KLIENT-0056', deleted: true }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  );

  const payload = JSON.parse(response.body);
  assert.equal(mutationChecks, 1);
  assert.equal(response.statusCode, 200);
  assert.equal(payload.deletion.deleted, true);
  assert.equal(payload.verified_after_response_failure, true);
});

test('proxy retries a failed dataset at most once', async () => {
  let calls = 0;
  const response = createResponse();
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listPerformances'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/retry-budget/exec',
      appsScriptToken: 'server-secret',
      readCacheTtlMs: 0,
      fetchImpl: async () => {
        calls += 1;
        return new Response('Service Unavailable', { status: 503 });
      }
    }
  );

  assert.equal(calls, 2);
  assert.equal(response.headers['X-Upstream-Attempts'], '2');
});

test('proxy does not retry a slow failed dataset read', async () => {
  let calls = 0;
  const response = createResponse();
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listIndividualPlans'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/slow-failure/exec',
      appsScriptToken: 'server-secret',
      readCacheTtlMs: 0,
      fastReadRetryThresholdMs: 5,
      fetchImpl: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return new Response('Gateway Timeout', { status: 504 });
      }
    }
  );

  assert.equal(calls, 1);
  assert.equal(response.headers['X-Upstream-Attempts'], '1');
});

test('total read budget prevents another retry chain', async () => {
  let calls = 0;
  const response = createResponse();
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listClients'),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/total-budget/exec',
      appsScriptToken: 'server-secret',
      readCacheTtlMs: 0,
      readTotalBudgetMs: 100,
      fetchImpl: async () => {
        calls += 1;
        return new Response('Service Unavailable', { status: 503 });
      }
    }
  );

  assert.equal(calls, 1);
  assert.equal(response.statusCode, 503);
});

test('fresh verification bypasses cache without forwarding transport nonce to GAS', async () => {
  let upstreamCalls = 0;
  const upstreamUrls = [];
  const overrides = {
    appsScriptUrl: 'https://example.test/macros/s/cache-bypass/exec',
    appsScriptToken: 'server-secret',
    readCacheTtlMs: 60000,
    fetchImpl: async (url) => {
      upstreamCalls += 1;
      upstreamUrls.push(String(url));
      return new Response(JSON.stringify({ ok: true, clients: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
  const responseA = createResponse();
  const responseB = createResponse();

  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listClients&fresh=1&verification_nonce=first'),
    responseA,
    overrides
  );
  await handleGoogleAppsScriptProxy(
    createRequest('GET', '/api/google-sheets?action=listClients&fresh=1&verification_nonce=second'),
    responseB,
    overrides
  );

  assert.equal(upstreamCalls, 2);
  assert.equal(responseA.headers['X-Proxy-Cache'], 'BYPASS');
  assert.equal(responseB.headers['X-Proxy-Cache'], 'BYPASS');
  assert.equal(new URL(upstreamUrls[0]).searchParams.has('fresh'), false);
  assert.equal(new URL(upstreamUrls[0]).searchParams.has('verification_nonce'), false);
});

test('proxy returns request correlation and timing headers', async () => {
  const response = createResponse();
  await handleGoogleAppsScriptProxy(
    createRequest(
      'GET',
      '/api/google-sheets?action=listPartners',
      '',
      { 'x-request-id': 'browser-request-123' }
    ),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/diagnostics/exec',
      appsScriptToken: 'server-secret',
      readCacheTtlMs: 0,
      fetchImpl: async () => new Response(JSON.stringify({ ok: true, partners: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  );

  assert.equal(response.headers['X-Request-ID'], 'browser-request-123');
  assert.match(response.headers['Server-Timing'], /proxy;dur=\d+, upstream;dur=\d+/);
  assert.equal(response.headers['X-Upstream-Attempts'], '1');
});

test('invalid performance response is confirmed by the generic mutation ledger', async () => {
  const requestedActions = [];
  const requestId = 'save-performance-1234567890abcdef';
  const response = createResponse();

  await handleGoogleAppsScriptProxy(
    createRequest('POST', '/api/google-sheets', JSON.stringify({
      action: 'savePerformance',
      request_id: requestId,
      performance: { klient_id: 'KLIENT-0001', popis: 'Test' }
    })),
    response,
    {
      appsScriptUrl: 'https://example.test/macros/s/generic-confirmation/exec',
      appsScriptToken: 'server-secret',
      fetchImpl: async (url, options) => {
        if (options.method === 'POST') {
          requestedActions.push('savePerformance');
          return new Response('<html>ContentService response failed</html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          });
        }
        requestedActions.push(new URL(url).searchParams.get('action'));
        return new Response(JSON.stringify({
          ok: true,
          mutation: {
            request_id: requestId,
            action: 'savePerformance',
            state: 'completed',
            performance: { vykon_id: 'VYKON-0099', klient_id: 'KLIENT-0001' }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  );

  const payload = JSON.parse(response.body);
  assert.deepEqual(requestedActions, ['savePerformance', 'getMutationResult']);
  assert.equal(response.statusCode, 200);
  assert.equal(payload.performance.vykon_id, 'VYKON-0099');
  assert.equal(payload.verified_after_response_failure, true);
});
