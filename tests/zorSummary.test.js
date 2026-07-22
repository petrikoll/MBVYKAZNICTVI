import test from 'node:test';
import assert from 'node:assert/strict';
import { buildZorTexts } from '../src/lib/zorSummary.js';

test('ZOR odděluje KA1, case management a tvorbu sítě podle skutečných dat', () => {
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
  assert.match(texts['KA2 – Case management'], /1 aktivit/);
  assert.match(texts['KA2 – Case management'], /0,5 hod\./);
  assert.match(texts['KA2 – Tvorba a rozvoj sítě'], /1 síťových/);
  assert.match(texts['KA2 – Tvorba a rozvoj sítě'], /0,8 hod\./);
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
  assert.match(texts['KA2 – Case management'], /nebyly/);
  assert.match(texts['KA2 – Tvorba a rozvoj sítě'], /nebyly/);
});

