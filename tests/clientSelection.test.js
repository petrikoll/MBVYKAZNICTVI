import test from 'node:test';
import assert from 'node:assert/strict';

import { buildClientSelectionPool } from '../src/lib/clientSelection.js';

const clients = [
  { id: 'client-a', fullName: 'Klient A' },
  { id: 'client-b', fullName: 'Klient B' }
];

test('registr při volbě zobrazit všechny nabízí všechny klienty', () => {
  assert.deepEqual(buildClientSelectionPool({
    clients,
    accessibleClients: [clients[0]],
    selectedClientId: 'client-a',
    mainView: 'clients',
    showAllClients: true
  }), clients);
});

test('vybraný klient z registru zůstane dostupný i na navazujícím listu', () => {
  assert.deepEqual(buildClientSelectionPool({
    clients,
    accessibleClients: [clients[0]],
    selectedClientId: 'client-b',
    mainView: 'ka02',
    showAllClients: true
  }), [clients[1], clients[0]]);
});

test('neplatný výběr se do dostupného seznamu nepřidává', () => {
  assert.deepEqual(buildClientSelectionPool({
    clients,
    accessibleClients: [clients[0]],
    selectedClientId: 'missing-client',
    mainView: 'ka02',
    showAllClients: true
  }), [clients[0]]);
});
