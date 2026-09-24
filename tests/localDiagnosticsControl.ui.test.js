import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createLocalDiagnostics } from '../src/lib/localDiagnostics.js';

const vite = await createServer({
  configFile: false, root: fileURLToPath(new URL('../', import.meta.url)),
  plugins: [reactPlugin()], appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent'
});
const { default: Control } = await vite.ssrLoadModule('/src/components/LocalDiagnosticsControl.jsx');
test.after(async () => { await vite.close(); });

test('výrazné tlačítko stáhne JSON s historií a přepínač zastaví nové události', async () => {
  const dom = new JSDOM('<script type="module" src="/assets/app-test.js"></script><div id="root"></div>', { url: 'http://localhost/' });
  const previous = { window: globalThis.window, document: globalThis.document, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let downloadedBlob;
  let filename;
  URL.createObjectURL = (blob) => { downloadedBlob = blob; return 'blob:local-diagnostics'; };
  URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function () { filename = this.download; };
  const saved = new Map();
  const recorder = createLocalDiagnostics({
    storage: dom.window.localStorage, eventTarget: dom.window,
    store: { append: async (events) => events.forEach((event) => saved.set(event.id, event)), read: async () => [...saved.values()] },
    schedule: () => 1, cancel: () => {}
  });
  const root = createRoot(document.getElementById('root'));
  try {
    recorder.start();
    recorder.enqueue({ message: 'Testovací hláška pro analýzu.', source: 'inline', tone: 'error' });
    await act(async () => root.render(React.createElement(Control, { recorder })));
    const button = document.querySelector('button');
    assert.equal(button.textContent.trim(), 'Ztáhnout při chybě dat');
    assert.ok(button.className.includes('bg-red-600'));
    await act(async () => button.click());
    assert.match(filename, /^diagnostika-moravsky-beroun-.*\.json$/);
    const data = JSON.parse(await downloadedBlob.text());
    assert.equal(data.events.some((event) => event.message === 'Testovací hláška pro analýzu.'), true);
    assert.equal(data.browser.appAsset, 'app-test.js');
    assert.match(document.querySelector('[role="status"]').textContent, /Staženo 2 událostí/);
    const toggle = document.querySelector('input[type="checkbox"]');
    assert.equal(toggle.checked, true);
    await act(async () => toggle.click());
    assert.equal(toggle.checked, false);
    assert.equal(recorder.enqueue({ message: 'neukládat' }), null);
    assert.equal(dom.window.localStorage.getItem('mb-local-diagnostics-enabled-v1'), '0');
  } finally {
    recorder.stop();
    await act(async () => root.unmount());
    dom.window.close();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    Object.assign(globalThis, previous);
  }
});
