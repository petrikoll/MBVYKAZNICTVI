import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');
const styleSource = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('client registry keeps controls outside a dedicated scrollable client list', () => {
  const controlsStart = appSource.indexOf('id="show-all-clients"');
  const listStart = appSource.indexOf('className="client-registry-scroll space-y-2 pr-1.5"');

  assert.ok(controlsStart >= 0 && listStart > controlsStart);
  assert.match(appSource.slice(0, listStart), /placeholder="Začněte psát příjmení\.\.\."/);
  assert.match(appSource.slice(listStart), /filteredClientList\.map\(\(client\) =>/);
  assert.match(styleSource, /\.client-registry-scroll\s*\{[\s\S]*?max-height:\s*clamp\(18rem, calc\(100dvh - 25rem\), 50rem\)/);
  assert.match(styleSource, /scrollbar-gutter:\s*stable/);
});

test('client registry restores its numeric scroll position for the current session', () => {
  assert.match(appSource, /CLIENT_REGISTRY_SCROLL_STORAGE_KEY/);
  assert.match(appSource, /sessionStorage\.getItem\(CLIENT_REGISTRY_SCROLL_STORAGE_KEY\)/);
  assert.match(appSource, /sessionStorage\.setItem\(CLIENT_REGISTRY_SCROLL_STORAGE_KEY/);
  assert.match(appSource, /ref=\{clientRegistryScrollRef\}/);
  assert.match(appSource, /\}, \[mainView, clients\.length\]\);/);
  assert.match(appSource, /active[\s\S]*?border-indigo-500 bg-indigo-100 shadow-md ring-2 ring-indigo-300/);
});
