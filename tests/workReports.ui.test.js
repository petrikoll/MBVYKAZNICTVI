import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';

const vite = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  plugins: [{
    name: 'work-report-test-template',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('.xlsx?base64')) return null;
      const base64 = await readFile(id.slice(0, -'?base64'.length), 'base64');
      return `export default ${JSON.stringify(base64)};`;
    },
  }, reactPlugin()],
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  logLevel: 'silent',
});
const { default: WorkReportsView } = await vite.ssrLoadModule('/src/features/work-reports/WorkReportsView.jsx');
test.after(() => vite.close());

test('přepnutí i opětovný výběr měsíce ponechá načtené porady uvnitř fondu 25 hodin', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(document.getElementById('root'));
  const records = [{
    entityType: 'network_activities',
    activityDate: '2026-09-03',
    payload: { type: 'Porada', startTime: '09:00', endTime: '11:00', rtMembers: ['Mgr. Radka Vysloužilová'] },
  }];
  const selectPeriod = async (value) => {
    await act(async () => {
      const select = document.getElementById('work-report-period');
      select.value = value;
      select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });
  };
  const assertHours = () => {
    const inputs = [...document.querySelectorAll('input[type="number"]')];
    const activityHours = inputs.filter((input) => input.id !== 'work-report-vacation')
      .reduce((sum, input) => sum + Number(input.value), 0);
    assert.equal(activityHours, 25);
    assert.match(document.body.textContent, /DPP · 25 h \/ měsíc/);
    assert.equal([...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Stáhnout XLSX')).disabled, false);
  };
  try {
    await act(async () => root.render(React.createElement(WorkReportsView, { records })));
    for (const month of ['2026-09', '2026-09', '2027-10', '2027-12', '2028-06', '2026-09']) {
      await selectPeriod(month);
      assertHours();
    }
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, previousGlobals);
  }
});
