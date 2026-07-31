import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const vite = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  plugins: [reactPlugin()],
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'silent'
});
const { default: Ka01View } = await vite.ssrLoadModule('/src/app/Ka01View.jsx');

test.after(async () => {
  await vite.close();
});

const noop = () => {};

const createProps = (exportSelections) => ({
  ka01Draft: {
    date: '2026-07-31',
    networkType: 'koordinační setkání',
    networkCount: '0',
    networkStartTime: '',
    networkEndTime: '',
    networkPlaceType: '',
    networkPlaceCustom: '',
    networkActorEntries: [],
    networkNotes: '',
    networkDescription: ''
  },
  setKa01Draft: noop,
  ka01ActorDraft: {
    name: '',
    actorType: 'obec / město',
    networkOrigin: '',
    joinedNetworkDate: '',
    contacts: [{ id: 'contact-1', name: '', role: '', phone: '', email: '' }]
  },
  setKa01ActorDraft: noop,
  ka01ActorCustomValue: '__custom__',
  updateKa01ActorEntry: noop,
  ka01PlaceOptions: [],
  ka01PlaceCustomValue: '__custom_place__',
  updateKa01PlaceSelection: noop,
  updateKa01PlaceCustom: noop,
  isSaving: false,
  ka01NetworkDuration: '',
  editingKa01NetworkRecordId: '',
  handleGenerateKa01NetworkDescription: noop,
  handleSaveKa01Network: noop,
  handleSaveKa01ActorRegistry: noop,
  setKa01ActorAttendanceContacts: noop,
  networkSaveNotice: null,
  actorSaveNotice: null,
  ka01AttendanceSelection: { 'partner-1': ['contact-1'] },
  exportKa01AttendanceSheet: (type) => exportSelections.push(type),
  handleEditKa01ActorRegistry: noop,
  exportKa01NetworkBulk: noop,
  ka01NetworkTimeError: '',
  cancelKa01NetworkEdit: noop,
  ka01NetworkRecords: [],
  ka01ActorRegistryRecords: [{
    id: 'partner-1',
    payload: {
      name: 'Město Moravský Beroun',
      actorType: 'obec / město',
      networkOrigin: 'stávající',
      contacts: [{ id: 'contact-1', name: 'Mgr. Jana Malá', role: 'koordinátorka' }]
    }
  }],
  expandedKa01NetworkRecordIds: [],
  toggleKa01NetworkDescription: noop,
  exportKa01NetworkDocx: noop,
  handleEditKa01Network: noop,
  deleteRecord: noop
});

test('dialog prezenční listiny lze ovládat myší i klávesou Escape', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/'
  });
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true
  });
  const exportSelections = [];
  const root = createRoot(document.getElementById('root'));

  try {
    await act(async () => {
      root.render(React.createElement(Ka01View, createProps(exportSelections)));
    });
    const attendanceButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Vytvořit prezenční listinu'));
    assert.ok(attendanceButton);
    assert.equal(attendanceButton.disabled, false);

    await act(async () => {
      attendanceButton.click();
    });
    assert.equal(document.querySelector('[role="dialog"] h2')?.textContent, 'Vyberte druh prezenční listiny');

    await act(async () => {
      document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    assert.equal(document.querySelector('[role="dialog"]'), null);

    await act(async () => {
      attendanceButton.click();
    });
    const supervisionButton = Array.from(document.querySelectorAll('[role="dialog"] button'))
      .find((button) => button.textContent.trim() === 'Supervize');
    assert.ok(supervisionButton);
    await act(async () => {
      supervisionButton.click();
    });
    assert.deepEqual(exportSelections, ['supervision']);
    assert.equal(document.querySelector('[role="dialog"]'), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, previousGlobals);
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
