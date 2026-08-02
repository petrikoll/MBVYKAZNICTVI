import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearLocalReportingCache,
  loadLocalClients,
  saveLocalClients
} from '../src/lib/projectUtils.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key)
  };
}

test('lokální kopie klientů je dostupná při dalším spuštění', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 7, 2, 12);
  const clients = [{ id: 'client-1', jmeno: 'Alena', updatedAt: now }];

  assert.equal(saveLocalClients(clients, storage, now), true);
  assert.deepEqual(loadLocalClients(storage, now + 1000), clients);
});

test('zastaralá lokální kopie se po sedmi dnech nepoužije', () => {
  const storage = createStorage();
  const now = Date.UTC(2026, 7, 2, 12);
  saveLocalClients([{ id: 'client-1' }], storage, now);

  const eightDaysLater = now + 8 * 24 * 60 * 60 * 1000;
  assert.deepEqual(loadLocalClients(storage, eightDaysLater), []);
  assert.equal(storage.has('projectReporting.clients.v1'), false);
});

test('vymazání lokální kopie nezasahuje jiná nastavení aplikace', () => {
  const storage = createStorage({
    'projectReporting.clients.v1': '{}',
    'projectReporting.records': '[]',
    'projectReporting.globalWorker': 'Pracovník'
  });

  assert.equal(clearLocalReportingCache(storage), true);
  assert.equal(storage.has('projectReporting.clients.v1'), false);
  assert.equal(storage.has('projectReporting.records'), false);
  assert.equal(storage.has('projectReporting.globalWorker'), true);
});
