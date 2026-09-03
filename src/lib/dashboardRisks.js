import { isGoalTerminal } from './goalStatus.js';

const MINIMUM_REGISTRATION_FIELDS = [
  { key: 'id', label: 'interní ID klienta' },
  { key: 'fullName', label: 'jméno a příjmení' },
  { key: 'datumNarozeni', label: 'datum narození' },
  { key: 'datumVstupu', label: 'datum vstupu do projektu' }
];

const COMPLETE_MONITORING_FIELDS = [
  { key: 'monitoringListUrl', label: 'monitorovací list' },
  { key: 'datumNarozeni', label: 'datum narození' },
  { key: 'pohlavi', label: 'pohlaví' },
  { key: 'postaveniNaTrhu', label: 'postavení na trhu práce' },
  { key: 'vzdelani', label: 'vzdělání' },
  { key: 'znevyhodneni', label: 'typ znevýhodnění' },
  { key: 'datumVstupu', label: 'datum vstupu do projektu' },
  { key: 'mesto', label: 'obec' },
  { key: 'psc', label: 'PSČ' }
];

const CLIENT_ACTIVITY_ENTITY_TYPES = new Set([
  'plans',
  'consultations',
  'debt_cases',
  'therapy_sessions',
  'cv_outputs',
  'job_simulators',
  'tpm_records',
  'employment_records'
]);

const SUPPORT_ENTITY_TYPES = new Set([
  'consultations',
  'debt_cases',
  'therapy_sessions',
  'cv_outputs',
  'job_simulators',
  'tpm_records',
  'employment_records'
]);

const hasValue = (value) => String(value ?? '').trim().length > 0;

const clientName = (client = {}) => (
  String(client.fullName || '').trim()
  || [client.jmeno, client.prijmeni].map((value) => String(value || '').trim()).filter(Boolean).join(' ')
  || (client.id ? `Klient ${client.id}` : 'Klient bez jména')
);

const missingFieldErrors = (client, fields) => fields
  .filter((field) => !hasValue(client?.[field.key]))
  .map((field) => `Chybí ${field.label}.`);

const safeParseGoals = (value) => {
  if (Array.isArray(value)) return value;
  if (!hasValue(value)) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const planGoals = (record = {}) => {
  const candidates = [
    record.goals,
    record.payload?.goals,
    record.payload?.structuredGoals,
    record.cile_json,
    record.payload?.cile_json
  ];
  for (const candidate of candidates) {
    const goals = safeParseGoals(candidate);
    if (goals.length) return goals;
  }
  return [];
};

const recordClientIds = (record = {}) => (
  Array.isArray(record.clientIds)
    ? record.clientIds.filter(Boolean)
    : record.clientId
      ? [record.clientId]
      : []
);

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const normalizeDate = (value) => {
  const source = String(value || '').trim();
  let match = source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    const iso = `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
    const parsed = new Date(`${iso}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : '';
  }
  match = source.match(/^(\d{1,2})[./]\s*(\d{1,2})[./]\s*(\d{4})/);
  if (!match) return '';
  const [, day, month, year] = match;
  const iso = `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : '';
};

const formatDate = (value) => {
  const iso = normalizeDate(value);
  if (!iso) return String(value || '').trim() || 'bez data';
  const [year, month, day] = iso.split('-');
  return `${Number(day)}. ${Number(month)}. ${year}`;
};

const timeToMinutes = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? hours * 60 + minutes : null;
};

const recordMinutes = (record = {}) => {
  const payload = record.payload || {};
  const start = timeToMinutes(payload.startTime || payload.ka02StartTime);
  const end = timeToMinutes(payload.endTime || payload.ka02EndTime);
  if (start !== null && end !== null && start !== end) return end > start ? end - start : end + 24 * 60 - start;
  const duration = Number(payload.durationMinutes);
  if (Number.isFinite(duration) && duration > 0) return duration;
  const actualHours = Number(payload.actualHours);
  return Number.isFinite(actualHours) && actualHours > 0 ? actualHours * 60 : 0;
};

const isDepistageRecord = (record = {}) => [
  record.payload?.consultationType,
  record.consultationType,
  record.title
].some((value) => normalizeText(value).includes('depist'));

const recordLabel = (record = {}) => String(
  record.payload?.consultationType || record.title || record.entityType || 'Záznam'
).trim();

const recordKey = (record, index = 0) => String(
  record?.id || record?._id || `${record?.entityType || 'record'}-${record?.activityDate || 'without-date'}-${index}`
);

const recordContext = (record) => [formatDate(record?.activityDate), recordLabel(record)].filter(Boolean).join(' · ');

const issueFor = (client, errors, suffix = '') => ({
  key: `${String(client?.id || clientName(client))}${suffix ? `-${suffix}` : ''}`,
  clientId: client?.id || '',
  clientName: clientName(client),
  errors
});

const recordIssueFor = (record, clientIndex, errors, suffix, index = 0, forcedClient = null) => {
  const clients = forcedClient
    ? [forcedClient]
    : recordClientIds(record).map((clientId) => clientIndex.get(clientId)).filter(Boolean);
  const names = clients.map((client) => clientName(client));
  return {
    key: `${recordKey(record, index)}-${suffix}${forcedClient?.id ? `-${forcedClient.id}` : ''}`,
    clientId: forcedClient?.id || (clients.length === 1 ? clients[0].id : ''),
    clientName: names.join(', ') || String(record?.clientName || '').trim() || 'Bez přiřazeného klienta',
    context: recordContext(record),
    errors
  };
};

const formatHours = (value) => Number(value || 0).toLocaleString('cs-CZ', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function buildDashboardControls({
  clients = [],
  records = [],
  scopeRecords = records,
  supportMinutesByClient = new Map(),
  projectStartDate = '',
  projectEndDate = '',
  referenceDate = ''
} = {}) {
  const clientIndex = new Map(clients.map((client) => [client.id, client]));
  const contextRecordsByClient = new Map(clients.map((client) => [client.id, []]));
  records.forEach((record) => {
    recordClientIds(record).forEach((clientId) => {
      if (!contextRecordsByClient.has(clientId)) contextRecordsByClient.set(clientId, []);
      contextRecordsByClient.get(clientId).push(record);
    });
  });
  const scopeRecordsByClient = new Map(clients.map((client) => [client.id, []]));
  scopeRecords.forEach((record) => {
    recordClientIds(record).forEach((clientId) => {
      if (!scopeRecordsByClient.has(clientId)) scopeRecordsByClient.set(clientId, []);
      scopeRecordsByClient.get(clientId).push(record);
    });
  });

  const hoursFor = (clientId) => Number(supportMinutesByClient.get(clientId) || 0) / 60;
  const supportedClients = clients.filter((client) => hoursFor(client.id) > 0);
  const longTermClients = supportedClients.filter((client) => hoursFor(client.id) >= 40);
  const shortTermClients = supportedClients.filter((client) => hoursFor(client.id) < 40);
  const longEligible = longTermClients.filter((client) => missingFieldErrors(client, COMPLETE_MONITORING_FIELDS).length === 0);
  const shortEligible = shortTermClients.filter((client) => missingFieldErrors(client, MINIMUM_REGISTRATION_FIELDS).length === 0);

  const near40Issues = supportedClients
    .filter((client) => hoursFor(client.id) >= 30 && hoursFor(client.id) < 40)
    .map((client) => {
      const hours = hoursFor(client.id);
      return issueFor(client, [
        `Evidováno ${formatHours(hours)} h podpory; do hranice 40 h zbývá ${formatHours(40 - hours)} h.`
      ], 'near-40');
    });

  const longNotCountedIssues = longTermClients
    .map((client) => issueFor(client, missingFieldErrors(client, COMPLETE_MONITORING_FIELDS), 'long-not-counted'))
    .filter((issue) => issue.errors.length > 0);

  const shortNotCountedIssues = shortTermClients
    .map((client) => issueFor(client, missingFieldErrors(client, MINIMUM_REGISTRATION_FIELDS), 'short-not-counted'))
    .filter((issue) => issue.errors.length > 0);

  const missingPlanIssues = longTermClients
    .filter((client) => !(contextRecordsByClient.get(client.id) || []).some((record) => record.entityType === 'plans'))
    .map((client) => issueFor(client, ['Chybí individuální plán rozvoje.'], 'missing-plan'));

  const missingEvaluationIssues = supportedClients.flatMap((client) => {
    const errors = (contextRecordsByClient.get(client.id) || [])
      .filter((record) => record.entityType === 'plans')
      .flatMap((record) => planGoals(record))
      .map((goal, index) => ({ goal, index }))
      .filter(({ goal }) => isGoalTerminal(goal) && !hasValue(goal.goalEvaluation))
      .map(({ goal, index }) => {
        const label = String(goal.goalDescription || goal.description || goal.title || goal.text || `Cíl ${index + 1}`).trim();
        return `Uzavřený cíl „${label}“ nemá slovní vyhodnocení.`;
      });
    return errors.length ? [issueFor(client, errors, 'missing-evaluation')] : [];
  });

  const scopedClientActivities = scopeRecords.filter((record) => CLIENT_ACTIVITY_ENTITY_TYPES.has(record.entityType));
  const scopedSupportRecords = scopedClientActivities.filter((record) => SUPPORT_ENTITY_TYPES.has(record.entityType));

  const recordsWithoutClientIssues = scopedClientActivities
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => recordClientIds(record).length === 0)
    .map(({ record, index }) => recordIssueFor(
      record,
      clientIndex,
      ['Záznam nemá přiřazené interní ID klienta a nemůže být spolehlivě započten.'],
      'without-client',
      index
    ));

  const beforeEntryIssues = scopedSupportRecords.flatMap((record, index) => {
    const activityDate = normalizeDate(record.activityDate);
    if (!activityDate) return [];
    return recordClientIds(record).flatMap((clientId) => {
      const client = clientIndex.get(clientId);
      const entryDate = normalizeDate(client?.datumVstupu || client?.datumZarazeni);
      if (!client || !entryDate || activityDate >= entryDate) return [];
      return [recordIssueFor(
        record,
        clientIndex,
        [`Výkon je evidovaný před vstupem klienta do projektu (${formatDate(entryDate)}).`],
        'before-entry',
        index,
        client
      )];
    });
  });

  const incompleteRecordIssues = scopedSupportRecords.flatMap((record, index) => {
    const payload = record.payload || {};
    const errors = [];
    if (!normalizeDate(record.activityDate)) errors.push('Chybí nebo není platné datum výkonu.');
    if (!hasValue(record.worker)) errors.push('Chybí pracovník.');
    if (recordMinutes(record) <= 0) errors.push('Chybí nebo není platná délka výkonu.');
    if (record.entityType === 'consultations') {
      if (!hasValue(payload.supportArea)) errors.push('Chybí oblast podpory.');
      if (!hasValue(payload.place || payload.ka02Place)) errors.push('Chybí forma poskytování.');
      const hasPhysicalRecord = Boolean(payload.supportSpecific?.physicalSignedFiled);
      if (!hasPhysicalRecord && !hasValue(payload.outcome)) errors.push('Chybí výsledek nebo vyhodnocení výkonu.');
    }
    return errors.length ? [recordIssueFor(record, clientIndex, errors, 'incomplete', index)] : [];
  });

  const missingGoalLinkIssues = scopedSupportRecords.flatMap((record, index) => {
    if (isDepistageRecord(record) || recordClientIds(record).length === 0) return [];
    const payload = record.payload || {};
    const linkedGoalId = String(record.linkedPlanGoalId || payload.linkedPlanGoalId || '').trim();
    if (linkedGoalId === 'one-time-order') return [];
    if (!linkedGoalId) {
      return [recordIssueFor(
        record,
        clientIndex,
        ['Výkon nemá vazbu na cíl individuálního plánu ani označení jednorázové zakázky.'],
        'missing-goal-link',
        index
      )];
    }
    const validGoalIds = new Set(recordClientIds(record).flatMap((clientId) => (
      (contextRecordsByClient.get(clientId) || [])
        .filter((item) => item.entityType === 'plans')
        .flatMap((plan) => planGoals(plan).map((goal, goalIndex) => String(goal.goalId || goal.id || `goal-${goalIndex + 1}`)))
    )));
    return validGoalIds.has(linkedGoalId) ? [] : [recordIssueFor(
      record,
      clientIndex,
      [`Vazba na cíl „${linkedGoalId}“ neodpovídá žádnému evidovanému cíli klienta.`],
      'invalid-goal-link',
      index
    )];
  });

  const planWithoutGoalsIssues = clients.flatMap((client) => {
    const emptyPlans = (scopeRecordsByClient.get(client.id) || [])
      .filter((record) => record.entityType === 'plans' && planGoals(record).length === 0);
    if (!emptyPlans.length) return [];
    return [issueFor(client, emptyPlans.map((plan) => (
      `Individuální plán z ${formatDate(plan.activityDate)} neobsahuje žádný konkrétní cíl.`
    )), 'plan-without-goals')];
  });

  const multiplePlansIssues = clients.flatMap((client) => {
    const plans = (scopeRecordsByClient.get(client.id) || []).filter((record) => record.entityType === 'plans');
    if (plans.length <= 1) return [];
    const dates = plans.map((plan) => formatDate(plan.activityDate)).join(', ');
    return [issueFor(client, [
      `Klient má ${plans.length} individuální plány (${dates}); ověřte, který je aktuální.`
    ], 'multiple-plans')];
  });

  const missingFinalEvaluationIssues = clients.flatMap((client) => {
    const plans = (scopeRecordsByClient.get(client.id) || []).filter((record) => record.entityType === 'plans');
    const errors = plans.flatMap((plan) => {
      const goals = planGoals(plan);
      const allGoalsEvaluated = goals.length > 0 && goals.every(
        (goal) => isGoalTerminal(goal) && hasValue(goal.goalEvaluation)
      );
      const finalEvaluation = plan.finalEvaluation || plan.payload?.finalEvaluation;
      return allGoalsEvaluated && !hasValue(finalEvaluation)
        ? [`Všechny cíle plánu z ${formatDate(plan.activityDate)} jsou uzavřené a vyhodnocené, ale chybí závěrečné vyhodnocení plánu.`]
        : [];
    });
    return errors.length ? [issueFor(client, errors, 'missing-final-evaluation')] : [];
  });

  const normalizedProjectStart = normalizeDate(projectStartDate);
  const normalizedProjectEnd = normalizeDate(projectEndDate);
  const normalizedReferenceDate = normalizeDate(referenceDate);
  const suspiciousDateIssues = scopedClientActivities.flatMap((record, index) => {
    const activityDate = normalizeDate(record.activityDate);
    if (!activityDate) return [];
    const errors = [];
    if (normalizedProjectStart && activityDate < normalizedProjectStart) {
      errors.push(`Datum záznamu je před zahájením projektu (${formatDate(normalizedProjectStart)}).`);
    }
    if (normalizedProjectEnd && activityDate > normalizedProjectEnd) {
      errors.push(`Datum záznamu je po skončení projektu (${formatDate(normalizedProjectEnd)}).`);
    }
    if (normalizedReferenceDate && activityDate > normalizedReferenceDate) {
      errors.push(`Datum záznamu je v budoucnosti vůči dnešnímu dni (${formatDate(normalizedReferenceDate)}).`);
    }
    recordClientIds(record).forEach((clientId) => {
      const client = clientIndex.get(clientId);
      const exitDate = normalizeDate(client?.datumVystupu);
      if (client && exitDate && activityDate > exitDate) {
        errors.push(`Záznam je po ukončení účasti klienta ${clientName(client)} (${formatDate(exitDate)}).`);
      }
    });
    return errors.length ? [recordIssueFor(record, clientIndex, errors, 'suspicious-date', index)] : [];
  });

  const risks = [
    { key: 'near-40', label: 'Klienti blízko 40 hodin', detail: '30–39,99 hodiny podpory', issues: near40Issues },
    { key: 'long-not-counted', label: 'Nad 40 hodin, ale nezapočteno do 600 000', detail: 'Chybí povinné monitorovací údaje', issues: longNotCountedIssues },
    { key: 'short-not-counted', label: 'Pod 40 hodin, ale nezapočteno do 670 102', detail: 'Chybí minimální registrační údaje', issues: shortNotCountedIssues },
    { key: 'missing-plan', label: 'Chybí individuální plán u 40+', detail: 'Riziko pro doložení dlouhodobé podpory', issues: missingPlanIssues },
    { key: 'missing-evaluation', label: 'Chybí vyhodnocení cíle', detail: 'Uzavřený cíl nemá slovní vyhodnocení', issues: missingEvaluationIssues },
    { key: 'record-without-client', label: 'Záznam bez přiřazeného klienta', detail: 'Nelze jej spolehlivě zahrnout do hodin a indikátorů', issues: recordsWithoutClientIssues, tooltipLabel: 'Nepřiřazené záznamy a chyby' },
    { key: 'before-entry', label: 'Výkon před vstupem klienta', detail: 'Datum výkonu předchází datu vstupu do projektu', issues: beforeEntryIssues, tooltipLabel: 'Problematické výkony a klienti' },
    { key: 'incomplete-record', label: 'Neúplný výkon', detail: 'Chybí některý z povinných údajů výkonu', issues: incompleteRecordIssues, tooltipLabel: 'Neúplné výkony a chyby' },
    { key: 'missing-goal-link', label: 'Výkon bez platné vazby na cíl IPR', detail: 'Nevztahuje se na depistáž a jednorázovou zakázku', issues: missingGoalLinkIssues, tooltipLabel: 'Výkony, klienti a chyby vazby' },
    { key: 'plan-without-goals', label: 'Individuální plán bez cílů', detail: 'Plán neobsahuje žádný konkrétní cíl', issues: planWithoutGoalsIssues },
    { key: 'multiple-plans', label: 'Více individuálních plánů klienta', detail: 'Je nutné ověřit, který plán je aktuální', issues: multiplePlansIssues },
    { key: 'missing-final-evaluation', label: 'Chybí závěrečné vyhodnocení plánu', detail: 'Všechny cíle jsou uzavřené a jednotlivě vyhodnocené', issues: missingFinalEvaluationIssues },
    { key: 'suspicious-date', label: 'Záznam s podezřelým datem', detail: 'Budoucnost, období mimo projekt nebo po ukončení účasti', issues: suspiciousDateIssues, tooltipLabel: 'Záznamy, klienti a chyby data' }
  ].map((risk) => ({ ...risk, count: risk.issues.length }));

  return {
    contextRecordsByClient,
    supportedClients,
    longTermClients,
    shortTermClients,
    longEligible,
    shortEligible,
    risks
  };
}

export {
  COMPLETE_MONITORING_FIELDS,
  MINIMUM_REGISTRATION_FIELDS,
  buildDashboardControls
};
