const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private'
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

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeSensitiveTerms(terms) {
  return Array.from(new Set((Array.isArray(terms) ? terms : [])
    .map((value) => String(value || '').trim())
    .filter((value) => value.length >= 3)))
    .slice(0, 250)
    .sort((left, right) => right.length - left.length);
}

function redactSensitiveText(value, sensitiveTerms = []) {
  let text = String(value || '');
  normalizeSensitiveTerms(sensitiveTerms).forEach((term) => {
    text = text.replace(new RegExp(escapeRegExp(term), 'giu'), '[identifikační údaj odstraněn]');
  });
  text = text
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[e-mail odstraněn]')
    .replace(/(?:\+420[\s.-]*)?(?:\d[\s.-]*){9}(?!\d)/g, '[telefon odstraněn]')
    .replace(/\b\d{6}\/?\d{3,4}\b/g, '[identifikační údaj odstraněn]')
    .replace(/(^|\n)(\s*(?:klient|jméno klienta|jméno|kontaktní osoba|datum narození|telefon|e-?mail|adresa)\s*:\s*)[^\n]*/giu, '$1$2[identifikační údaj odstraněn]');
  return text;
}

function sanitizeGeminiPayload(value, sensitiveTerms = []) {
  if (Array.isArray(value)) return value.map((item) => sanitizeGeminiPayload(item, sensitiveTerms));
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? redactSensitiveText(value, sensitiveTerms) : value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, sanitizeGeminiPayload(item, sensitiveTerms)])
  );
}

function normalizeModel(value, fallback = DEFAULT_GEMINI_MODEL) {
  const model = String(value || fallback).trim();
  return /^[a-zA-Z0-9._-]{1,80}$/.test(model) ? model : fallback;
}

async function requestGemini(model, payload, apiKey, fetchImpl) {
  return fetchImpl(`${GEMINI_API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });
}

async function handleGeminiProxy(request, response, overrides = {}) {
  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'POST' });
    response.end();
    return;
  }

  const apiKey = Object.hasOwn(overrides, 'apiKey')
    ? overrides.apiKey
    : process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    sendJson(response, 503, { ok: false, error: 'Gemini API není na serveru nakonfigurované.' });
    return;
  }

  try {
    const rawBody = await readRequestBody(request);
    const requestPayload = rawBody ? JSON.parse(rawBody) : {};
    const configuredModel = overrides.defaultModel || process.env.GEMINI_MODEL || '';
    const model = normalizeModel(configuredModel || requestPayload.model, DEFAULT_GEMINI_MODEL);
    const fallbackModel = normalizeModel(
      overrides.fallbackModel || process.env.GEMINI_FALLBACK_MODEL || '',
      ''
    );
    const sanitizedPayload = sanitizeGeminiPayload(requestPayload.payload || {}, requestPayload.sensitiveTerms || []);
    const fetchImpl = overrides.fetchImpl || fetch;
    let upstreamResponse = await requestGemini(model, sanitizedPayload, apiKey, fetchImpl);
    if (!upstreamResponse.ok && fallbackModel && fallbackModel !== model) {
      upstreamResponse = await requestGemini(fallbackModel, sanitizedPayload, apiKey, fetchImpl);
    }
    const responseBody = await upstreamResponse.text();
    response.writeHead(upstreamResponse.status, {
      'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private'
    });
    response.end(responseBody);
  } catch (error) {
    const message = error instanceof SyntaxError ? 'Neplatná data AI požadavku.' : 'Spojení s Gemini API selhalo.';
    sendJson(response, error instanceof SyntaxError ? 400 : 502, { ok: false, error: message });
  }
}

export { handleGeminiProxy, normalizeSensitiveTerms, redactSensitiveText, sanitizeGeminiPayload };
