const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const getClientIds = (record) => (
  Array.isArray(record?.clientIds)
    ? record.clientIds.filter(Boolean)
    : record?.clientId
      ? [record.clientId]
      : []
);

const isTelephoneRecord = (record) => normalize(record?.payload?.place).includes('telefon');

const roundHours = (minutes) => Math.round((Number(minutes || 0) / 60) * 100) / 100;

const excelDateFromIso = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || '';
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
};

function buildDetailedOutputRows(records = [], clients = []) {
  const clientIndex = new Map(clients.map((client) => [client.id, client]));
  const detailedRows = records.map((record) => {
    const payload = record.payload || {};
    const clientNames = getClientIds(record).map((clientId) => (
      clientIndex.get(clientId)?.fullName || record.clientName || clientId
    ));
    return {
      date: record.activityDate || '',
      startTime: payload.startTime || payload.ka02StartTime || '',
      endTime: payload.endTime || payload.ka02EndTime || '',
      durationHours: roundHours(payload.durationMinutes),
      ka: record.ka || '',
      worker: record.worker || '',
      clients: clientNames.join(', '),
      consultationType: payload.consultationType || record.title || '',
      supportArea: payload.supportArea || '',
      deliveryForm: payload.place || '',
      linkedGoal: payload.linkedPlanGoalLabel || record.linkedPlanGoalLabel || '',
      description: payload.topics || '',
      outcome: payload.outcome || '',
      nextSteps: payload.nextSteps || '',
      outreachComment: payload.supportSpecific?.physicalRecordComment || '',
      partners: Array.isArray(payload.partnerNames) ? payload.partnerNames.join(', ') : payload.partners || '',
      documentText: record.documentText || ''
    };
  });

  const summaries = new Map();
  records.forEach((record) => {
    const minutes = Number(record.payload?.durationMinutes || 0);
    const telephone = isTelephoneRecord(record);
    getClientIds(record).forEach((clientId) => {
      if (!summaries.has(clientId)) {
        const client = clientIndex.get(clientId);
        summaries.set(clientId, {
          clientId,
          clientName: client?.fullName || record.clientName || clientId,
          totalCount: 0,
          totalMinutes: 0,
          telephoneCount: 0,
          telephoneMinutes: 0,
          otherCount: 0,
          otherMinutes: 0
        });
      }
      const summary = summaries.get(clientId);
      summary.totalCount += 1;
      summary.totalMinutes += minutes;
      if (telephone) {
        summary.telephoneCount += 1;
        summary.telephoneMinutes += minutes;
      } else {
        summary.otherCount += 1;
        summary.otherMinutes += minutes;
      }
    });
  });

  const clientRows = Array.from(summaries.values())
    .map((item) => ({
      clientId: item.clientId,
      clientName: item.clientName,
      totalCount: item.totalCount,
      totalHours: roundHours(item.totalMinutes),
      telephoneCount: item.telephoneCount,
      telephoneHours: roundHours(item.telephoneMinutes),
      otherCount: item.otherCount,
      otherHours: roundHours(item.otherMinutes)
    }))
    .sort((left, right) => left.clientName.localeCompare(right.clientName, 'cs'));

  return { detailedRows, clientRows };
}

const styleWorksheet = (sheet, widths) => {
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: widths.length } };
  sheet.getRow(1).height = 24;
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
  sheet.getRow(2).font = { italic: true, color: { argb: 'FF475569' } };
  const header = sheet.getRow(4);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.height = 30;
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return;
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    }
  });
  sheet.pageSetup = {
    paperSize: 9,
    orientation: widths.length > 6 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    printArea: `A1:${sheet.getColumn(widths.length).letter}${Math.max(sheet.rowCount, 4)}`,
    printTitlesRow: '1:4'
  };
  sheet.properties.pageSetUpPr = { fitToPage: true, autoPageBreaks: false };
};

function addTitle(sheet, title, filterLabel, columnCount) {
  sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, columnCount);
  sheet.addRow([filterLabel]);
  sheet.mergeCells(2, 1, 2, columnCount);
  sheet.addRow([]);
}

async function buildDetailedOutputsXlsx({ records = [], clients = [], filterLabel = '' } = {}) {
  const ExcelModule = await import('exceljs');
  const ExcelJS = ExcelModule.default || ExcelModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MB VÝKAZNICTVÍ';
  workbook.created = new Date();
  workbook.modified = new Date();

  const { detailedRows, clientRows } = buildDetailedOutputRows(records, clients);

  const detailSheet = workbook.addWorksheet('Podrobné výkony');
  const detailHeaders = [
    'Datum', 'Čas od', 'Čas do', 'Délka (hod.)', 'KA', 'Pracovník', 'Klient',
    'Typ podpory', 'Oblast podpory', 'Forma poskytování', 'Cíl IP', 'Popis',
    'Výsledek', 'Další krok', 'Komentář k depistáži', 'Partneři / účastníci', 'Text zápisu'
  ];
  addTitle(detailSheet, 'Podrobný přehled výkonů', filterLabel, detailHeaders.length);
  detailSheet.addRow(detailHeaders);
  detailedRows.forEach((row) => detailSheet.addRow([
    excelDateFromIso(row.date), row.startTime, row.endTime, row.durationHours, row.ka, row.worker, row.clients,
    row.consultationType, row.supportArea, row.deliveryForm, row.linkedGoal, row.description,
    row.outcome, row.nextSteps, row.outreachComment, row.partners, row.documentText
  ]));
  styleWorksheet(detailSheet, [12, 9, 9, 12, 8, 24, 28, 28, 20, 19, 28, 42, 38, 38, 38, 38, 60]);
  detailSheet.getColumn(1).numFmt = 'dd.mm.yyyy';
  detailSheet.getColumn(4).numFmt = '0.00';

  const clientSheet = workbook.addWorksheet('Klienti a podpora');
  const clientHeaders = [
    'ID klienta', 'Klient', 'Výkony celkem', 'Hodiny celkem',
    'Telefonické výkony', 'Telefonické hodiny', 'Ostatní výkony', 'Ostatní hodiny'
  ];
  addTitle(clientSheet, 'Klienti a rozsah podpory', filterLabel, clientHeaders.length);
  clientSheet.addRow(clientHeaders);
  clientRows.forEach((row) => clientSheet.addRow([
    row.clientId, row.clientName, row.totalCount, row.totalHours,
    row.telephoneCount, row.telephoneHours, row.otherCount, row.otherHours
  ]));
  styleWorksheet(clientSheet, [18, 30, 16, 16, 20, 20, 17, 17]);
  [4, 6, 8].forEach((column) => { clientSheet.getColumn(column).numFmt = '0.00'; });

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    performanceCount: detailedRows.length,
    clientCount: clientRows.length
  };
}

export { buildDetailedOutputRows, buildDetailedOutputsXlsx, isTelephoneRecord };
