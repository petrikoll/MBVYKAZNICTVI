const SUPPORT_OUTPUT_HEADERS = Object.freeze([
  'Jmeno_Osoby',
  'Prijmeni_Osoby',
  'DatumNarozeni_Osoby',
  'Obec_TrvaleBydlisteOsoby',
  'CastObce_TrvaleBydlisteOsoby',
  'Ulice_TrvaleBydlisteOsoby',
  'CisloPopisne_TrvaleBydlisteOsoby',
  'CisloOrientacni_TrvaleBydlisteOsoby',
  'ZnakCislaOrientacniho_TrvaleBydlisteOsoby',
  'PSC_TrvaleBydlisteOsoby',
  'KodSpecifikace',
  'RozsahPodporyPrezencne',
  'RozsahPodporyElektronicky',
  'CenaPodpory',
  'DatumOd',
  'DatumDo',
  'Poznamka'
]);

const PERSON_IDENTITY_HEADERS = SUPPORT_OUTPUT_HEADERS.slice(0, 10);
const MBV_IS_ESF_SUPPORT_CODE = '7.1';
const MBV_IS_ESF_SUPPORT_LABEL = 'Využití sociální práce (např. ambulantní, terénní činnosti)';

const normalizeText = (value) => String(value ?? '').replace(/\u0000/g, '').trim();
const normalizeKey = (value) => normalizeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .toLowerCase();

const getRecordClientIds = (record) => (
  Array.isArray(record?.clientIds)
    ? record.clientIds.filter(Boolean)
    : record?.clientId
      ? [record.clientId]
      : []
);

function isoToCzechDate(value) {
  const match = normalizeText(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}`;
}

function normalizeDateToIso(value) {
  const text = normalizeText(value);
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(Number(isoMatch[2])).padStart(2, '0')}-${String(Number(isoMatch[3])).padStart(2, '0')}`;
  }
  const czechMatch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (czechMatch) {
    return `${czechMatch[3]}-${String(Number(czechMatch[2])).padStart(2, '0')}-${String(Number(czechMatch[1])).padStart(2, '0')}`;
  }
  return '';
}

function decimalHours(minutes) {
  return (Math.max(0, Number(minutes || 0)) / 60)
    .toFixed(1)
    .replace(/\.0$/, '')
    .replace('.', ',');
}

function timeDifferenceMinutes(startValue, endValue) {
  const parse = (value) => {
    const match = normalizeText(value).match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const start = parse(startValue);
  const end = parse(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return end - start;
}

function extractSupportMinutes(record) {
  const payload = record?.payload || {};
  const durationMinutes = Number(payload.durationMinutes);
  if (Number.isFinite(durationMinutes) && durationMinutes > 0) return Math.round(durationMinutes);
  const actualHours = Number(payload.actualHours);
  if (Number.isFinite(actualHours) && actualHours > 0) return Math.round(actualHours * 60);
  return timeDifferenceMinutes(
    payload.startTime || payload.ka02StartTime,
    payload.endTime || payload.ka02EndTime
  );
}

function isElectronicSupport(record) {
  const payload = record?.payload || {};
  const form = normalizeKey([
    payload.place,
    payload.meetingForm,
    payload.form,
    payload.consultationForm,
    payload.supportSpecific?.contactMethod
  ].filter(Boolean).join(' '));
  return ['telefon', 'online', 'e-mail', 'email', 'distanc', 'elektron']
    .some((token) => form.includes(token));
}

function duplicateKey(values) {
  return [
    values.Jmeno_Osoby,
    values.Prijmeni_Osoby,
    values.DatumNarozeni_Osoby,
    values.KodSpecifikace,
    values.DatumOd,
    values.DatumDo,
    values.RozsahPodporyPrezencne,
    values.RozsahPodporyElektronicky,
    values.Poznamka
  ].map(normalizeKey).join('|');
}

function buildIsEsfSupportExport({
  clients,
  personRows,
  records,
  reportingPeriod,
  isFirstReportingPeriod = false
}) {
  const sourceClients = Array.isArray(clients) ? clients : [];
  const sourcePersonRows = Array.isArray(personRows) ? personRows : [];
  const sourceRecords = Array.isArray(records) ? records : [];
  const personByClientId = new Map();
  const clientById = new Map();

  sourceClients.forEach((client, index) => {
    if (!client?.id) return;
    clientById.set(client.id, client);
    if (sourcePersonRows[index]) personByClientId.set(client.id, sourcePersonRows[index]);
  });

  const groupedSupports = new Map();
  sourceRecords.forEach((record, recordIndex) => {
    const minutes = extractSupportMinutes(record);
    const czechDate = isoToCzechDate(record?.activityDate);
    getRecordClientIds(record).forEach((clientId) => {
      if (!personByClientId.has(clientId)) return;
      const groupKey = `${clientId}|${MBV_IS_ESF_SUPPORT_CODE}`;
      if (!groupedSupports.has(groupKey)) {
        groupedSupports.set(groupKey, {
          clientId,
          recordIds: [],
          sourceRows: [],
          inPersonMinutes: 0,
          electronicMinutes: 0,
          dates: [],
          issues: []
        });
      }
      const group = groupedSupports.get(groupKey);
      group.recordIds.push(record?.id || '');
      group.sourceRows.push(recordIndex + 1);
      if (!czechDate) {
        group.issues.push({ severity: 'error', field: 'DatumOd', message: `Výkon ${record?.id || recordIndex + 1} nemá platné datum.` });
      } else {
        group.dates.push({ iso: String(record.activityDate).slice(0, 10), czech: czechDate });
      }
      if (minutes <= 0) {
        group.issues.push({ severity: 'error', field: 'RozsahPodporyPrezencne', message: `Výkon ${record?.id || recordIndex + 1} nemá kladnou délku podpory.` });
      } else if (isElectronicSupport(record)) {
        group.electronicMinutes += minutes;
      } else {
        group.inPersonMinutes += minutes;
      }
    });
  });

  const rows = Array.from(groupedSupports.values()).map((group) => {
    const person = personByClientId.get(group.clientId);
    const values = Object.fromEntries(SUPPORT_OUTPUT_HEADERS.map((header) => [header, '']));
    PERSON_IDENTITY_HEADERS.forEach((header) => {
      values[header] = normalizeText(person?.[header]);
    });
    values.KodSpecifikace = MBV_IS_ESF_SUPPORT_CODE;
    values.RozsahPodporyPrezencne = decimalHours(group.inPersonMinutes);
    values.RozsahPodporyElektronicky = decimalHours(group.electronicMinutes);

    const sortedDates = [...group.dates].sort((left, right) => left.iso.localeCompare(right.iso));
    const periodStart = isoToCzechDate(reportingPeriod?.start);
    const periodEnd = isoToCzechDate(reportingPeriod?.end);
    if (periodStart && periodEnd) {
      const client = clientById.get(group.clientId) || {};
      const clientEntryIso = normalizeDateToIso(
        client.datumVstupu || client.datumZarazeni || person?.VstupuDoProjektu_Osoby
      );
      values.DatumOd = isoToCzechDate(isFirstReportingPeriod ? clientEntryIso : reportingPeriod.start);
      values.DatumDo = periodEnd;
    } else {
      values.DatumOd = sortedDates[0]?.czech || '';
      values.DatumDo = sortedDates.at(-1)?.czech || '';
    }

    const issues = [...group.issues];
    if (isFirstReportingPeriod && periodStart && periodEnd && !values.DatumOd) {
      issues.push({ severity: 'error', field: 'DatumOd', message: 'Pro první monitorovací období chybí datum vstupu klienta do projektu.' });
    }
    if (!values.Jmeno_Osoby || !values.Prijmeni_Osoby || !values.DatumNarozeni_Osoby) {
      issues.push({ severity: 'error', field: 'Osoba', message: 'Chybí jednoznačná identifikace podporované osoby.' });
    }
    return {
      sourceRow: group.sourceRows.join(', '),
      clientId: group.clientId,
      recordId: group.recordIds.filter(Boolean).join(', '),
      values,
      issues,
      valid: issues.length === 0
    };
  });

  const seen = new Map();
  rows.forEach((row) => {
    const key = duplicateKey(row.values);
    if (seen.has(key)) {
      row.issues.push({ severity: 'error', field: 'Podpora', message: `Duplicitní podpora odpovídá záznamu ${seen.get(key)}.` });
      row.valid = false;
    } else {
      seen.set(key, row.recordId || row.sourceRow);
    }
  });

  return {
    headers: SUPPORT_OUTPUT_HEADERS,
    rows,
    validRows: rows.filter((row) => row.valid),
    errorCount: rows.reduce((sum, row) => sum + row.issues.length, 0),
    inPersonHours: rows.reduce((sum, row) => sum + Number(row.values.RozsahPodporyPrezencne.replace(',', '.') || 0), 0),
    electronicHours: rows.reduce((sum, row) => sum + Number(row.values.RozsahPodporyElektronicky.replace(',', '.') || 0), 0),
    supportCode: MBV_IS_ESF_SUPPORT_CODE,
    supportLabel: MBV_IS_ESF_SUPPORT_LABEL
  };
}

function escapeCsv(value, forceQuote = false) {
  const clean = String(value ?? '').replace(/\u0000/g, '');
  if (forceQuote || /[;"\r\n]/.test(clean)) return `"${clean.replace(/"/g, '""')}"`;
  return clean;
}

function serializeIsEsfSupportCsv(rows) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const lines = [
    SUPPORT_OUTPUT_HEADERS,
    ...sourceRows.map((row) => SUPPORT_OUTPUT_HEADERS.map((header) => row?.[header] || ''))
  ];
  return `\uFEFF${lines.map((row, rowIndex) => (
    row.map((value, columnIndex) => escapeCsv(value, rowIndex > 0 && columnIndex === 10)).join(';')
  )).join('\r\n')}\r\n`;
}

export {
  MBV_IS_ESF_SUPPORT_CODE,
  MBV_IS_ESF_SUPPORT_LABEL,
  SUPPORT_OUTPUT_HEADERS,
  buildIsEsfSupportExport,
  extractSupportMinutes,
  isElectronicSupport,
  serializeIsEsfSupportCsv
};
