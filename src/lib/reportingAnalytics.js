const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const getRecordClientIds = (record) => (
  Array.isArray(record?.clientIds)
    ? record.clientIds.filter(Boolean)
    : record?.clientId
      ? [record.clientId]
      : []
);

const getAnalyticsContactKind = (record) => {
  const payload = record?.payload || {};
  const value = normalizeText([
    payload.place,
    payload.contactMethod,
    payload.supportSpecific?.contactMethod,
    payload.supportSpecific?.fieldWorkPlace,
    payload.supportSpecific?.contactPlace
  ].filter(Boolean).join(' '));
  if (value.includes('telefon')) return 'telephone';
  if (['teren', 'domacnost', 'ubytovna', 'verejny prostor', 'doprovod', 'navstev'].some((term) => value.includes(term))) return 'field';
  if (['ambul', 'kancelar'].some((term) => value.includes(term))) return 'ambulatory';

  const performanceType = normalizeText(payload.consultationType || record?.title);
  if (performanceType.includes('terenni socialni prace') || performanceType.includes('depist')) return 'field';

  // Nové záznamy mají formu povinnou. U starších záznamů bez uložené formy
  // používáme ambulantní výchozí hodnotu, aby analytika obsahovala jen tři
  // projektově povolené formy poskytování.
  return 'ambulatory';
};

const getAnalyticsGoalLinkKind = (record) => {
  const payload = record?.payload || {};
  const goalId = String(record?.linkedPlanGoalId || payload.linkedPlanGoalId || '').trim();
  const goalLabel = String(record?.linkedPlanGoalLabel || payload.linkedPlanGoalLabel || '').trim();
  if (goalId === 'one-time-order' || normalizeText(goalLabel).includes('jednoraz')) return 'one-time';
  if (goalId || goalLabel) return 'linked';
  return 'none';
};

function buildAnalyticsRows(records = [], clients = []) {
  const clientIndex = new Map(clients.map((client) => [client.id, client]));
  return records.map((record, index) => {
    const payload = record.payload || {};
    const clientIds = getRecordClientIds(record);
    const clientNames = clientIds.map((clientId) => (
      clientIndex.get(clientId)?.fullName || record.clientName || clientId
    ));
    const comment = String(payload.supportSpecific?.physicalRecordComment || '').trim();
    const outcome = String(payload.outcome || '').trim();
    const performanceType = String(payload.consultationType || record.title || 'Neuvedený výkon').trim();
    const supportArea = String(payload.supportArea || '').trim();
    const durationMinutes = Math.max(0, Number(payload.durationMinutes || 0));
    const date = String(record.activityDate || '').slice(0, 10);
    return {
      key: String(record.id || record._id || `${date}-${performanceType}-${index}`),
      source: record,
      date,
      month: /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : '',
      clientIds,
      clientNames,
      clientLabel: clientNames.join(', ') || record.clientName || 'Bez přiřazeného klienta',
      performanceType,
      supportArea,
      durationMinutes,
      worker: String(record.worker || '').trim(),
      ka: String(record.ka || '').trim(),
      contactKind: getAnalyticsContactKind(record),
      goalLinkKind: getAnalyticsGoalLinkKind(record),
      goalLabel: String(record.linkedPlanGoalLabel || payload.linkedPlanGoalLabel || '').trim(),
      topics: String(payload.topics || '').trim(),
      outcome,
      nextSteps: String(payload.nextSteps || payload.progressSummary || '').trim(),
      comment,
      hasOutcome: Boolean(outcome || comment),
      hasNarrative: Boolean(String(record.documentText || payload.topics || '').trim())
    };
  });
}

function filterAnalyticsRows(rows = [], filters = {}) {
  return rows.filter((row) => {
    if (filters.clientId && filters.clientId !== 'all' && !row.clientIds.includes(filters.clientId)) return false;
    if (filters.performanceType && filters.performanceType !== 'all' && row.performanceType !== filters.performanceType) return false;
    if (filters.supportArea && filters.supportArea !== 'all' && (row.supportArea || 'Neuvedeno') !== filters.supportArea) return false;
    if (filters.contactKind && filters.contactKind !== 'all' && row.contactKind !== filters.contactKind) return false;
    if (filters.goalLinkKind && filters.goalLinkKind !== 'all' && row.goalLinkKind !== filters.goalLinkKind) return false;
    if (filters.month && filters.month !== 'all' && row.month !== filters.month) return false;

    switch (filters.smartFilter) {
      case 'missing-area': return !row.supportArea;
      case 'missing-outcome': return !row.hasOutcome;
      case 'without-goal': return row.goalLinkKind === 'none';
      case 'outreach-comment': return normalizeText(row.performanceType).includes('depist') && Boolean(row.comment);
      case 'long-performance': return row.durationMinutes >= 60;
      default: return true;
    }
  });
}

const analyticsMetricValue = (row, metric = 'count') => (
  metric === 'hours' ? Number(row.durationMinutes || 0) / 60 : 1
);

function groupAnalyticsByDimension(rows = [], field, metric = 'count') {
  const groups = new Map();
  rows.forEach((row) => {
    const label = String(row[field] || 'Neuvedeno').trim() || 'Neuvedeno';
    groups.set(label, (groups.get(label) || 0) + analyticsMetricValue(row, metric));
  });
  return Array.from(groups, ([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'cs'));
}

function groupAnalyticsByMonth(rows = [], metric = 'count', maxTypes = 5) {
  const typeTotals = groupAnalyticsByDimension(rows, 'performanceType', metric);
  const primaryTypes = typeTotals.slice(0, maxTypes).map((item) => item.label);
  const monthIndex = new Map();
  rows.forEach((row) => {
    if (!row.month) return;
    if (!monthIndex.has(row.month)) monthIndex.set(row.month, { month: row.month, total: 0, segments: new Map() });
    const month = monthIndex.get(row.month);
    const value = analyticsMetricValue(row, metric);
    const type = primaryTypes.includes(row.performanceType) ? row.performanceType : 'Ostatní';
    month.total += value;
    month.segments.set(type, (month.segments.get(type) || 0) + value);
  });
  const types = primaryTypes.concat(
    Array.from(monthIndex.values()).some((item) => item.segments.has('Ostatní')) ? ['Ostatní'] : []
  );
  const months = Array.from(monthIndex.values())
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((item) => ({ ...item, segments: Object.fromEntries(item.segments) }));
  return { months, types };
}

function buildAnalyticsSummary(rows = []) {
  const clientIds = new Set(rows.flatMap((row) => row.clientIds));
  const totalMinutes = rows.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0);
  const telephoneRows = rows.filter((row) => row.contactKind === 'telephone');
  const fieldRows = rows.filter((row) => row.contactKind === 'field');
  const ambulatoryRows = rows.filter((row) => row.contactKind === 'ambulatory');
  const latestDate = rows.map((row) => row.date).filter(Boolean).sort().at(-1) || '';
  return {
    performanceCount: rows.length,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    telephoneCount: telephoneRows.length,
    telephoneMinutes: telephoneRows.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0),
    fieldCount: fieldRows.length,
    fieldMinutes: fieldRows.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0),
    ambulatoryCount: ambulatoryRows.length,
    ambulatoryMinutes: ambulatoryRows.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0),
    otherCount: rows.length - telephoneRows.length,
    uniqueClientCount: clientIds.size,
    latestDate
  };
}

function buildClientSupportDistribution(rows = []) {
  const minutesByClient = new Map();
  rows.forEach((row) => {
    row.clientIds.forEach((clientId) => {
      minutesByClient.set(clientId, (minutesByClient.get(clientId) || 0) + Number(row.durationMinutes || 0));
    });
  });
  const bands = [
    { key: 'under-10', label: 'Do 10 h', min: 0, max: 10, value: 0 },
    { key: '10-20', label: '10–20 h', min: 10, max: 20, value: 0 },
    { key: '20-40', label: '20–40 h', min: 20, max: 40, value: 0 },
    { key: '40-plus', label: '40+ h', min: 40, max: Infinity, value: 0 }
  ];
  minutesByClient.forEach((minutes) => {
    const hours = minutes / 60;
    const band = bands.find((item) => hours >= item.min && hours < item.max);
    if (band) band.value += 1;
  });
  return bands;
}

export {
  analyticsMetricValue,
  buildAnalyticsRows,
  buildAnalyticsSummary,
  buildClientSupportDistribution,
  filterAnalyticsRows,
  getAnalyticsContactKind,
  getAnalyticsGoalLinkKind,
  getRecordClientIds,
  groupAnalyticsByDimension,
  groupAnalyticsByMonth,
  normalizeText
};
