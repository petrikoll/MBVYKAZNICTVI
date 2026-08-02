import { GOAL_STATUS, normalizeGoalStatus } from './goalStatus.js';

const MANDATORY_MONITORING_ITEMS = [
  {
    key: 'lifestyleChange',
    group: 'Obecný monitoring',
    label: 'Pozitivní změna v oblasti životních návyků a způsobu života'
  },
  {
    key: 'informationReceived',
    group: 'Specifický monitoring',
    label: 'Získání informací o možnostech řešení nepříznivé sociální situace'
  },
  {
    key: 'individualPlan',
    group: 'Specifický monitoring',
    label: 'Vypracovaný individuální plán podpory'
  },
  {
    key: 'independentSolution',
    group: 'Specifický monitoring',
    label: 'Zvýšení schopnosti samostatně řešit nepříznivou situaci'
  }
];

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

function clientIdsForRecord(record = {}) {
  if (Array.isArray(record.clientIds)) return record.clientIds.map(String);
  return record.clientId ? [String(record.clientId)] : [];
}

function recordDate(record = {}) {
  const source = record.activityDate || record.date || record.payload?.updatedAt || record.updatedAt || record.createdAt || '';
  if (typeof source === 'number') {
    const date = new Date(source);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }
  const match = String(source || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function planGoals(record = {}) {
  if (Array.isArray(record.goals)) return record.goals;
  if (Array.isArray(record.payload?.structuredGoals)) return record.payload.structuredGoals;
  return Array.isArray(record.payload?.goals) ? record.payload.goals : [];
}

function planFinalEvaluation(record = {}) {
  return String(record.finalEvaluation || record.payload?.finalEvaluation || '').trim();
}

function earliestRecord(records = []) {
  return records
    .map((record) => ({ record, date: recordDate(record) }))
    .filter((item) => item.date)
    .sort((left, right) => left.date.localeCompare(right.date))[0] || null;
}

function automaticClientMonitoring({ client, workRecords = [] } = {}) {
  const clientRecords = workRecords.filter((record) => clientIdsForRecord(record).includes(String(client?.id || '')));
  const plans = clientRecords.filter((record) => record.entityType === 'plans');
  const createdPlan = earliestRecord(plans);
  const positiveChangePlan = earliestRecord(plans.filter((plan) =>
    planGoals(plan).some((goal) => [GOAL_STATUS.COMPLETED, GOAL_STATUS.PARTIALLY_COMPLETED].includes(normalizeGoalStatus(goal)))
  ));
  const completedPlan = earliestRecord(plans.filter((plan) => {
    const goals = planGoals(plan);
    return goals.length > 0
      && goals.every((goal) => normalizeGoalStatus(goal) === GOAL_STATUS.COMPLETED)
      && Boolean(planFinalEvaluation(plan));
  }));
  const counselling = earliestRecord(clientRecords.filter((record) =>
    record.entityType === 'consultations'
      && normalizeText(record.payload?.consultationType || record.consultationType || record.title)
        .includes('zakladni socialni poradenstvi')
  ));

  return {
    entries: {
      lifestyleChange: {
        achieved: Boolean(positiveChangePlan),
        date: positiveChangePlan?.date || '',
        evidence: positiveChangePlan ? 'Splněný nebo částečně splněný cíl individuálního plánu' : ''
      },
      informationReceived: {
        achieved: Boolean(counselling),
        date: counselling?.date || '',
        evidence: counselling ? 'Základní sociální poradenství' : ''
      },
      individualPlan: {
        achieved: Boolean(createdPlan),
        date: createdPlan?.date || '',
        evidence: createdPlan ? 'Uložený individuální plán podpory' : ''
      },
      independentSolution: {
        achieved: Boolean(completedPlan),
        date: completedPlan?.date || '',
        evidence: completedPlan ? 'Splněný a závěrečně vyhodnocený individuální plán podpory' : ''
      }
    }
  };
}

function isCompleteMonitoringEntry(entry = {}) {
  return entry.achieved === true && Boolean(entry.date) && Boolean(String(entry.evidence || '').trim());
}

function dateInPeriod(date, period = null) {
  const value = String(date || '').slice(0, 10);
  if (!value) return false;
  if (!period?.start && !period?.end) return true;
  if (period.start && value < period.start) return false;
  if (period.end && value > period.end) return false;
  return true;
}

function isNationalMinorityClient(client = {}) {
  return normalizeText(client.znevyhodneni).includes('narodnostni mensiny');
}

function buildMandatoryMonitoringOverview({ clients = [], workRecords = [], period = null } = {}) {
  const details = [];

  clients.forEach((client) => {
    const effective = automaticClientMonitoring({ client, workRecords });
    MANDATORY_MONITORING_ITEMS.forEach((item) => {
      const entry = effective.entries[item.key] || {};
      if (!isCompleteMonitoringEntry(entry) || !dateInPeriod(entry.date, period)) return;
      details.push({
        key: `${client.id}-${item.key}`,
        clientId: client.id,
        clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim() || client.id,
        itemKey: item.key,
        group: item.group,
        label: item.label,
        date: entry.date,
        evidence: entry.evidence,
        qualifiedRomaEstimate: item.key === 'lifestyleChange' && isNationalMinorityClient(client),
        source: 'Automaticky z evidence aplikace'
      });
    });
  });

  const summaryDefinitions = [
    ...MANDATORY_MONITORING_ITEMS,
    { key: 'romEstimate', group: 'Obecný monitoring – podskupina', label: 'Z toho kvalifikovaný odhad počtu Romů' }
  ];
  const summary = summaryDefinitions.map((item) => ({
    ...item,
    count: item.key === 'romEstimate'
      ? new Set(details.filter((row) => row.itemKey === 'lifestyleChange' && row.qualifiedRomaEstimate).map((row) => row.clientId)).size
      : new Set(details.filter((row) => row.itemKey === item.key).map((row) => row.clientId)).size
  }));

  return { summary, details, incompleteCount: 0 };
}

async function buildMandatoryMonitoringXlsx(options = {}) {
  const ExcelModule = await import('exceljs');
  const ExcelJS = ExcelModule.default || ExcelModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MB VÝKAZNICTVÍ';
  workbook.created = new Date();

  const overview = buildMandatoryMonitoringOverview(options);
  const periodLabel = options.period?.label || 'Všechna data';
  const summarySheet = workbook.addWorksheet('Souhrn');
  summarySheet.addRow(['Monitoring', periodLabel]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Skupina', 'Sledovaná položka', 'Počet osob']);
  overview.summary.forEach((item) => summarySheet.addRow([item.group, item.label, item.count]));

  const detailSheet = workbook.addWorksheet('Započtené osoby');
  detailSheet.addRow(['Klient ID', 'Klient', 'Skupina', 'Sledovaná položka', 'Datum dosažení', 'Doložení', 'Zdroj']);
  overview.details.forEach((row) => detailSheet.addRow([
    row.clientId, row.clientName, row.group, row.label, row.date, row.evidence, row.source
  ]));

  [summarySheet, detailSheet].forEach((sheet) => {
    sheet.views = [{ state: 'frozen', ySplit: sheet === summarySheet ? 3 : 1 }];
    sheet.getRow(sheet === summarySheet ? 3 : 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(sheet === summarySheet ? 3 : 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    sheet.autoFilter = sheet === summarySheet ? 'A3:C3' : 'A1:G1';
  });
  summarySheet.columns = [{ width: 34 }, { width: 72 }, { width: 14 }];
  detailSheet.columns = [{ width: 16 }, { width: 30 }, { width: 34 }, { width: 72 }, { width: 18 }, { width: 60 }, { width: 38 }];

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    personRows: overview.details.length,
    summary: overview.summary
  };
}

export {
  MANDATORY_MONITORING_ITEMS,
  automaticClientMonitoring,
  buildMandatoryMonitoringOverview,
  buildMandatoryMonitoringXlsx,
  isCompleteMonitoringEntry
};
