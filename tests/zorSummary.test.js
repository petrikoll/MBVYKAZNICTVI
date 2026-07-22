import test from 'node:test';
import assert from 'node:assert/strict';
import { buildZorTexts } from '../src/lib/zorSummary.js';

test('ZOR spojí case management a tvorbu sítě do jednoho členěného textu KA2', () => {
  const texts = buildZorTexts([
    {
      entityType: 'plans', ka: 'KA1', clientId: 'KLIENT-1', clientIds: ['KLIENT-1'],
      payload: { durationMinutes: 60 }
    },
    {
      entityType: 'consultations', ka: 'KA1', clientId: 'KLIENT-1', clientIds: ['KLIENT-1'],
      payload: { durationMinutes: 90, supportArea: 'Bydlení', consultationType: 'Sociální poradenství' }
    },
    {
      entityType: 'consultations', ka: 'KA2', clientId: 'KLIENT-2', clientIds: ['KLIENT-2'],
      payload: { durationMinutes: 30, supportArea: 'Rodina', consultationType: 'Případové setkání', partnerNames: ['OSPOD'] }
    },
    {
      entityType: 'network_activities', ka: 'KA2', clientIds: [],
      payload: { durationMinutes: 45, type: 'Koordinační setkání', partnerNames: ['Úřad práce'] }
    }
  ]);

  assert.match(texts['KA1 – Individuální podpora'], /1 klientům/);
  assert.match(texts['KA1 – Individuální podpora'], /2,5 hod\./);
  assert.deepEqual(Object.keys(texts), [
    'KA1 – Individuální podpora',
    'KA2 – Case management a tvorba sítě'
  ]);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /^a\) Case management/m);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /1 aktivit/);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /0,5 hod\./);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /b\) Tvorba a rozvoj sítě/);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /1 síťových/);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /0,8 hod\./);
});

test('ZOR nepropíše identifikátor ani jméno klienta do výsledku', () => {
  const texts = buildZorTexts([{
    entityType: 'consultations',
    ka: 'KA1',
    clientId: 'KLIENT-0007',
    clientIds: ['KLIENT-0007'],
    clientName: 'Josef Weigl',
    title: 'Podpora Josef Weigl',
    payload: { durationMinutes: 60, supportArea: 'Bydlení', consultationType: 'Sociální poradenství' }
  }]);
  const output = Object.values(texts).join('\n');

  assert.doesNotMatch(output, /Josef Weigl/);
  assert.doesNotMatch(output, /KLIENT-0007/);
});

test('ZOR vrátí srozumitelný text i pro prázdné období', () => {
  const texts = buildZorTexts([]);

  assert.match(texts['KA1 – Individuální podpora'], /nebyla/);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /a\) Case management/);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /b\) Tvorba a rozvoj sítě/);
  assert.match(texts['KA2 – Case management a tvorba sítě'], /nebyly/);
});
