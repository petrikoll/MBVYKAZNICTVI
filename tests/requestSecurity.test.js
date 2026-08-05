import assert from 'node:assert/strict';
import test from 'node:test';
import { isTrustedMutationOrigin } from '../requestSecurity.js';

function request(headers = {}, encrypted = false) {
  return { headers, socket: { encrypted } };
}

test('same-origin mutation is accepted behind the Render proxy', () => {
  assert.equal(isTrustedMutationOrigin(request({
    origin: 'https://mb-vykaznictvi-6f9f.onrender.com',
    host: 'internal-service:4173',
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'mb-vykaznictvi-6f9f.onrender.com',
    'sec-fetch-site': 'same-origin'
  })), true);
});

test('cross-site mutation is rejected even with a syntactically valid origin', () => {
  assert.equal(isTrustedMutationOrigin(request({
    origin: 'https://attacker.example',
    host: 'mb-vykaznictvi-6f9f.onrender.com',
    'x-forwarded-proto': 'https',
    'sec-fetch-site': 'cross-site'
  })), false);
});

test('mismatched origin is rejected when the browser supplies Origin', () => {
  assert.equal(isTrustedMutationOrigin(request({
    origin: 'https://attacker.example',
    host: 'mb-vykaznictvi-6f9f.onrender.com',
    'x-forwarded-proto': 'https'
  })), false);
});

test('non-browser server calls without Origin remain backward compatible', () => {
  assert.equal(isTrustedMutationOrigin(request({
    host: 'mb-vykaznictvi-6f9f.onrender.com',
    'x-forwarded-proto': 'https'
  })), true);
});
