import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');

function mutationContext() {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const values = new Map();
  context.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) => values.get(key) || null,
      setProperty: (key, value) => values.set(key, value),
      deleteProperty: (key) => values.delete(key),
      getProperties: () => Object.fromEntries(values)
    })
  };
  context.LockService = {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
  };
  context.assertToken_ = () => {};
  context.invalidateReadActions_ = () => {};
  context.json_ = (payload) => payload;
  return { context, values };
}

test('repeated performance operation id returns the first write result', () => {
  const { context, values } = mutationContext();
  let saveCalls = 0;
  context.savePerformance_ = () => {
    saveCalls += 1;
    return { vykon_id: 'VYKON-0099', klient_id: 'KLIENT-0001', status: 'Platny' };
  };
  context.findMutationEntityForResult_ = () => ({
    vykon_id: 'VYKON-0099', klient_id: 'KLIENT-0001', status: 'Platny'
  });
  const event = {
    postData: {
      contents: JSON.stringify({
        token: 'secret',
        action: 'savePerformance',
        request_id: 'save-performance-1234567890',
        performance: { klient_id: 'KLIENT-0001', popis: 'Podpora' }
      })
    }
  };

  const first = context.doPost(event);
  const second = context.doPost(event);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.replayed, true);
  assert.equal(second.performance.vykon_id, 'VYKON-0099');
  assert.equal(saveCalls, 1);
  const stored = [...values.values()][0];
  assert.doesNotMatch(stored, /Podpora|KLIENT-0001/);
  assert.match(stored, /VYKON-0099/);
});

test('one operation id cannot be reused with a different payload', () => {
  const { context } = mutationContext();
  context.saveEducation_ = (education) => ({
    ...education,
    vzdelavani_id: 'VZDELAVANI-0001',
    status: 'Platny'
  });
  context.findMutationEntityForResult_ = () => ({
    vzdelavani_id: 'VZDELAVANI-0001', status: 'Platny'
  });
  const requestId = 'save-education-1234567890';
  const first = context.doPost({ postData: { contents: JSON.stringify({
    token: 'secret', action: 'saveEducation', request_id: requestId,
    education: { nazev_vzdelavani: 'Kurz A' }
  }) } });
  const second = context.doPost({ postData: { contents: JSON.stringify({
    token: 'secret', action: 'saveEducation', request_id: requestId,
    education: { nazev_vzdelavani: 'Kurz B' }
  }) } });

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.code, 'IDEMPOTENCY_KEY_REUSE');
});
