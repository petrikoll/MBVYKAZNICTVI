import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { handleGeminiProxy, redactSensitiveText } from '../geminiProxy.js';

function createRequest(body = '') {
  const request = Readable.from(body ? [body] : []);
  request.method = 'POST';
  request.url = '/api/gemini';
  return request;
}

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = '') {
      this.body = String(body || '');
    }
  };
}

test('Gemini proxy odmítne požadavek bez serverového API klíče', async () => {
  const response = createResponse();

  await handleGeminiProxy(createRequest('{}'), response, { apiKey: '' });

  assert.equal(response.statusCode, 503);
  assert.equal(JSON.parse(response.body).ok, false);
});

test('Gemini proxy anonymizuje prompt a neposílá API klíč v URL', async () => {
  let upstreamUrl = '';
  let upstreamOptions = null;
  const response = createResponse();
  const request = createRequest(JSON.stringify({
    model: 'gemini-2.5-flash-lite',
    sensitiveTerms: ['Jan Novák', 'Novákova 12'],
    payload: {
      contents: [{
        role: 'user',
        parts: [{ text: 'Klient: Jan Novák\nKontakt: jan.novak@example.cz, +420 777 111 222, Novákova 12.' }]
      }]
    }
  }));

  await handleGeminiProxy(request, response, {
    apiKey: 'server-secret',
    defaultModel: 'gemini-2.5-flash',
    fetchImpl: async (url, options) => {
      upstreamUrl = String(url);
      upstreamOptions = options;
      return new Response(JSON.stringify({ candidates: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const forwardedBody = JSON.parse(upstreamOptions.body);
  const forwardedText = JSON.stringify(forwardedBody);
  assert.match(upstreamUrl, /gemini-2\.5-flash:generateContent$/);
  assert.doesNotMatch(upstreamUrl, /server-secret|[?&]key=/);
  assert.equal(upstreamOptions.headers['x-goog-api-key'], 'server-secret');
  assert.doesNotMatch(forwardedText, /Jan Novák|Novákova 12|jan\.novak@example\.cz|777 111 222/);
  assert.doesNotMatch(forwardedText, /sensitiveTerms/);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('obecná serverová redakce odstraní označené identifikátory', () => {
  const redacted = redactSensitiveText('Datum narození: 1. 2. 1980\nE-mail: osoba@example.cz\nRodné číslo 800201/1234');

  assert.doesNotMatch(redacted, /1\. 2\. 1980|osoba@example\.cz|800201\/1234/);
});
