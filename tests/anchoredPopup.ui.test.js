import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const vite = await createServer({ configFile: false, plugins: [react()], appType: 'custom', optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, logLevel: 'silent' });
const { AnchoredPopup, useAnchoredPopup } = await vite.ssrLoadModule('/src/components/AnchoredPopup.jsx');
test.after(() => vite.close());

function Fixture({ id }) {
  const popup = useAnchoredPopup();
  return React.createElement('div', { ...popup.triggerProps, id, tabIndex: 0 }, 'Detail',
    React.createElement(AnchoredPopup, { popup, id: `popup-${id}` }, 'Syntetický obsah'));
}

test('a popup escapes clipped ancestors, switches between triggers and closes with Escape or an outside click', async () => {
  const dom = new JSDOM('<main style="overflow:hidden"><div id="root"></div></main><button id="outside">Mimo</button>', { url: 'http://localhost' });
  const previous = { window: global.window, document: global.document, HTMLElement: global.HTMLElement, IS_REACT_ACT_ENVIRONMENT: global.IS_REACT_ACT_ENVIRONMENT };
  Object.assign(global, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  const root = createRoot(document.getElementById('root'));
  try {
    Object.defineProperty(window, 'innerWidth', { value: 390, writable: true });
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Fixture, { id: 'first' }), React.createElement(Fixture, { id: 'second' }))));
    for (const id of ['first', 'second']) document.getElementById(id).getBoundingClientRect = () => ({ left: 340, top: 300, bottom: 330 });
    await act(async () => document.getElementById('first').focus());
    assert.equal(document.getElementById('popup-first').parentElement, document.body);
    assert.equal(document.getElementById('popup-first').style.width, '366px');
    assert.equal(document.getElementById('popup-first').style.left, '12px');
    // Repeated scroll/resize measurements must retain the reduced available height.
    Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });
    document.getElementById('first').getBoundingClientRect = () => ({ left: 340, top: 200, bottom: 230 });
    const firstPopup = document.getElementById('popup-first');
    firstPopup.getBoundingClientRect = () => ({ height: Math.min(347, Number.parseFloat(firstPopup.style.maxHeight)) });
    for (let index = 0; index < 2; index += 1) {
      await act(async () => window.dispatchEvent(new window.Event('resize')));
      assert.equal(firstPopup.style.maxHeight, '180px');
      assert.equal(firstPopup.style.top, '12px');
    }
    await act(async () => document.getElementById('second').focus());
    assert.equal(document.querySelectorAll('[role="tooltip"]').length, 1);
    assert.ok(document.getElementById('popup-second'));
    await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    await act(async () => document.getElementById('first').click());
    assert.ok(document.getElementById('popup-first'));
    await act(async () => document.getElementById('outside').dispatchEvent(new window.Event('pointerdown', { bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"]'), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(global, previous);
  }
});
