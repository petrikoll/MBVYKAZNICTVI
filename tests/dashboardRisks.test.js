import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMPLETE_MONITORING_FIELDS,
  MINIMUM_REGISTRATION_FIELDS,
  buildDashboardControls
} from '../src/lib/dashboardRisks.js';

const completeClient = (overrides = {}) => ({
  id: 'client',
  fullName: 'Testovací klient',
  datumNarozeni: '1980-01-01',
  datumVstupu: '2026-01-01',
  monitoringListUrl: 'https://example.test/monitoring',
  pohlavi: 'žena',
  postaveniNaTrhu: 'zaměstnaná',
  vzdelani: 'střední',
  znevyhodneni: 'bez znevýhodnění',
  mesto: 'Moravský Beroun',
  psc: '79305',
  ...overrides
});

test('dashboard vrací všech jedenáct kontrol a ke každému nálezu konkrétního klienta i chyby', () => {
  const clients = [
    completeClient({ id: 'near', fullName: 'Anna Blízká' }),
    completeClient({ id: 'long', fullName: 'Boris Dlouhý', monitoringListUrl: '', pohlavi: '' }),
    completeClient({ id: 'short', fullName: 'Cyril Krátký', datumNarozeni: '', datumVstupu: '' }),
    completeClient({ id: 'goal', fullName: 'Dana Cílová' })
  ];
  const records = [
    {
      id: 'plan-long',
      entityType: 'plans',
      clientId: 'long',
      goals: [{ goalDescription: 'Stabilizovat bydlení', goalStatus: 'active' }]
    },
    {
      id: 'plan-goal',
      entityType: 'plans',
      clientId: 'goal',
      payload: {
        structuredGoals: [{ goalDescription: 'Vyřešit dluhy', goalStatus: 'completed', goalEvaluation: '' }]
      }
    }
  ];
  const supportMinutesByClient = new Map([
    ['near', 35 * 60],
    ['long', 45 * 60],
    ['short', 10 * 60],
    ['goal', 20 * 60]
  ]);

  const result = buildDashboardControls({ clients, records, supportMinutesByClient });
  assert.deepEqual(result.risks.map((risk) => risk.key), [
    'near-40',
    'long-not-counted',
    'short-not-counted',
    'missing-plan',
    'missing-evaluation',
    'record-without-client',
    'missing-goal-link',
    'plan-without-goals',
    'multiple-plans',
    'missing-final-evaluation',
    'suspicious-date'
  ]);
  result.risks.forEach((risk) => assert.equal(risk.count, risk.issues.length));

  const byKey = Object.fromEntries(result.risks.map((risk) => [risk.key, risk]));
  assert.equal(byKey['near-40'].issues[0].clientName, 'Anna Blízká');
  assert.match(byKey['near-40'].issues[0].errors[0], /35 h podpory/);
  assert.deepEqual(byKey['long-not-counted'].issues[0].errors, [
    'Chybí monitorovací list.',
    'Chybí pohlaví.'
  ]);
  assert.deepEqual(byKey['short-not-counted'].issues[0].errors, [
    'Chybí datum narození.',
    'Chybí datum vstupu do projektu.'
  ]);
  assert.equal(byKey['missing-plan'].count, 0);
  assert.deepEqual(byKey['missing-evaluation'].issues[0], {
    key: 'goal-missing-evaluation',
    clientId: 'goal',
    clientName: 'Dana Cílová',
    errors: ['Uzavřený cíl „Vyřešit dluhy“ nemá slovní vyhodnocení.']
  });

  assert.equal(result.longEligible.length, 0);
  assert.equal(result.shortEligible.length, 2);
});

test('šest nových kontrol odhalí konkrétní chybné záznamy a plány bez falešné vazby u jednorázové zakázky', () => {
  const clients = [
    completeClient({ id: 'before', fullName: 'Předčasný Klient', datumVstupu: '2026-08-10' }),
    completeClient({ id: 'incomplete', fullName: 'Neúplná Klientka' }),
    completeClient({ id: 'unlinked', fullName: 'Nevázaný Klient' }),
    completeClient({ id: 'empty-plan', fullName: 'Prázdný Plán' }),
    completeClient({ id: 'many-plans', fullName: 'Více Plánů' }),
    completeClient({ id: 'final', fullName: 'Závěrečné Hodnocení' }),
    completeClient({ id: 'after-exit', fullName: 'Ukončený Klient', datumVystupu: '2026-08-15' })
  ];
  const completeSupport = (overrides = {}) => ({
    entityType: 'consultations',
    activityDate: '2026-08-20',
    worker: 'Sociální pracovník',
    linkedPlanGoalId: 'one-time-order',
    payload: {
      durationMinutes: 60,
      supportArea: 'Bydlení',
      place: 'Ambulantní',
      outcome: 'Situace byla projednána.',
      linkedPlanGoalId: 'one-time-order'
    },
    ...overrides
  });
  const records = [
    completeSupport({ id: 'orphan' }),
    completeSupport({ id: 'before-record', clientId: 'before', clientIds: ['before'], activityDate: '2026-08-01' }),
    completeSupport({
      id: 'incomplete-record',
      clientId: 'incomplete',
      clientIds: ['incomplete'],
      worker: '',
      payload: { durationMinutes: 0, supportArea: '', place: '', outcome: '', linkedPlanGoalId: 'one-time-order' }
    }),
    completeSupport({
      id: 'unlinked-record',
      clientId: 'unlinked',
      clientIds: ['unlinked'],
      linkedPlanGoalId: '',
      payload: { durationMinutes: 45, supportArea: 'Finance', place: 'Terénní', outcome: 'Domluven další postup.' }
    }),
    {
      id: 'empty-plan-record', entityType: 'plans', clientId: 'empty-plan', clientIds: ['empty-plan'],
      activityDate: '2026-08-02', goals: []
    },
    {
      id: 'many-plan-1', entityType: 'plans', clientId: 'many-plans', clientIds: ['many-plans'],
      activityDate: '2026-08-03', goals: [{ goalId: 'g1', goalDescription: 'První cíl', goalStatus: 'active' }]
    },
    {
      id: 'many-plan-2', entityType: 'plans', clientId: 'many-plans', clientIds: ['many-plans'],
      activityDate: '2026-08-04', goals: [{ goalId: 'g2', goalDescription: 'Druhý cíl', goalStatus: 'active' }]
    },
    {
      id: 'final-plan', entityType: 'plans', clientId: 'final', clientIds: ['final'], activityDate: '2026-08-05',
      goals: [{ goalId: 'done', goalDescription: 'Dokončený cíl', goalStatus: 'completed', goalEvaluation: 'Splněno.' }],
      payload: { finalEvaluation: '' }
    },
    completeSupport({ id: 'after-exit-record', clientId: 'after-exit', clientIds: ['after-exit'] })
  ];

  const result = buildDashboardControls({
    clients,
    records,
    scopeRecords: records,
    projectStartDate: '2026-07-01',
    projectEndDate: '2028-06-30',
    referenceDate: '2026-09-03'
  });
  const byKey = Object.fromEntries(result.risks.map((risk) => [risk.key, risk]));

  assert.equal(byKey['record-without-client'].count, 1);
  assert.equal(byKey['record-without-client'].issues[0].clientName, 'Bez přiřazeného klienta');
  assert.equal(byKey['before-entry'], undefined);
  assert.equal(byKey['incomplete-record'], undefined);
  assert.equal(byKey['missing-goal-link'].count, 1);
  assert.equal(byKey['missing-goal-link'].issues[0].clientName, 'Nevázaný Klient');
  assert.equal(byKey['plan-without-goals'].count, 1);
  assert.equal(byKey['multiple-plans'].count, 1);
  assert.equal(byKey['missing-final-evaluation'].count, 1);
  assert.equal(byKey['suspicious-date'].count, 1);
  assert.match(byKey['suspicious-date'].issues[0].errors[0], /po ukončení účasti/);
});

test('depistáž a jednorázová zakázka nepotřebují vazbu na cíl IPR', () => {
  const client = completeClient({ id: 'client', fullName: 'Klient Výjimka' });
  const records = [
    {
      id: 'outreach', entityType: 'consultations', clientId: 'client', clientIds: ['client'],
      title: 'Depistáž', activityDate: '2026-08-01', worker: 'Pracovník',
      payload: { durationMinutes: 30, supportArea: 'Bydlení', place: 'Terénní', outcome: '' }
    },
    {
      id: 'one-time', entityType: 'consultations', clientId: 'client', clientIds: ['client'],
      activityDate: '2026-08-02', worker: 'Pracovník', linkedPlanGoalId: 'one-time-order',
      payload: { durationMinutes: 30, supportArea: 'Finance', place: 'Ambulantní', outcome: 'Vyřešeno.' }
    }
  ];
  const result = buildDashboardControls({ clients: [client], records, scopeRecords: records });

  assert.equal(result.risks.find((risk) => risk.key === 'missing-goal-link').count, 0);
});

test('kontrola chybějícího plánu zahrne každého klienta 40+ právě jednou', () => {
  const clients = [
    completeClient({ id: 'one', fullName: 'První klient' }),
    completeClient({ id: 'two', fullName: 'Druhý klient' })
  ];
  const result = buildDashboardControls({
    clients,
    records: [],
    supportMinutesByClient: new Map([['one', 2400], ['two', 3000]])
  });
  const risk = result.risks.find((item) => item.key === 'missing-plan');

  assert.equal(risk.count, 2);
  assert.deepEqual(risk.issues.map((issue) => issue.clientName), ['První klient', 'Druhý klient']);
  assert.ok(risk.issues.every((issue) => issue.errors[0] === 'Chybí individuální plán rozvoje.'));
});

test('kontrola data dál ukáže nezapočtený záznam bez data a budoucí záznam', () => {
  const client = completeClient({ id: 'dated', fullName: 'Datumový Klient' });
  const validScopeRecord = {
    id: 'valid', entityType: 'consultations', clientId: 'dated', clientIds: ['dated'],
    activityDate: '2026-08-01', payload: { durationMinutes: 60, linkedPlanGoalId: 'one-time-order' }
  };
  const result = buildDashboardControls({
    clients: [client],
    records: [validScopeRecord],
    scopeRecords: [validScopeRecord],
    dateValidationRecords: [
      { ...validScopeRecord, id: 'missing-date', activityDate: '' },
      { ...validScopeRecord, id: 'future-date', activityDate: '2026-10-01' },
      { id: 'future-education', entityType: 'education_records', activityDate: '2026-10-02', payload: { hours: '2' } }
    ],
    projectStartDate: '2026-07-01',
    projectEndDate: '2028-06-30',
    referenceDate: '2026-09-03'
  });
  const risk = result.risks.find((item) => item.key === 'suspicious-date');

  assert.equal(risk.count, 3);
  assert.match(risk.issues[0].errors[0], /nemá platné datum/);
  assert.match(risk.issues[1].errors[0], /v budoucnosti/);
  assert.match(risk.issues[2].errors[0], /v budoucnosti/);
});

test('definice polí odpovídají kritériím obou indikátorů', () => {
  assert.deepEqual(MINIMUM_REGISTRATION_FIELDS.map((field) => field.key), [
    'id', 'fullName', 'datumNarozeni', 'datumVstupu'
  ]);
  assert.deepEqual(COMPLETE_MONITORING_FIELDS.map((field) => field.key), [
    'monitoringListUrl', 'datumNarozeni', 'pohlavi', 'postaveniNaTrhu', 'vzdelani',
    'znevyhodneni', 'datumVstupu', 'mesto', 'psc'
  ]);
});
