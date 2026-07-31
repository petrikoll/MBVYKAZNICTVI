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

  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /1 klientovi/);
  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /2,5 hod\./);
  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /sociální depistáž/);
  assert.match(texts['KA01 – Přímá práce s klienty – terénní práce'], /Ondrášov/);
  assert.deepEqual(Object.keys(texts), [
    'KA01 – Přímá práce s klienty – terénní práce',
    'KA02 – Koordinace a síťování služeb',
    'KA03 – Profesní vzdělávání a supervize týmu'
  ]);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /^a\) Case management/m);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /1 aktivita/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /0,5 hod\./);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /b\) Koordinace a síťování služeb/);
  assert.match(texts['KA02 – Koordinace a síťování služeb'], /1 síťová nebo koordinační aktivita/);
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

test('KA01 v ZOR vyhodnotí stavy cílů, jejich komentáře a vazby výkonů', () => {
  const texts = buildZorTexts([
    {
      entityType: 'plans', ka: 'KA1', clientId: 'KLIENT-1', clientIds: ['KLIENT-1'],
      goals: [
        { goalId: 'g1', goalStatus: 'completed', goalEvaluation: 'Cíl byl dosažen.' },
        { goalId: 'g2', goalStatus: 'partially_completed', goalEvaluation: 'Dosaženo částečně.' },
        { goalId: 'g3', goalStatus: 'not_completed', goalEvaluation: 'Cíl nebyl dosažen.' },
        { goalId: 'g4', goalStatus: 'open', goalEvaluation: '' }
      ],
      payload: { durationMinutes: 60 }
    },
    {
      entityType: 'consultations', ka: 'KA1', clientId: 'KLIENT-1', clientIds: ['KLIENT-1'],
      linkedPlanGoalId: 'g1',
      payload: {
        durationMinutes: 30,
        consultationType: 'Terénní sociální práce',
        supportArea: 'Bydlení',
        place: 'V přirozeném prostředí klienta',
        outcome: 'Doložený výsledek',
        nextSteps: 'Dohodnutý další krok'
      }
    },
    {
      entityType: 'consultations', ka: 'KA1', clientId: 'KLIENT-1', clientIds: ['KLIENT-1'],
      linkedPlanGoalId: 'one-time-order',
      payload: { durationMinutes: 30, consultationType: 'Základní sociální poradenství' }
    }
  ]);

  const ka01 = texts['KA01 – Přímá práce s klienty – terénní práce'];
  assert.match(ka01, /celkem 4 cíle; splněné 1, částečně splněné 1, nesplněné 1 a otevřené 1/);
  assert.match(ka01, /Slovní vyhodnocení bylo doloženo u 3 z 3 uzavřených cílů/);
  assert.match(ka01, /Počet plnění navázaných na konkrétní cíl individuálního plánu: 1; počet jednorázových zakázek: 1/);
  assert.match(ka01, /Doložený výsledek byl zaznamenán u 1 plnění a navazující krok u 1 plnění/);
  assert.match(ka01, /V přirozeném prostředí klienta/);
  assert.doesNotMatch(ka01, /Cíl byl dosažen|Dosaženo částečně|Cíl nebyl dosažen|Dohodnutý další krok/);
});

test('ZOR upozorní, když u plánu nejsou dostupné strukturované stavy cílů', () => {
  const texts = buildZorTexts([{
    entityType: 'plans', ka: 'KA1', clientId: 'KLIENT-1', clientIds: ['KLIENT-1'],
    payload: { durationMinutes: 60 }
  }]);

  assert.match(
    texts['KA01 – Přímá práce s klienty – terénní práce'],
    /nejsou v dostupné strukturované evidenci uloženy jednotlivé stavy cílů/
  );
});

test('KA01 zahrne i strukturovaná data specializovaných a typových výkonů', () => {
  const texts = buildZorTexts([
    {
      entityType: 'debt_cases', ka: 'KA1', clientId: 'KLIENT-1', clientIds: ['KLIENT-1'],
      payload: { durationMinutes: 45, solutionPlan: 'Doložený plán řešení', plannedSteps: 'Další krok' }
    },
    {
      entityType: 'consultations', ka: 'KA1', clientId: 'KLIENT-1', clientIds: ['KLIENT-1'],
      payload: {
        durationMinutes: 30,
        consultationType: 'Doprovod',
        supportSpecific: {
          accompanimentPlace: 'Úřad',
          accompanimentResult: 'Vyřízeno',
          recommendedProcedure: 'Kontrola rozhodnutí'
        }
      }
    }
  ]);

  const ka01 = texts['KA01 – Přímá práce s klienty – terénní práce'];
  assert.match(ka01, /Finance\/dluhy/);
  assert.match(ka01, /Dluhová práce/);
  assert.match(ka01, /Doprovod/);
  assert.match(ka01, /Úřad/);
  assert.match(ka01, /Doložený výsledek byl zaznamenán u 2 plnění a navazující krok u 2 plnění/);
  assert.doesNotMatch(ka01, /Doložený plán řešení|Kontrola rozhodnutí/);
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
