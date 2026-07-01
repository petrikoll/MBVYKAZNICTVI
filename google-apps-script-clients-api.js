const CONFIG = {
  spreadsheetId: '1CWYiTn7uqaKTQklMN3WaF0BvKWjRHFag3cSjod1Amgo',
  sheetName: 'Klienti',
  partnerSheetName: 'Akteri_site',
  performanceSheetName: 'Vykony_KA1',
  meetingSheetName: 'Case_management_zapisy',
  networkMeetingSheetName: 'Schuzky_site',
  individualPlanSheetName: 'Individualni_plany',
  headerRow: 1,
  token: '',
  clientFoldersRootId: '1ZmYVNPm_ckRLCgWxpU2LXDkAYK1pM9ZX',
  clientFoldersRootName: 'Klientské složky - Moravský Beroun',
  monitoringTemplateFileId: '1xCGjTEJX0mo1aqXjGZqVBVEBxv2whubZqJ1-_jBk1w4',
  projectName: 'Podpora sociální práce v Moravském Berouně II',
  projectCode: 'CZ.03.02.01/00/25_106/0006125',
  beneficiaryName: 'Město Moravský Beroun'
};

function doGet(e) {
  try {
    assertToken_(e.parameter.token);
    if (e.parameter.action === 'listClients') {
      return json_({ ok: true, clients: listClients_() });
    }
    if (e.parameter.action === 'listPartners') {
      return json_({ ok: true, partners: listPartners_() });
    }
    if (e.parameter.action === 'listIndividualPlans') {
      return json_({ ok: true, individualPlans: listIndividualPlans_() });
    }
    if (e.parameter.action === 'listPerformances') {
      return json_({ ok: true, performances: listPerformances_() });
    }
    if (e.parameter.action === 'listMeetings') {
      return json_({ ok: true, meetings: listMeetings_() });
    }
    if (e.parameter.action === 'listNetworkMeetings') {
      return json_({ ok: true, networkMeetings: listNetworkMeetings_() });
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function doPost(e) {
  let lock = null;
  let lockAcquired = false;
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    assertToken_(payload.token);
    lock = LockService.getScriptLock();
    lock.waitLock(30000);
    lockAcquired = true;

    if (payload.action === 'saveClient') {
      const client = saveClient_(payload.client || {});
      return json_({ ok: true, client });
    }

    if (payload.action === 'savePartner') {
      const partner = savePartner_(payload.partner || {});
      return json_({ ok: true, partner });
    }

    if (payload.action === 'saveIndividualPlan') {
      const individualPlan = saveIndividualPlan_(payload.individualPlan || {});
      return json_({ ok: true, individualPlan });
    }

    if (payload.action === 'deleteIndividualPlan') {
      deleteRecord_(CONFIG.individualPlanSheetName, 'plan_id', payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'savePerformance') {
      const performance = savePerformance_(payload.performance || {});
      return json_({ ok: true, performance });
    }

    if (payload.action === 'saveMeeting') {
      const meeting = saveMeeting_(payload.meeting || {});
      return json_({ ok: true, meeting });
    }

    if (payload.action === 'deletePerformance') {
      deleteRecord_(CONFIG.performanceSheetName, 'vykon_id', payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'deleteMeeting') {
      deleteRecord_(CONFIG.meetingSheetName, 'meeting_id', payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'deletePartner') {
      deleteRecord_(CONFIG.partnerSheetName, 'partner_id', payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'deleteNetworkMeeting') {
      deleteRecord_(CONFIG.networkMeetingSheetName, 'schuzka_site_id', payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'saveNetworkMeeting') {
      const networkMeeting = saveNetworkMeeting_(payload.networkMeeting || {});
      return json_({ ok: true, networkMeeting });
    }

    if (payload.action === 'ensureClientFolder') {
      const client = ensureClientFolder_(payload.klient_id);
      return json_({ ok: true, client });
    }

    return json_({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  } finally {
    if (lockAcquired && lock) lock.releaseLock();
  }
}

function authorizeOnce() {
  SpreadsheetApp.openById(CONFIG.spreadsheetId).getName();
  if (CONFIG.monitoringTemplateFileId) DriveApp.getFileById(CONFIG.monitoringTemplateFileId).getName();
  const parent = getClientFolderParent_();
  const testFolder = parent.createFolder('__opravneni_test__');
  const testFile = SpreadsheetApp.create('__opravneni_test_mon_list__');
  DriveApp.getFileById(testFile.getId()).moveTo(testFolder);
  testFolder.setTrashed(true);
  const testDoc = DocumentApp.create('__opravneni_test_zapis__');
  DriveApp.getFileById(testDoc.getId()).setTrashed(true);
}

function getSpreadsheet_() {
  return CONFIG.spreadsheetId
    ? SpreadsheetApp.openById(CONFIG.spreadsheetId)
    : SpreadsheetApp.getActive();
}

const INDIVIDUAL_PLAN_HEADERS_ = [
  'plan_id', 'klient_id', 'popis_situace',
  'cile_json', 'zaverecne_vyhodnoceni', 'accepted_plan_text', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];

const PERFORMANCE_SPECIFIC_HEADERS_ = [
  'misto_depistaze', 'zpusob_kontaktu', 'duvod_osloveni', 'zajem_o_spolupraci',
  'hlavni_zjistene_oblasti', 'rizika', 'zdroje_klienta', 'potreby_klienta',
  'poskytnute_informace', 'doporuceny_postup', 'misto_vykonu', 'ucel_navstevy',
  'kam_doprovod', 'ucel_doprovodu', 'vysledek_doprovodu',
  'instituce', 'forma_kontaktu', 'tema_jednani', 'klient_pritomen',
  'typ_krize', 'mira_akutnosti', 'prijata_opatreni', 'predani_navazne_pomoci', 'kontaktovana_navazna_sluzba',
  'typ_administrativy', 'dokument_ukon', 'provedeno_s_klientem',
  'duvod_vyhodnoceni_ukonceni', 'dosazeny_posun', 'nedoresene_oblasti', 'doporuceni'
];

const PERFORMANCE_HEADERS_ = [
  'vykon_id', 'klient_id', 'datum', 'cas_od', 'cas_do', 'pocet_hodin', 'pracovnik',
  'typ_podpory', 'tema_podpory', 'specificka_pole_json',
  ...PERFORMANCE_SPECIFIC_HEADERS_,
  'forma_poskytovani', 'cil_ip_id', 'cil_ip', 'popis', 'vysledek',
  'dalsi_krok', 'dokument_text', 'document_url', 'document_error', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];


const KA1_SUPPORT_TYPE_OPTIONS_ = [
  'Depist\u00e1\u017e',
  'Soci\u00e1ln\u00ed \u0161et\u0159en\u00ed / mapov\u00e1n\u00ed situace',
  'Z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed',
  'Ter\u00e9nn\u00ed soci\u00e1ln\u00ed pr\u00e1ce',
  'Doprovod klienta',
  'Jedn\u00e1n\u00ed s instituc\u00ed ve prosp\u011bch klienta',
  'Krizov\u00e1 intervence',
  'Administrativa ve prosp\u011bch klienta',
  'Vyhodnocen\u00ed spolupr\u00e1ce / ukon\u010den\u00ed podpory'
];

const KA1_SUPPORT_AREA_OPTIONS_ = [
  'bydlen\u00ed', 'finance/dluhy', 'zam\u011bstn\u00e1n\u00ed', 'rodina', 'zdrav\u00ed',
  'bezpe\u010d\u00ed', 'vzd\u011bl\u00e1n\u00ed', 'slu\u017eby', 'pr\u00e1va/povinnosti', 'jin\u00e9'
];

const KA1_SERVICE_FORM_OPTIONS_ = ['ambulantn\u00ed', 'ter\u00e9nn\u00ed', 'Telefonn\u00ed'];

function syncKa01SheetStructure() {
  let sheet = getOrCreateSheet_(CONFIG.performanceSheetName, PERFORMANCE_HEADERS_);
  let headers = getHeaders_(sheet);
  for (let index = headers.length - 1; index >= 0; index -= 1) {
    if (!PERFORMANCE_HEADERS_.includes(headers[index])) sheet.deleteColumn(index + 1);
  }
  sheet = getOrCreateSheet_(CONFIG.performanceSheetName, PERFORMANCE_HEADERS_);
  headers = getHeaders_(sheet);
  setColumnListValidation_(sheet, headers, 'typ_podpory', KA1_SUPPORT_TYPE_OPTIONS_);
  setColumnListValidation_(sheet, headers, 'tema_podpory', KA1_SUPPORT_AREA_OPTIONS_);
  setColumnListValidation_(sheet, headers, 'forma_poskytovani', KA1_SERVICE_FORM_OPTIONS_);
  return {
    sheetName: sheet.getName(),
    headerCount: headers.length,
    expectedHeaderCount: PERFORMANCE_HEADERS_.length
  };
}

function setColumnListValidation_(sheet, headers, header, values) {
  const column = headers.indexOf(header) + 1;
  if (!column) throw new Error('Missing column for validation: ' + header);
  const rowCount = Math.max(sheet.getMaxRows() - CONFIG.headerRow, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(CONFIG.headerRow + 1, column, rowCount, 1).setDataValidation(rule);
}
const MEETING_HEADERS_ = [
  'meeting_id', 'klient_id', 'case_management_id', 'datum', 'cas_od', 'cas_do', 'pocet_hodin', 'pracovnik',
  'typ_podpory', 'tema_podpory', 'forma_poskytovani', 'cil_ip_id', 'cil_ip', 'partner_ids', 'partneri', 'ucastnici', 'pocet_akteru',
  'popis', 'vysledek', 'dalsi_krok', 'dokument_text', 'document_url', 'document_error', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const NETWORK_MEETING_HEADERS_ = [
  'schuzka_site_id', 'datum', 'cas_od', 'cas_do', 'typ_schuzky', 'misto', 'pracovnik',
  'partner_ids', 'rt_clenove', 'dalsi_osoby', 'partneri', 'obsah_jednani', 'vystup', 'dalsi_kroky', 'dokument_text',
  'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];

function listClients_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function saveClient_(client) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  const headers = getHeaders_(sheet);
  const klientIdColumn = headers.indexOf('klient_id') + 1;
  if (!klientIdColumn) throw new Error('Missing klient_id column');

  const now = new Date();
  const incoming = Object.assign({}, client);
  incoming.klient_id = incoming.klient_id || nextClientId_(sheet, klientIdColumn);
  const existingRow = findClientRow_(sheet, klientIdColumn, incoming.klient_id);
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  const normalized = Object.assign({}, existing, incoming);
  normalized.updated_at = now;
  normalized.updated_by = incoming.updated_by || existing.updated_by || '';
  normalized.created_at = existing.created_at || incoming.created_at || now;
  normalized.created_by = existing.created_by || incoming.created_by || '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);

  return rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
}

function listPartners_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.partnerSheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.partnerSheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function savePartner_(partner) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.partnerSheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.partnerSheetName);
  const headers = getHeaders_(sheet);
  const partnerIdColumn = headers.indexOf('partner_id') + 1;
  if (!partnerIdColumn) throw new Error('Missing partner_id column');

  const now = new Date();
  const normalized = Object.assign({}, partner);
  normalized.partner_id = normalized.partner_id || nextPartnerId_(sheet, partnerIdColumn);
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';

  const targetRow = findPartnerRow_(sheet, partnerIdColumn, normalized.partner_id) || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);

  return rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
}


function getIndividualPlanSheet_() {
  const spreadsheet = getSpreadsheet_();
  const existing = spreadsheet.getSheetByName(CONFIG.individualPlanSheetName);

  if (existing) {
    let headers = getHeaders_(existing);
    const legacySituationIndex = headers.indexOf('silne_stranky_limity');
    const situationIndex = headers.indexOf('popis_situace');

    if (legacySituationIndex >= 0) {
      if (situationIndex < 0) {
        existing.getRange(CONFIG.headerRow, legacySituationIndex + 1).setValue('popis_situace');
      } else {
        existing.deleteColumn(legacySituationIndex + 1);
      }
    }

    headers = getHeaders_(existing);
    const legacyBarriersIndex = headers.indexOf('identifikovane_bariery_potreby');
    if (legacyBarriersIndex >= 0) existing.deleteColumn(legacyBarriersIndex + 1);
  }

  return getOrCreateSheet_(CONFIG.individualPlanSheetName, INDIVIDUAL_PLAN_HEADERS_);
}

function listIndividualPlans_() {
  const sheet = getIndividualPlanSheet_();
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function saveIndividualPlan_(individualPlan) {
  const sheet = getIndividualPlanSheet_();
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('plan_id') + 1;
  if (!idColumn) throw new Error('Missing plan_id column');

  const now = new Date();
  const normalized = Object.assign({}, individualPlan);
  normalized.plan_id = normalized.plan_id || nextPrefixedId_(sheet, idColumn, 'PLAN');
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';

  const targetRow = findRowById_(sheet, idColumn, normalized.plan_id) || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);

  return rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
}

function listPerformances_() {
  const sheet = getOrCreateSheet_(CONFIG.performanceSheetName, PERFORMANCE_HEADERS_);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function savePerformance_(performance) {
  const sheet = getOrCreateSheet_(CONFIG.performanceSheetName, PERFORMANCE_HEADERS_);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('vykon_id') + 1;
  if (!idColumn) throw new Error('Missing vykon_id column');

  const now = new Date();
  const normalized = Object.assign({}, performance);
  normalized.vykon_id = normalized.vykon_id || nextPrefixedId_(sheet, idColumn, 'VYKON');
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';
  try {
    normalized.document_url = upsertClientRecordDocument_(normalized, 'KA1-Individu\u00e1ln\u00ed podpora', normalized.typ_podpory || 'Z\u00e1pis v\u00fdkonu', normalized.document_url);
  } catch (error) {
    normalized.document_error = String(error.message || error);
  }


  const targetRow = findRowById_(sheet, idColumn, normalized.vykon_id) || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);

  return rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
}

function listMeetings_() {
  const sheet = getOrCreateSheet_(CONFIG.meetingSheetName, MEETING_HEADERS_);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}

function deleteRecord_(sheetName, idHeader, id) {
  if (!id) throw new Error('Missing id');
  const sheet = getOrCreateSheet_(sheetName, []);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf(idHeader) + 1;
  if (!idColumn) throw new Error('Missing ' + idHeader + ' column');
  const targetRow = findRowById_(sheet, idColumn, id);
  if (!targetRow) throw new Error('Record not found: ' + id);
  sheet.deleteRow(targetRow);
}

function saveMeeting_(meeting) {
  const sheet = getOrCreateSheet_(CONFIG.meetingSheetName, MEETING_HEADERS_);
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('meeting_id') + 1;
  if (!idColumn) throw new Error('Missing meeting_id column');

  const now = new Date();
  const normalized = Object.assign({}, meeting);
  normalized.meeting_id = normalized.meeting_id || nextPrefixedId_(sheet, idColumn, 'SETKANI');
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';
  try {
    normalized.document_url = upsertClientRecordDocument_(normalized, 'KA2-Case management', normalized.typ_podpory || 'Z\u00e1pis case managementu', normalized.document_url);
  } catch (error) {
    normalized.document_error = String(error.message || error);
  }


  const targetRow = findRowById_(sheet, idColumn, normalized.meeting_id) || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);

  return rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
}

function listNetworkMeetings_() {
  const sheet = getOrCreateSheet_(CONFIG.networkMeetingSheetName, NETWORK_MEETING_HEADERS_);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  const range = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  return values
    .map((row, index) => ({ row: row, displayRow: displayValues[index] }))
    .filter((item) => item.row.some((cell) => cell !== ''))
    .map((item) => rowToObject_(headers, item.row, item.displayRow));
}

function saveNetworkMeeting_(networkMeeting) {
  const sheet = getOrCreateSheet_(CONFIG.networkMeetingSheetName, NETWORK_MEETING_HEADERS_);
  const headers = getHeaders_(sheet);
  const meetingIdColumn = headers.indexOf('schuzka_site_id') + 1;
  if (!meetingIdColumn) throw new Error('Missing schuzka_site_id column');

  const now = new Date();
  const normalized = Object.assign({}, networkMeeting);
  normalized.schuzka_site_id = normalized.schuzka_site_id || nextNetworkMeetingId_(sheet, meetingIdColumn);
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';

  const targetRow = findNetworkMeetingRow_(sheet, meetingIdColumn, normalized.schuzka_site_id) || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  const savedRange = sheet.getRange(targetRow, 1, 1, headers.length);
  savedRange.setValues([values]);

  return rowToObject_(headers, savedRange.getValues()[0], savedRange.getDisplayValues()[0]);
}

function upsertClientRecordDocument_(record, activityName, recordType, currentUrl) {
  if (!record.klient_id || !record.dokument_text) return currentUrl || '';

  const clientContext = getClientDocumentContext_(record.klient_id);
  const title = buildRecordDocumentTitle_(record, activityName, recordType);
  const currentId = extractDriveId_(currentUrl);
  let doc;

  if (currentId) {
    try {
      doc = DocumentApp.openById(currentId);
      doc.setName(title);
    } catch (error) {
      doc = null;
    }
  }

  if (!doc) {
    doc = DocumentApp.create(title);
    DriveApp.getFileById(doc.getId()).moveTo(clientContext.folder);
  }

  fillRecordDocument_(doc, clientContext.client, record, activityName, recordType);
  return doc.getUrl();
}

function getClientDocumentContext_(klientId) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  let headers = getHeaders_(sheet);
  const klientIdColumn = headers.indexOf('klient_id') + 1;
  if (!klientIdColumn) throw new Error('Missing klient_id column');
  const folderUrlColumn = ensureHeader_(sheet, headers, 'drive_folder_url');
  headers = getHeaders_(sheet);
  const targetRow = findClientRow_(sheet, klientIdColumn, klientId);
  if (!targetRow) throw new Error('Client not found: ' + klientId);

  const client = rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
  const folder = getOrCreateClientFolder_(client, sheet.getRange(targetRow, folderUrlColumn).getValue());
  const refreshedHeaders = getHeaders_(sheet);
  sheet.getRange(targetRow, refreshedHeaders.indexOf('drive_folder_url') + 1).setValue(folder.getUrl());
  return { client, folder };
}

function buildRecordDocumentTitle_(record, activityName, recordType) {
  const date = formatDateValue_(record.datum) || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const id = record.vykon_id || record.meeting_id || 'zaznam';
  return sanitizeFileName_([date, record.klient_id, activityName, recordType, id].filter(Boolean).join(' - '));
}

function fillRecordDocument_(doc, client, record, activityName, recordType) {
  const body = doc.getBody();
  body.clear();
  body.appendParagraph(activityName).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(recordType || 'Z\u00e1pis').setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const meta = [
    ['Projekt', 'Podpora soci\u00e1ln\u00ed pr\u00e1ce v Moravsk\u00e9m Beroun\u011b II.'],
    ['Klient ID', record.klient_id || ''],
    ['Klient', [client.jmeno, client.prijmeni].filter(Boolean).join(' ')],
    ['Datum', formatDateValue_(record.datum)],
    ['\u010cas', [record.cas_od, record.cas_do].filter(Boolean).join(' - ')],
    ['Po\u010det hodin', record.pocet_hodin || ''],
    ['Pracovn\u00edk', record.pracovnik || ''],
    ['Stav', record.status || 'Platn\u00fd']
  ].filter(function(row) { return row[1] !== ''; });

  const table = body.appendTable(meta);
  for (let i = 0; i < table.getNumRows(); i++) {
    table.getRow(i).getCell(0).editAsText().setBold(true);
  }

  body.appendParagraph('Text z\u00e1pisu').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  String(record.dokument_text || '').split('\n').forEach(function(line) {
    body.appendParagraph(line || ' ');
  });
  doc.saveAndClose();
}

function ensureClientFolder_(klientId) {
  if (!klientId) throw new Error('Missing klient_id');

  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  let headers = getHeaders_(sheet);
  const klientIdColumn = headers.indexOf('klient_id') + 1;
  const folderUrlColumn = ensureHeader_(sheet, headers, 'drive_folder_url');
  headers = getHeaders_(sheet);
  const monitoringUrlColumn = ensureHeader_(sheet, headers, 'monitoring_list_url');
  headers = getHeaders_(sheet);

  const targetRow = findClientRow_(sheet, klientIdColumn, klientId);
  if (!targetRow) throw new Error('Client not found: ' + klientId);

  const row = rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
  const folder = getOrCreateClientFolder_(row, sheet.getRange(targetRow, folderUrlColumn).getValue());
  const monitoringList = getOrCreateMonitoringList_(folder, row, sheet.getRange(targetRow, monitoringUrlColumn).getValue());

  const now = new Date();
  const refreshedHeaders = getHeaders_(sheet);
  sheet.getRange(targetRow, refreshedHeaders.indexOf('drive_folder_url') + 1).setValue(folder.getUrl());
  sheet.getRange(targetRow, refreshedHeaders.indexOf('monitoring_list_url') + 1).setValue(monitoringList.getUrl());
  if (refreshedHeaders.indexOf('updated_at') !== -1) sheet.getRange(targetRow, refreshedHeaders.indexOf('updated_at') + 1).setValue(now);
  if (refreshedHeaders.indexOf('updated_by') !== -1) sheet.getRange(targetRow, refreshedHeaders.indexOf('updated_by') + 1).setValue('');

  return rowToObject_(refreshedHeaders, sheet.getRange(targetRow, 1, 1, refreshedHeaders.length).getValues()[0]);
}

function getOrCreateClientFolder_(client, currentUrl) {
  const currentId = extractDriveId_(currentUrl);
  if (currentId) {
    try {
      return DriveApp.getFolderById(currentId);
    } catch (error) {
      // Když byla složka mezitím smazána nebo není dostupná, vytvoří se nová.
    }
  }

  return getClientFolderParent_().createFolder(buildClientFolderName_(client));
}

function getOrCreateMonitoringList_(folder, client, currentUrl) {
  const currentId = extractDriveId_(currentUrl);
  if (currentId) {
    try {
      const existing = SpreadsheetApp.openById(currentId);
      if (findMonitoringSheet_(existing)) {
        fillMonitoringList_(existing, client);
        return existing;
      }
    } catch (error) {
      // Nedostupny nebo smazany soubor se nahradi novou kopii sablony.
    }
  }

  return copyMonitoringTemplate_(folder, client);
}

function copyMonitoringTemplate_(folder, client) {
  if (!CONFIG.monitoringTemplateFileId) throw new Error('Není nastaveno ID šablony MON listu.');

  let template;
  try {
    template = DriveApp.getFileById(CONFIG.monitoringTemplateFileId);
  } catch (error) {
    throw new Error('Šablona MON listu není dostupná účtu, pod kterým je Apps Script nasazen. Nasdílejte soubor ' + CONFIG.monitoringTemplateFileId + ' tomuto účtu.');
  }

  const clientName = [client.jmeno, client.prijmeni].filter(Boolean).join(' ').trim() || client.klient_id || 'Klient';
  const targetName = sanitizeFileName_('MON list - ' + clientName);
  const copy = template.makeCopy(targetName, folder);
  copy.setDescription(JSON.stringify({
    projectName: CONFIG.projectName,
    projectCode: CONFIG.projectCode,
    generatedFromTemplateId: CONFIG.monitoringTemplateFileId
  }, null, 2));

  const spreadsheet = SpreadsheetApp.openById(copy.getId());
  fillMonitoringList_(spreadsheet, client);
  return spreadsheet;
}

function fillMonitoringList_(spreadsheet, client) {
  const sheet = findMonitoringSheet_(spreadsheet);
  if (!sheet) throw new Error('Zkopírovaná šablona neobsahuje list Monitorovací list.');

  const directValues = {
    C3: CONFIG.projectCode || "",
    C4: CONFIG.projectName || "",
    C5: CONFIG.beneficiaryName || "",
    C7: client.jmeno || "",
    C8: client.prijmeni || "",
    C9: formatDateValue_(client.datum_narozeni),
    C11: client.ulice || "",
    C12: client.mesto || "",
    C13: client.cislo_popisne || "",
    C14: client.psc || "",
    C15: [client.email, client.datova_schranka].filter(Boolean).join(' / '),
    C16: client.telefon || "",
    C17: client.spadove_mesto || "",
    C18: client.pohlavi || "",
    C19: client.postaveni_na_trhu_prace || "",
    C20: client.dosazene_vzdelani || "",
    C21: client.znevyhodneni || ""
  };

  Object.keys(directValues).forEach(function(cell) {
    sheet.getRange(cell).setValue(directValues[cell]);
  });

  const replacements = buildMonitoringReplacements_(client);
  spreadsheet.getSheets().forEach(function(targetSheet) {
    Object.keys(replacements).forEach(function(placeholder) {
      targetSheet.createTextFinder(placeholder).matchCase(true).replaceAllWith(replacements[placeholder] || "");
    });
  });
  SpreadsheetApp.flush();
}

function buildMonitoringReplacements_(client) {
  const address = [client.ulice, client.cislo_popisne].filter(Boolean).join(' ').trim();
  const addressLine = [address, client.psc, client.mesto].filter(Boolean).join(', ');
  return {
    '{{PROJECT_NAME}}': CONFIG.projectName || '',
    '{{PROJECT_CODE}}': CONFIG.projectCode || '',
    '{{BENEFICIARY_NAME}}': CONFIG.beneficiaryName || '',
    '{{CLIENT_NAME}}': [client.jmeno, client.prijmeni].filter(Boolean).join(' '),
    '{{CLIENT_ID}}': client.klient_id || '',
    '{{CLIENT_FIRST_NAME}}': client.jmeno || '',
    '{{CLIENT_LAST_NAME}}': client.prijmeni || '',
    '{{CLIENT_BIRTH_DATE}}': formatDateValue_(client.datum_narozeni),
    '{{CLIENT_ADDRESS}}': addressLine,
    '{{CLIENT_STREET}}': client.ulice || '',
    '{{CLIENT_CITY}}': client.mesto || '',
    '{{CLIENT_POSTAL_CODE}}': client.psc || '',
    '{{CLIENT_HOUSE_NUMBER}}': client.cislo_popisne || '',
    '{{CLIENT_GENDER}}': client.pohlavi || '',
    '{{CLIENT_LABOUR_STATUS}}': client.postaveni_na_trhu_prace || '',
    '{{CLIENT_EDUCATION}}': client.dosazene_vzdelani || '',
    '{{CLIENT_DISADVANTAGE}}': client.znevyhodneni || '',
    '{{CLIENT_PHONE}}': client.telefon || '',
    '{{CLIENT_EMAIL}}': client.email || ''
  };
}

function findMonitoringSheet_(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  for (let index = 0; index < sheets.length; index += 1) {
    const candidate = sheets[index];
    const header = String(candidate.getRange('B1').getDisplayValue() || '').toLowerCase();
    if (header.includes('monitorovaci list') || header.includes('monitorovací list')) return candidate;
  }
  return null;
}

function getClientFolderParent_() {
  if (CONFIG.clientFoldersRootId) return DriveApp.getFolderById(CONFIG.clientFoldersRootId);

  const existing = DriveApp.getFoldersByName(CONFIG.clientFoldersRootName);
  return existing.hasNext() ? existing.next() : DriveApp.createFolder(CONFIG.clientFoldersRootName);
}

function buildClientFolderName_(client) {
  return sanitizeFileName_([client.klient_id, client.prijmeni, client.jmeno].filter(Boolean).join(' - '));
}

function sanitizeFileName_(value) {
  return String(value || 'Klient').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

function extractDriveId_(url) {
  const match = String(url || '').match(/[-\w]{25,}/);
  return match ? match[0] : '';
}

function formatDateValue_(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(value).slice(0, 10);
}

function ensureHeader_(sheet, headers, header) {
  const existingIndex = headers.indexOf(header);
  if (existingIndex !== -1) return existingIndex + 1;

  const nextColumn = headers.length + 1;
  if (sheet.getMaxColumns() < nextColumn) sheet.insertColumnAfter(sheet.getMaxColumns());
  sheet.getRange(CONFIG.headerRow, nextColumn).setValue(header);
  return nextColumn;
}

function getOrCreateSheet_(sheetName, headers) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(CONFIG.headerRow, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(CONFIG.headerRow);
    return sheet;
  }

  const currentHeaders = getHeaders_(sheet);
  if (currentHeaders.length === 0) {
    sheet.getRange(CONFIG.headerRow, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(CONFIG.headerRow);
    return sheet;
  }

  headers.forEach((header) => ensureHeader_(sheet, getHeaders_(sheet), header));
  return sheet;
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];
  return sheet.getRange(CONFIG.headerRow, 1, 1, lastColumn).getValues()[0].filter(Boolean);
}

function rowToObject_(headers, row, displayRow) {
  return headers.reduce((acc, header, index) => {
    const value = row[index];
    if ((header === 'cas_od' || header === 'cas_do') && displayRow && displayRow[index]) {
      acc[header] = displayRow[index];
    } else if (value instanceof Date) {
      acc[header] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      acc[header] = value;
    }
    return acc;
  }, {});
}

function findClientRow_(sheet, klientIdColumn, klientId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, klientIdColumn, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row) => row[0] === klientId);
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function nextClientId_(sheet, klientIdColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return 'KLIENT-0001';
  const values = sheet.getRange(CONFIG.headerRow + 1, klientIdColumn, lastRow - CONFIG.headerRow, 1).getValues().flat();
  const max = values.reduce((highest, value) => {
    const number = Number(String(value || '').replace('KLIENT-', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `KLIENT-${String(max + 1).padStart(4, '0')}`;
}

function findPartnerRow_(sheet, partnerIdColumn, partnerId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, partnerIdColumn, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row) => row[0] === partnerId);
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function nextPartnerId_(sheet, partnerIdColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return 'PARTNER-0001';
  const values = sheet.getRange(CONFIG.headerRow + 1, partnerIdColumn, lastRow - CONFIG.headerRow, 1).getValues().flat();
  const max = values.reduce((highest, value) => {
    const number = Number(String(value || '').replace('PARTNER-', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `PARTNER-${String(max + 1).padStart(4, '0')}`;
}


function findNetworkMeetingRow_(sheet, meetingIdColumn, meetingId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, meetingIdColumn, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row) => row[0] === meetingId);
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function nextNetworkMeetingId_(sheet, meetingIdColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return 'SCHUZKA-SITE-0001';
  const values = sheet.getRange(CONFIG.headerRow + 1, meetingIdColumn, lastRow - CONFIG.headerRow, 1).getValues().flat();
  const max = values.reduce((highest, value) => {
    const number = Number(String(value || '').replace('SCHUZKA-SITE-', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `SCHUZKA-SITE-${String(max + 1).padStart(4, '0')}`;
}

function findRowById_(sheet, idColumn, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, idColumn, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row) => row[0] === id);
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function nextPrefixedId_(sheet, idColumn, prefix) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return prefix + '-0001';
  const values = sheet.getRange(CONFIG.headerRow + 1, idColumn, lastRow - CONFIG.headerRow, 1).getValues().flat();
  const max = values.reduce((highest, value) => {
    const number = Number(String(value || '').replace(prefix + '-', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return prefix + '-' + String(max + 1).padStart(4, '0');
}

function assertToken_(token) {
  if (CONFIG.token && token !== CONFIG.token) throw new Error('Invalid token');
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}





