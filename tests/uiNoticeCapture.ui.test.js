import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { UI_NOTICE_EVENT } from '../src/lib/uiNoticeLog.js';

const vite = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  plugins: [reactPlugin()],
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'silent'
});
const { SaveInlineNotice } = await vite.ssrLoadModule('/src/components/ui.jsx');
test.after(async () => { await vite.close(); });

test('zobrazená hláška u tlačítka předá přesný text a typ do evidence', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/'
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true
  });
  const events = [];
  dom.window.addEventListener(UI_NOTICE_EVENT, (event) => events.push(event.detail));
  const root = createRoot(dom.window.document.getElementById('root'));
  try {
    await act(async () => {
      root.render(React.createElement(SaveInlineNotice, {
        notice: { tone: 'error', text: 'Záznam nebyl uložen.' }
      }));
    });
    assert.equal(dom.window.document.querySelector('[role="alert"]')?.textContent, 'Záznam nebyl uložen.');
    assert.deepEqual(events, [{ source: 'inline', tone: 'error', message: 'Záznam nebyl uložen.' }]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, previous);
  }
});
