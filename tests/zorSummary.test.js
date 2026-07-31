import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHorizontalPrincipleAiPrompt,
  buildHorizontalPrinciplesTexts,
  buildZorTexts
} from '../src/lib/zorSummary.js';

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
    },
    {
      entityType: 'education_records', ka: 'KA03', clientIds: [],
      payload: { hours: '2,5', topic: 'Sociální práce' }
    },
    {
      entityType: 'supervision_records', ka: 'KA03', clientIds: [],
      payload: { hours: '1:30', type: 'skupinová' }
    }
  ]);

  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /1 klientům/);
  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /2,5 hod\./);
  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /sociální depistáž/);
  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /Ondrášov/);
  assert.deepEqual(Object.keys(texts), [
    'KA01 – Přímá práce s klienty – terénní práce',
    'KA02 – Koordinace a síťování služeb',
    'KA03 – Profesní vzdělávání a supervize týmu'
  ]);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /^a\) Case management/m);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /1 aktivit/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /0,5 hod\./);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /b\) Koordinace a síťování služeb/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /1 síťových/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /0,8 hod\./);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /multioborová případová setkávání/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /přístup zaměřený na řešení/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /Nová Véska/);
  assert.match(texts['KA03 – Profesní vzdělávání a supervize týmu'], /2,5 hod\./);
  assert.match(texts['KA03 – Profesní vzdělávání a supervize týmu'], /1,5 hod\./);
  assert.match(texts['KA03 – Profesní vzdělávání a supervize týmu'], /syndromu vyhoření/);
  assert.match(texts['KA03 – Profesní vzdělávání a supervize týmu'], /skupinová i individuální supervizní setkání/);
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
  assert.doesNotMatch(output, /partner(?:em|y)? projektu/i);
});

test('ZOR vrátí srozumitelný text i pro prázdné období', () => {
  const texts = buildZorTexts([]);

  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /nebyla/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /a\) Case management/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /b\) Koordinace a síťování služeb/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /nebyly/);
  assert.match(texts['KA03 – Profesní vzdělávání a supervize týmu'], /nebyly/);
});

test('ZOR připraví dvě samostatná horizontální témata přizpůsobená projektu', () => {
  const horizontalTexts = buildHorizontalPrinciplesTexts();

  assert.deepEqual(Object.keys(horizontalTexts), [
    'Rovné příležitosti a nediskriminace',
    'Rovné příležitosti žen a mužů'
  ]);
  assert.match(horizontalTexts['Rovné příležitosti a nediskriminace'], /terénní práce/i);
  assert.match(horizontalTexts['Rovné příležitosti a nediskriminace'], /Moravského Berouna/i);
  assert.match(horizontalTexts['Rovné příležitosti žen a mužů'], /rodičovské a pečovatelské povinnosti/i);
  assert.doesNotMatch(Object.values(horizontalTexts).join('\n'), /mentor|dluhové poradenství|splátkov/i);
});

test('AI prompt horizontálního tématu vychází z pracovního textu a zakazuje nedoložená tvrzení', () => {
  const kaTexts = buildZorTexts([]);
  const fallback = buildHorizontalPrinciplesTexts()['Rovné příležitosti a nediskriminace'];
  const prompt = buildHorizontalPrincipleAiPrompt({
    periodLabel: '07/2026 - 12/2026',
    title: 'Rovné příležitosti a nediskriminace',
    text: fallback,
    contextText: Object.values(kaTexts).join('\n\n')
  });

  assert.match(prompt, /Rovné příležitosti a nediskriminace/i);
  assert.match(prompt, /nediskriminace/i);
  assert.match(prompt, /Nevymýšlej konkrétní opatření/i);
  assert.match(prompt, /metodický rámec.*pouze kontext projektu/i);
  assert.match(prompt, /CZ\.03\.02\.01\/00\/25_106\/0006125/);
  assert.match(prompt, /Neopakuj statistiky ani číselné údaje/i);
  assert.match(prompt, /jeden souvislý český odstavec/i);
  assert.match(fallback, /individuální nepříznivé sociální situace/i);
  assert.match(fallback, /bez rozdílu věku, pohlaví/i);
});
