const MANDATORY_MONITORING_ITEMS = [
  {
    key: 'lifestyleChange',
    group: 'Obecný monitoring',
    label: 'Pozitivní změna v oblasti životních návyků a způsobu života',
    automatic: false
  },
  {
    key: 'informationReceived',
    group: 'Specifický monitoring',
    label: 'Získání informací o možnostech řešení nepříznivé sociální situace',
    automatic: false
  },
  {
    key: 'individualPlan',
    group: 'Specifický monitoring',
    label: 'Vypracovaný individuální plán podpory',
    automatic: true
  },
  {
    key: 'independentSolution',
    group: 'Specifický monitoring',
    label: 'Zvýšení schopnosti samostatně řešit nepříznivou situaci',
    automatic: false
  }
];

const emptyEntry = () => ({ achieved: false, date: '', evidence: '' });

function normalizeEntry(value = {}) {
  return {
    achieved: value?.achieved === true,
    date: String(value?.date || '').slice(0, 10),
    evidence: String(value?.evidence || '').trim()
  };
}

function normalizeMandatoryMonitoring(value = {}) {
  const source = value?.entries || value || {};
  return {
    entries: Object.fromEntries(
      MANDATORY_MONITORING_ITEMS
        .filter((item) => !item.automatic)
        .map((item) => [item.key, normalizeEntry(source[item.key] || emptyEntry())])
    )
  };
}

function clientIdsForRecord(record = {}) {
  if (Array.isArray(record.clientIds)) return record.clientIds.map(String);
  return record.clientId ? [String(record.clientId)] : [];
}

function firstIndividualPlan(records = [], clientId = '') {
  return records
    .filter((record) => record.entityType === 'plans' && clientIdsForRecord(record).includes(String(clientId)))
    .map((record) => ({
      record,
      date: String(record.activityDate || record.date || '').slice(0, 10)
    }))
    .filter((item) => item.date)
    .sort((left, right) => left.date.localeCompare(right.date))[0] || null;
}

function monitoringRecordForClient(records = [], clientId = '') {
  return records
    .filter((record) => String(record.clientId || '') === String(clientId || ''))
    .sort((left, right) => Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0))[0] || null;
}

function effectiveClientMonitoring({ client, monitoringRecords = [], workRecords = [] } = {}) {
  const storedRecord = monitoringRecordForClient(monitoringRecords, client?.id);
  const stored = normalizeMandatoryMonitoring(storedRecord?.payload || {});
  const plan = firstIndividualPlan(workRecords, client?.id);
  return {
    record: storedRecord,
    entries: {
      ...stored.entries,
      individualPlan: {
        achieved: Boolean(plan),
        date: plan?.date || '',
        evidence: plan ? (plan.record.title || 'Uložený individuální plán podpory') : ''
      }
    }
  };
}

function isCompleteMonitoringEntry(entry = {}) {
  return entry.achieved === true && Boolean(String(entry.date || '').slice(0, 10)) && Boolean(String(entry.evidence || '').trim());
}

function dateInPeriod(date, period = null) {
  const value = String(date || '').slice(0, 10);
  if (!value) return false;
  if (!period?.start && !period?.end) return true;
  if (period.start && value < period.start) return false;
  if (period.end && value > period.end) return false;
  return true;
}

function buildMandatoryMonitoringOverview({ clients = [], monitoringRecords = [], workRecords = [], period = null, romEstimate = 0 } = {}) {
  const details = [];
  let incompleteCount = 0;

  clients.forEach((client) => {
    const effective = effectiveClientMonitoring({ client, monitoringRecords, workRecords });
    MANDATORY_MONITORING_ITEMS.forEach((item) => {
      const entry = effective.entries[item.key] || emptyEntry();
      if (entry.achieved && !isCompleteMonitoringEntry(entry)) incompleteCount += 1;
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
        source: item.automatic ? 'Automaticky z individuálního plánu' : 'Potvrzeno v monitoringu'
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
      ? Math.max(0, Math.floor(Number(romEstimate) || 0))
      : new Set(details.filter((row) => row.itemKey === item.key).map((row) => row.clientId)).size
  }));

  return { summary, details, incompleteCount };
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
  detailSheet.getColumn(5).numFmt = 'dd.mm.yyyy';

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    personRows: overview.details.length,
    summary: overview.summary
  };
}

export {
  MANDATORY_MONITORING_ITEMS,
  buildMandatoryMonitoringOverview,
  buildMandatoryMonitoringXlsx,
  effectiveClientMonitoring,
  isCompleteMonitoringEntry,
  normalizeMandatoryMonitoring
};
