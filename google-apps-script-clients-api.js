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
  clientFoldersRootName: 'Klientské složky - Moravský Beroun'
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
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    assertToken_(payload.token);

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
  }
}

function authorizeOnce() {
  SpreadsheetApp.openById(CONFIG.spreadsheetId).getName();
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
  'plan_id', 'klient_id', 'silne_stranky_limity', 'identifikovane_bariery_potreby',
  'cile_json', 'zaverecne_vyhodnoceni', 'accepted_plan_text', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];

const PERFORMANCE_SPECIFIC_HEADERS_ = [
  'misto_depistaze',
  'zpusob_kontaktu',
  'duvod_osloveni',
  'pomoc_nabidnuta',
  'poradenstvi_poskytnuto',
  'kontakty_predany',
  'zajem_o_spolupraci',
  'hlavni_zjistene_oblasti',
  'rizika',
  'zdroje_klienta',
  'potreby_klienta',
  'dohoda_na_dalsim_postupu',
  'tema_poradenstvi',
  'poskytnute_informace',
  'doporuceny_postup',
  'misto_vykonu',
  'ucel_navstevy',
  'reakce_klienta',
  'dohoda_na_dalsim_kontaktu',
  'druh_problemu',
  'stav_reseni',
  'domluveny_krok',
  'doporucena_navazna_sluzba',
  'typ_bytove_situace',
  'problem_v_bydleni',
  'kontaktovany_subjekt',
  'pracovni_status',
  'resene_tema_prace',
  'provedeny_krok',
  'navazny_subjekt',
  'druh_davky_rizeni',
  'stav_zadosti',
  'potrebne_doklady',
  'dalsi_krok_spec',
  'resena_oblast_rodina',
  'zapojene_osoby',
  'potreba_navazne_podpory',
  'dohoda_s_klientem',
  'resena_potreba_zdravi',
  'doporuceny_kontakt',
  'asistence_objednani',
  'dalsi_postup_zdravi',
  'kam_doprovod_probehl',
  'ucel_doprovodu',
  'vysledek_jednani',
  'instituce',
  'forma_kontaktu',
  'tema_jednani',
  'klient_pritomen',
  'typ_krize',
  'mira_akutnosti',
  'prijata_opatreni',
  'predani_navazne_pomoci',
  'vysledek_kontaktu',
  'typ_administrativy',
  'dokument_ukon',
  'provedeno_s_klientem',
  'duvod_vyhodnoceni_ukonceni',
  'dosazeny_posun',
  'nedoresene_oblasti',
  'doporuceni',
];

const PERFORMANCE_HEADERS_ = [
  'vykon_id', 'klient_id', 'datum', 'cas_od', 'cas_do', 'pocet_hodin', 'pracovnik',
  'typ_podpory', 'tema_podpory', 'specificka_pole_json',
  ...PERFORMANCE_SPECIFIC_HEADERS_,
  'forma_poskytovani', 'cil_ip_id', 'cil_ip', 'popis', 'vysledek',
  'dalsi_krok', 'dokument_text', 'document_url', 'document_error', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];

const MEETING_HEADERS_ = [
  'meeting_id', 'klient_id', 'case_management_id', 'datum', 'cas_od', 'cas_do', 'pocet_hodin',
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


function listIndividualPlans_() {
  const sheet = getOrCreateSheet_(CONFIG.individualPlanSheetName, INDIVIDUAL_PLAN_HEADERS_);
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
  const sheet = getOrCreateSheet_(CONFIG.individualPlanSheetName, INDIVIDUAL_PLAN_HEADERS_);
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
      fillMonitoringList_(existing, client);
      return existing;
    } catch (error) {
      // Když byl monitorovací list smazán nebo není dostupný, vytvoří se nový.
    }
  }

  const spreadsheet = SpreadsheetApp.create('Monitorovací list - ' + buildClientFolderName_(client));
  DriveApp.getFileById(spreadsheet.getId()).moveTo(folder);
  fillMonitoringList_(spreadsheet, client);
  return spreadsheet;
}

function fillMonitoringList_(spreadsheet, client) {
  const sheet = spreadsheet.getSheets()[0];
  sheet.setName('Monitorovací list');
  sheet.clear();

  const rows = [
    ['Monitorovací list klienta', ''],
    ['ID klienta', client.klient_id || ''],
    ['Jméno', client.jmeno || ''],
    ['Příjmení', client.prijmeni || ''],
    ['Datum narození', formatDateValue_(client.datum_narozeni)],
    ['Pohlaví', client.pohlavi || ''],
    ['Adresa', [client.ulice, client.cislo_popisne].filter(Boolean).join(' ')],
    ['Město', client.mesto || ''],
    ['PSČ', client.psc || ''],
    ['Telefon', client.telefon || ''],
    ['E-mail', client.email || ''],
    ['Datová schránka', client.datova_schranka || ''],
    ['Postavení na trhu práce', client.postaveni_na_trhu_prace || ''],
    ['Dosažené vzdělání', client.dosazene_vzdelani || ''],
    ['Typ znevýhodnění', client.znevyhodneni || ''],
    ['Datum vstupu do projektu', formatDateValue_(client.datum_vstupu_do_projektu)],
    ['Datum výstupu z projektu', formatDateValue_(client.datum_vystupu_z_projektu)],
    ['Stav klienta', client.stav_klienta || ''],
    ['Potřeba case managementu', client.case_management_potreba || 'Ne'],
    ['Důvod case managementu', client.case_management_duvod || ''],
    ['Case management od', formatDateValue_(client.case_management_od)],
    ['Poznámka', client.poznamka || ''],
    ['Vyplněno dne', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')]
  ];

  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange('A1:B1').merge().setFontWeight('bold').setFontSize(14).setBackground('#e8f0fe');
  sheet.getRange(2, 1, rows.length - 1, 1).setFontWeight('bold').setBackground('#f8fafc');
  sheet.getRange(1, 1, rows.length, 2).setBorder(true, true, true, true, true, true);
  sheet.setColumnWidth(1, 230);
  sheet.setColumnWidth(2, 420);
  sheet.getRange(1, 1, rows.length, 2).setWrap(true).setVerticalAlignment('top');
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





