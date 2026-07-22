const CONFIG = {
  spreadsheetId: '1q12w3YJ1CaEaJJEWq54y4Q-NLvuqc5qZ1SbVV8sFZh0',
  sheetName: 'Klienti',
  partnerSheetName: 'Akteri_site',
  performanceSheetName: 'Vykony_KA1',
  meetingSheetName: 'Case_management_zapisy',
  networkMeetingSheetName: 'Schuzky_site',
  educationSheetName: 'Vzdelavani',
  supervisionSheetName: 'Supervize',
  statisticsSheetName: 'Statistiky',
  individualPlanSheetName: 'Individualni_plany',
  headerRow: 1,
  clientFoldersRootId: '1ZmYVNPm_ckRLCgWxpU2LXDkAYK1pM9ZX',
  clientFoldersRootName: 'Klientské složky - Moravský Beroun',
  backupFolderId: '',
  backupFolderName: 'Zálohy - Moravský Beroun',
  backupRetentionCount: 12,
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
    if (e.parameter.action === 'listEducation') {
      return json_({ ok: true, education: listEducation_() });
    }
    if (e.parameter.action === 'listSupervision') {
      return json_({ ok: true, supervision: listSupervision_() });
    }
    if (e.parameter.action === 'listStatistics') {
      return json_({ ok: true, statistics: listStatistics_() });
    }
    if (e.parameter.action === 'getBackupStatus') {
      return json_({ ok: true, backup: getBackupStatus_() });
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
      deactivatePerformanceStatistics_(payload.id);
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

    if (payload.action === 'saveEducation') {
      const education = saveEducation_(payload.education || {});
      return json_({ ok: true, education });
    }

    if (payload.action === 'deleteEducation') {
      deleteRecord_(CONFIG.educationSheetName, 'vzdelavani_id', payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'saveSupervision') {
      const supervision = saveSupervision_(payload.supervision || {});
      return json_({ ok: true, supervision });
    }

    if (payload.action === 'deleteSupervision') {
      deleteRecord_(CONFIG.supervisionSheetName, 'sepervize_id', payload.id);
      return json_({ ok: true });
    }

    if (payload.action === 'ensureClientFolder') {
      const client = ensureClientFolder_(payload.klient_id);
      return json_({ ok: true, client });
    }

    if (payload.action === 'startFullBackup') {
      assertBackupManager_(payload.requested_by);
      return json_({ ok: true, backup: queueFullBackup_(payload.requested_by || '') });
    }

    if (payload.action === 'installWeeklyBackup') {
      assertBackupManager_(payload.requested_by);
      return json_({ ok: true, backup: installWeeklyBackupTrigger_() });
    }

    return json_({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  } finally {
    if (lockAcquired && lock) lock.releaseLock();
  }
}

function authorizeOnce() {
  authorizeBackupTriggers();
  SpreadsheetApp.openById(CONFIG.spreadsheetId).getName();
  if (CONFIG.monitoringTemplateFileId) DriveApp.getFileById(CONFIG.monitoringTemplateFileId).getName();
  const parent = getClientFolderParent_();
  const testFolder = parent.createFolder('__opravneni_test__');
  const testFile = SpreadsheetApp.create('__opravneni_test_mon_list__');
  DriveApp.getFileById(testFile.getId()).moveTo(testFolder);
  testFolder.setTrashed(true);
  const testDoc = DocumentApp.create('__opravneni_test_zapis__');
  DriveApp.getFileById(testDoc.getId()).setTrashed(true);
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + CONFIG.spreadsheetId + '?fields=id', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
}

// Spusťte jednou ručně v editoru Apps Scriptu po přidání zálohování.
// Google následně zobrazí dialog pro oprávnění ke správě časových triggerů.
function authorizeBackupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log('Oprávnění pro automatické zálohy je aktivní. Počet triggerů: ' + triggers.length);
  return triggers.length;
}

function getSpreadsheet_() {
  return CONFIG.spreadsheetId
    ? SpreadsheetApp.openById(CONFIG.spreadsheetId)
    : SpreadsheetApp.getActive();
}

const INDIVIDUAL_PLAN_HEADERS_ = [
  'plan_id', 'klient_id', 'popis_situace',
  'cile_json', 'zaverecne_vyhodnoceni', 'accepted_plan_text', 'pocet_minut', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];

const PERFORMANCE_SPECIFIC_HEADERS_ = [
  'misto_depistaze', 'zpusob_kontaktu', 'zajem_o_spolupraci', 'zapis_fyzicky_podepsan_zalozen',
  'hlavni_zjistene_oblasti', 'rizika', 'zdroje_klienta', 'potreby_klienta',
  'poskytnute_informace', 'doporuceny_postup', 'misto_vykonu', 'ucel_navstevy',
  'kam_doprovod', 'ucel_doprovodu', 'vysledek_doprovodu',
  'typ_krize', 'mira_akutnosti', 'prijata_opatreni', 'predani_navazne_pomoci', 'kontaktovana_navazna_sluzba',
  'duvod_vyhodnoceni_ukonceni', 'dosazeny_posun', 'nedoresene_oblasti', 'doporuceni'
];

const PERFORMANCE_HEADERS_ = [
  'vykon_id', 'klient_id', 'datum', 'cas_od', 'cas_do', 'pocet_hodin', 'pracovnik',
  'typ_podpory', 'tema_podpory', 'specificka_pole_json',
  ...PERFORMANCE_SPECIFIC_HEADERS_,
  'forma_poskytovani', 'cil_ip_id', 'cil_ip', 'popis', 'vysledek',
  'dalsi_krok', 'dokument_text', 'document_url', 'document_error', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const STATISTICS_HEADERS_ = [
  'statistika_id', 'zdrojovy_zaznam_id', 'client_id', 'client_name', 'datum', 'obdobi', 'typ_statistiky',
  'kod', 'skupina', 'nazev', 'hodnota_text', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const KU_SUPPORT_STAT_TYPE_ = 'FORMA_POMOCI_KU';
const KU_SUPPORT_DEFAULT_CODE_ = 'NONE';
const KU_SUPPORT_TYPES_ = [
  { code: 'DAVKY_SUPERDAVKA', group: 'Dávky', name: 'Dávka státní sociální pomoci – superdávka' },
  { code: 'DAVKY_MIMORADNA_OKAMZITA_POMOC', group: 'Dávky', name: 'Mimořádná okamžitá pomoc' },
  { code: 'DAVKY_PRISPEVEK_NA_PECI', group: 'Dávky', name: 'Příspěvek na péči' },
  { code: 'DAVKY_PRISPEVEK_NA_MOBILITU', group: 'Dávky', name: 'Příspěvek na mobilitu' },
  { code: 'DAVKY_JINE', group: 'Dávky', name: 'Jiné' },
  { code: 'DUCHODY_STAROBNI_DUCHOD', group: 'Důchody a pojištění', name: 'Starobní důchod' },
  { code: 'DUCHODY_INVALIDNI_DUCHOD', group: 'Důchody a pojištění', name: 'Invalidní důchod' },
  { code: 'DUCHODY_DUCHODOVE_POJISTENI', group: 'Důchody a pojištění', name: 'Důchodové pojištění' },
  { code: 'BYDLENI_SOCIALNI_OBECNI_BYT', group: 'Bydlení', name: 'Sociální nebo obecní byt' },
  { code: 'BYDLENI_JINE_RESENI', group: 'Bydlení', name: 'Jiné řešení bydlení' },
  { code: 'ZDRAVOTNI_KOMPENZACNI_POMUCKY', group: 'Zdravotní a kompenzační podpora', name: 'Kompenzační pomůcky' },
  { code: 'ZDRAVOTNI_ZTP_TP', group: 'Zdravotní a kompenzační podpora', name: 'ZTP, TP' },
  { code: 'ZDRAVOTNI_PREVOZOVA_SLUZBA', group: 'Zdravotní a kompenzační podpora', name: 'Převozová služba' },
  { code: 'ZDRAVOTNI_POBYTOVA_SLUZBA_LDN', group: 'Zdravotní a kompenzační podpora', name: 'Pobytová služba / LDN' },
  { code: 'ZDRAVOTNI_HOSPIC_PALIATIVNI_PECE', group: 'Zdravotní a kompenzační podpora', name: 'Hospic / paliativní péče' },
  { code: 'SOCIALNI_SLUZBY_PECOVATELSKA', group: 'Sociální služby', name: 'Pečovatelská služba' },
  { code: 'SOCIALNI_SLUZBY_SAS_RODINY', group: 'Sociální služby', name: 'SAS pro rodiny s dětmi' },
  { code: 'SOCIALNI_SLUZBY_RANA_PECE', group: 'Sociální služby', name: 'Raná péče' },
  { code: 'SOCIALNI_SLUZBY_CDZ', group: 'Sociální služby', name: 'Centrum duševního zdraví' },
  { code: 'SOCIALNI_SLUZBY_DLUHOVA_PORADNA', group: 'Sociální služby', name: 'Dluhová poradna' },
  { code: 'SOCIALNI_SLUZBY_OBCANSKO_PRAVNI_PORADNA', group: 'Sociální služby', name: 'Občansko-právní poradna' },
  { code: 'MATERIALNI_POTRAVINOVA_POMOC', group: 'Materiální a humanitární pomoc', name: 'Potravinová pomoc' },
  { code: 'MATERIALNI_OSACENI', group: 'Materiální a humanitární pomoc', name: 'Ošacení' },
  { code: 'MATERIALNI_HUMANITARNI_POMOC_UA', group: 'Materiální a humanitární pomoc', name: 'Humanitární pomoc UA' },
  { code: 'RODINA_OSPOD', group: 'Rodina, děti a ochrana práv', name: 'OSPOD' },
  { code: 'RODINA_SKOLNI_DOCHAZKA', group: 'Rodina, děti a ochrana práv', name: 'Školní docházka / podnět ZŠ nebo MŠ' },
  { code: 'RODINA_RODINNE_PRAVO', group: 'Rodina, děti a ochrana práv', name: 'Rodinné právo' },
  { code: 'RODINA_OMEZENI_SVEPRAVNOSTI', group: 'Rodina, děti a ochrana práv', name: 'Omezení svéprávnosti' },
  { code: 'OSTATNI_JINE', group: 'Ostatní', name: 'Jiné' }
];


const KA1_SUPPORT_TYPE_OPTIONS_ = [
  'Depist\u00e1\u017e',
  'Soci\u00e1ln\u00ed \u0161et\u0159en\u00ed / mapov\u00e1n\u00ed situace',
  'Z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed',
  'Ter\u00e9nn\u00ed soci\u00e1ln\u00ed pr\u00e1ce',
  'Doprovod klienta',
  'Odborné sociální poradenství',
  'Krizov\u00e1 intervence',
  'Vyhodnocen\u00ed spolupr\u00e1ce / ukon\u010den\u00ed podpory'
];

const KA1_SUPPORT_AREA_OPTIONS_ = [
  'bydlen\u00ed', 'finance/dluhy', 'zam\u011bstn\u00e1n\u00ed', 'rodina', 'zdrav\u00ed',
  'bezpe\u010d\u00ed', 'vzd\u011bl\u00e1n\u00ed', 'slu\u017eby', 'pr\u00e1va/povinnosti', 'jin\u00e9'
];

const KA1_SERVICE_FORM_OPTIONS_ = ['ambulantn\u00ed', 'ter\u00e9nn\u00ed', 'Telefonn\u00ed'];
const WORKER_OPTIONS_ = ['Sociální pracovník', 'Case manager', 'Odborný garant'];

const YES_NO_OPTIONS_ = ['Ano', 'Ne'];

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
const EDUCATION_HEADERS_ = [
  'vzdelavani_id', 'datum', 'pocet_hodin', 'nazev_vzdelavani', 'cislo_akreditace', 'jmeno_pracovnika',
  'jmeno_pracovnika1', 'jmeno_pracovnika2', 'jmeno_pracovnika3',
  'status', 'created_at', 'created_by', 'updated_at', 'updated_by'
];
const SUPERVISION_HEADERS_ = [
  'sepervize_id', 'datum', 'pocet_hodin', 'typ_supervize', 'jmeno_pracovnika1', 'jmeno_pracovnika2', 'jmeno_pracovnika3'
];
const SUPERVISION_TYPE_OPTIONS_ = ['individuální', 'skupinová'];

const CLIENT_DATE_HEADERS_ = [
  'datum_narozeni',
  'datum_vstupu_do_projektu',
  'datum_vystupu_z_projektu',
  'case_management_od'
];

function toSheetDateValue_(value) {
  if (!value || value instanceof Date) return value || '';
  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 12, 0, 0);
  }
  const czechMatch = text.match(/^(\d{1,2})[.\/]\s*(\d{1,2})[.\/]\s*(\d{4})$/);
  if (czechMatch) {
    return new Date(Number(czechMatch[3]), Number(czechMatch[2]) - 1, Number(czechMatch[1]), 12, 0, 0);
  }
  return value;
}

function setClientDateFormats_(sheet, headers) {
  CLIENT_DATE_HEADERS_.forEach((header) => {
    const column = headers.indexOf(header) + 1;
    if (column) {
      sheet.getRange(CONFIG.headerRow + 1, column, Math.max(sheet.getMaxRows() - CONFIG.headerRow, 1), 1).setNumberFormat('dd.MM.yyyy');
    }
  });
}

function listClients_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
  ensureHeader_(sheet, getHeaders_(sheet), 'klicovy_pracovnik');
  ensureHeader_(sheet, getHeaders_(sheet), 'rodina');
  const headers = getHeaders_(sheet);
  setClientDateFormats_(sheet, headers);
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
  if (!sheet) throw new Error('Missing sheet: ' + CONFIG.sheetName);
  ensureHeader_(sheet, getHeaders_(sheet), 'klicovy_pracovnik');
  ensureHeader_(sheet, getHeaders_(sheet), 'rodina');
  const headers = getHeaders_(sheet);
  setColumnListValidation_(sheet, headers, 'klicovy_pracovnik', WORKER_OPTIONS_);
  setColumnListValidation_(sheet, headers, 'rodina', YES_NO_OPTIONS_);
  const klientIdColumn = headers.indexOf('klient_id') + 1;
  if (!klientIdColumn) throw new Error('Missing klient_id column');

  const now = new Date();
  const incoming = Object.assign({}, client);
  incoming.klient_id = String(incoming.klient_id || '').trim();
  const existingRow = incoming.klient_id ? findClientRow_(sheet, klientIdColumn, incoming.klient_id) : null;
  if (incoming.klient_id && !existingRow) {
    throw new Error('Klienta s ID ' + incoming.klient_id + ' nelze najit. Ulozeni zastaveno, aby nedoslo k prepsani jineho klienta.');
  }

  const duplicateIdRows = incoming.klient_id ? findClientRows_(sheet, klientIdColumn, incoming.klient_id) : [];
  if (duplicateIdRows.length > 1) {
    throw new Error('V listu Klienti existuje duplicitni klient_id ' + incoming.klient_id + '. Ulozeni zastaveno, nejdrive oprav duplicitni radky.');
  }

  const duplicateRow = findDuplicateClientRow_(sheet, headers, incoming, existingRow);
  if (duplicateRow) {
    throw new Error('Klient uz v registru existuje na radku ' + duplicateRow + '. Ulozeni zastaveno, aby nevznikla duplicita nebo prepsani jineho klienta.');
  }

  incoming.klient_id = incoming.klient_id || nextClientId_(sheet, klientIdColumn);
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  const normalized = Object.assign({}, existing, incoming);
  normalized.updated_at = now;
  normalized.updated_by = incoming.updated_by || existing.updated_by || '';
  normalized.created_at = existing.created_at || incoming.created_at || now;
  normalized.created_by = existing.created_by || incoming.created_by || '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = headers.map((header) => CLIENT_DATE_HEADERS_.includes(header)
    ? toSheetDateValue_(normalized[header])
    : normalized[header] ?? '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
  setClientDateFormats_(sheet, headers);

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
  const incomingPlanId = String(normalized.plan_id || '').trim();
  const clientId = String(normalized.klient_id || '').trim();
  if (!clientId) throw new Error('Individualni plan musi byt prirazen ke klientovi.');

  const existingRow = incomingPlanId ? findRowById_(sheet, idColumn, incomingPlanId) : null;
  if (!existingRow) {
    const exactDuplicateRow = findDuplicateRecordRow_(sheet, headers, normalized, 'plan_id');
    if (exactDuplicateRow) {
      return rowToObject_(headers, sheet.getRange(exactDuplicateRow, 1, 1, headers.length).getValues()[0]);
    }
  }

  const clientPlanRow = findRowByHeaderValue_(sheet, headers, 'klient_id', clientId, existingRow);
  if (clientPlanRow) {
    throw new Error('Klient uz ma individualni plan na radku ' + clientPlanRow + '. Druhy plan nebyl vytvoren.');
  }

  normalized.plan_id = normalized.plan_id || nextPrefixedId_(sheet, idColumn, 'PLAN');
  normalized.klient_id = clientId;
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';

  const targetRow = existingRow || sheet.getLastRow() + 1;
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

  const existingRow = findRowById_(sheet, idColumn, normalized.vykon_id);
  const duplicateRow = existingRow ? null : findDuplicateRecordRow_(sheet, headers, normalized, 'vykon_id');
  if (duplicateRow && !existingRow) {
    const duplicate = rowToObject_(headers, sheet.getRange(duplicateRow, 1, 1, headers.length).getValues()[0]);
    upsertPerformanceStatistics_(Object.assign({}, duplicate, {
      specificka_pole_json: normalized.specificka_pole_json || duplicate.specificka_pole_json
    }));
    return duplicate;
  }

  try {
    normalized.document_url = upsertClientRecordDocument_(normalized, 'KA1-Individu\u00e1ln\u00ed podpora', normalized.typ_podpory || 'Z\u00e1pis v\u00fdkonu', normalized.document_url);
  } catch (error) {
    normalized.document_error = String(error.message || error);
  }

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
  upsertPerformanceStatistics_(normalized);

  return rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
}

function listStatistics_() {
  const sheet = getOrCreateSheet_(CONFIG.statisticsSheetName, STATISTICS_HEADERS_);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];

  return sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(headers, row));
}


function getKuSupportTypeCode_(performance, payload) {
  const candidates = [
    payload.kuSupportTypeCode,
    payload.typ_podpory_ku_kod,
    payload.ku_support_type_code,
    payload.supportSpecific && payload.supportSpecific.kuSupportTypeCode,
    payload.supportSpecific && payload.supportSpecific.typ_podpory_ku_kod,
    performance.kuSupportTypeCode,
    performance.typ_podpory_ku_kod,
    performance.ku_support_type_code
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return '';
}

function getKuSupportTypeLabel_(performance, payload) {
  const candidates = [
    payload.kuSupportTypeLabel,
    payload.typ_podpory_ku_text,
    payload.hodnota_text,
    performance.kuSupportTypeLabel,
    performance.typ_podpory_ku_text,
    performance.hodnota_text
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return '';
}

function upsertPerformanceStatistics_(performance) {
  const payload = parseJsonObject_(performance.specificka_pole_json);
  const selectedCode = getKuSupportTypeCode_(performance, payload);
  const sheet = getOrCreateSheet_(CONFIG.statisticsSheetName, STATISTICS_HEADERS_);
  const headers = getHeaders_(sheet);
  const sourceId = String(performance.vykon_id || '').trim();
  if (!sourceId) return;

  const existingRow = findStatisticRow_(sheet, headers, sourceId, KU_SUPPORT_STAT_TYPE_);
  const isDefault = !selectedCode || selectedCode === KU_SUPPORT_DEFAULT_CODE_;
  if (isDefault) {
    if (existingRow) updateStatisticStatus_(sheet, headers, existingRow, 'smazany');
    return;
  }

  const type = KU_SUPPORT_TYPES_.find((item) => item.code === selectedCode) || {
    code: selectedCode,
    group: 'Ostatní',
    name: getKuSupportTypeLabel_(performance, payload) || selectedCode
  };
  const now = new Date();
  const idColumn = headers.indexOf('statistika_id') + 1;
  if (!idColumn) throw new Error('Missing statistika_id column');
  const existing = existingRow
    ? rowToObject_(headers, sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0])
    : {};
  const clientId = String(performance.klient_id || performance.client_id || '').trim();
  const date = formatDateValue_(performance.datum || payload.date || '');
  const normalized = Object.assign({}, existing, {
    statistika_id: existing.statistika_id || nextPrefixedId_(sheet, idColumn, 'STAT'),
    zdrojovy_zaznam_id: sourceId,
    client_id: clientId,
    client_name: getClientNameById_(clientId),
    datum: date,
    obdobi: buildStatisticsPeriod_(date),
    typ_statistiky: KU_SUPPORT_STAT_TYPE_,
    kod: type.code,
    skupina: type.group,
    nazev: type.name,
    hodnota_text: type.group ? type.group + ' / ' + type.name : type.name,
    status: 'Platny',
    created_at: existing.created_at || now,
    created_by: existing.created_by || performance.created_by || performance.updated_by || '',
    updated_at: now,
    updated_by: performance.updated_by || performance.created_by || ''
  });

  const targetRow = existingRow || sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([headers.map((header) => normalized[header] ?? '')]);
}

function parseJsonObject_(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function findStatisticRow_(sheet, headers, sourceId, statisticType) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length).getValues();
  const index = values.findIndex((row) => {
    const item = rowToObject_(headers, row);
    return String(item.zdrojovy_zaznam_id || '').trim() === sourceId &&
      String(item.typ_statistiky || '').trim() === statisticType;
  });
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function updateStatisticStatus_(sheet, headers, rowNumber, status) {
  const statusColumn = headers.indexOf('status') + 1;
  const updatedAtColumn = headers.indexOf('updated_at') + 1;
  if (!statusColumn) throw new Error('Missing status column in Statistiky');
  sheet.getRange(rowNumber, statusColumn).setValue(status);
  if (updatedAtColumn) sheet.getRange(rowNumber, updatedAtColumn).setValue(new Date());
}

function deactivatePerformanceStatistics_(performanceId) {
  const sourceId = String(performanceId || '').trim();
  if (!sourceId) return;
  const sheet = getOrCreateSheet_(CONFIG.statisticsSheetName, STATISTICS_HEADERS_);
  const headers = getHeaders_(sheet);
  const rowNumber = findStatisticRow_(sheet, headers, sourceId, KU_SUPPORT_STAT_TYPE_);
  if (rowNumber) updateStatisticStatus_(sheet, headers, rowNumber, 'smazany');
}

function buildStatisticsPeriod_(dateValue) {
  const date = formatDateValue_(dateValue);
  return date ? date.slice(0, 7) : '';
}

function getClientNameById_(clientId) {
  if (!clientId) return '';
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetName);
  if (!sheet) return '';
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('klient_id') + 1;
  if (!idColumn) return '';
  const targetRow = findClientRow_(sheet, idColumn, clientId);
  if (!targetRow) return '';
  const client = rowToObject_(headers, sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]);
  return [client.jmeno, client.prijmeni].filter(Boolean).join(' ').trim();
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

  const existingRow = findRowById_(sheet, idColumn, normalized.meeting_id);
  const duplicateRow = existingRow ? null : findDuplicateRecordRow_(sheet, headers, normalized, 'meeting_id');
  if (duplicateRow && !existingRow) return rowToObject_(headers, sheet.getRange(duplicateRow, 1, 1, headers.length).getValues()[0]);

  try {
    normalized.document_url = upsertClientRecordDocument_(normalized, 'KA2-Case management', normalized.typ_podpory || 'Z\u00e1pis case managementu', normalized.document_url);
  } catch (error) {
    normalized.document_error = String(error.message || error);
  }

  const targetRow = existingRow || sheet.getLastRow() + 1;
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

function listEducation_() {
  const sheet = getOrCreateSheet_(CONFIG.educationSheetName, EDUCATION_HEADERS_);
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

function saveEducation_(education) {
  const sheet = getOrCreateSheet_(CONFIG.educationSheetName, EDUCATION_HEADERS_);
  const headers = getHeaders_(sheet);
  setColumnListValidation_(sheet, headers, 'jmeno_pracovnika', WORKER_OPTIONS_);
  setColumnListValidation_(sheet, headers, 'jmeno_pracovnika1', WORKER_OPTIONS_);
  setColumnListValidation_(sheet, headers, 'jmeno_pracovnika2', WORKER_OPTIONS_);
  setColumnListValidation_(sheet, headers, 'jmeno_pracovnika3', WORKER_OPTIONS_);
  const educationIdColumn = headers.indexOf('vzdelavani_id') + 1;
  if (!educationIdColumn) throw new Error('Missing vzdelavani_id column');

  const now = new Date();
  const normalized = Object.assign({}, education);
  const incomingEducationId = String(normalized.vzdelavani_id || '').trim();
  normalized.vzdelavani_id = normalized.vzdelavani_id || nextPrefixedId_(sheet, educationIdColumn, 'VZDELAVANI');
  normalized.jmeno_pracovnika = normalized.jmeno_pracovnika || normalized.jmeno_pracovnika1 || '';
  normalized.jmeno_pracovnika1 = normalized.jmeno_pracovnika1 || normalized.jmeno_pracovnika || '';
  normalized.updated_at = now;
  normalized.updated_by = normalized.updated_by || '';
  normalized.created_at = normalized.created_at || now;
  normalized.created_by = normalized.created_by || '';
  normalized.status = normalized.status || 'Platn\u00fd';

  const existingRow = findRowById_(sheet, educationIdColumn, normalized.vzdelavani_id);
  const duplicateRow = incomingEducationId ? null : findDuplicateRecordRow_(sheet, headers, normalized, 'vzdelavani_id');
  if (duplicateRow && !existingRow) return rowToObject_(headers, sheet.getRange(duplicateRow, 1, 1, headers.length).getValues()[0]);

  const targetRow = existingRow || sheet.getLastRow() + 1;
  const values = headers.map((header) => normalized[header] ?? '');
  const savedRange = sheet.getRange(targetRow, 1, 1, headers.length);
  savedRange.setValues([values]);

  return rowToObject_(headers, savedRange.getValues()[0], savedRange.getDisplayValues()[0]);
}

function listSupervision_() {
  const sheet = getOrCreateSheet_(CONFIG.supervisionSheetName, SUPERVISION_HEADERS_);
  const headers = getHeaders_(sheet);
  setColumnListValidation_(sheet, headers, 'typ_supervize', SUPERVISION_TYPE_OPTIONS_);
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

function saveSupervision_(supervision) {
  const sheet = getOrCreateSheet_(CONFIG.supervisionSheetName, SUPERVISION_HEADERS_);
  const headers = getHeaders_(sheet);
  setColumnListValidation_(sheet, headers, 'typ_supervize', SUPERVISION_TYPE_OPTIONS_);
  const supervisionIdColumn = headers.indexOf('sepervize_id') + 1;
  if (!supervisionIdColumn) throw new Error('Missing sepervize_id column');

  const normalized = Object.assign({}, supervision);
  const incomingSupervisionId = String(normalized.sepervize_id || '').trim();
  normalized.sepervize_id = normalized.sepervize_id || nextPrefixedId_(sheet, supervisionIdColumn, 'SUPERVIZE');

  const existingRow = findRowById_(sheet, supervisionIdColumn, normalized.sepervize_id);
  const duplicateRow = incomingSupervisionId ? null : findDuplicateRecordRow_(sheet, headers, normalized, 'sepervize_id');
  if (duplicateRow && !existingRow) return rowToObject_(headers, sheet.getRange(duplicateRow, 1, 1, headers.length).getValues()[0]);

  const targetRow = existingRow || sheet.getLastRow() + 1;
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

const BACKUP_STATUS_PROPERTY_ = 'FULL_BACKUP_STATUS_V1';
const BACKUP_QUEUED_HANDLER_ = 'runQueuedFullBackup';
const BACKUP_WEEKLY_HANDLER_ = 'runScheduledFullBackup';

function queueFullBackup_(requestedBy) {
  const current = readBackupStatus_();
  if (current.state === 'queued' || current.state === 'running') return current;

  deleteTriggersByHandler_(BACKUP_QUEUED_HANDLER_);
  const status = {
    state: 'queued',
    source: 'manual',
    requestedBy: String(requestedBy || '').trim(),
    requestedAt: new Date().toISOString(),
    message: 'Záloha čeká na spuštění.'
  };
  writeBackupStatus_(status);
  if (!hasTrigger_(BACKUP_WEEKLY_HANDLER_)) installWeeklyBackupTrigger_();
  ScriptApp.newTrigger(BACKUP_QUEUED_HANDLER_).timeBased().after(1000).create();
  return Object.assign({}, status, { weeklyEnabled: hasTrigger_(BACKUP_WEEKLY_HANDLER_) });
}

function assertBackupManager_(worker) {
  if (normalizeDuplicateText_(worker) !== normalizeDuplicateText_('Odborný garant')) {
    throw new Error('Kompletni zalohu muze spravovat pouze odborny garant.');
  }
}

function runQueuedFullBackup() {
  deleteTriggersByHandler_(BACKUP_QUEUED_HANDLER_);
  runFullBackupJob_('manual');
}

function runScheduledFullBackup() {
  runFullBackupJob_('scheduled');
}

function runFullBackupJob_(source) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  const startedAt = new Date();
  try {
    writeBackupStatus_({
      state: 'running',
      source: source || 'manual',
      startedAt: startedAt.toISOString(),
      message: 'Probíhá export tabulky a klientských složek.'
    });
    const result = createFullBackup_();
    writeBackupStatus_(Object.assign({
      state: 'success',
      source: source || 'manual',
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      message: 'Kompletní záloha byla vytvořena.'
    }, result));
  } catch (error) {
    writeBackupStatus_({
      state: 'error',
      source: source || 'manual',
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      message: String(error && error.message || error)
    });
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function createFullBackup_() {
  const generatedAt = new Date();
  const zipName = buildBackupFileName_(generatedAt);
  const blobs = [];
  const usedArchivePaths = {};
  const manifest = {
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    projectName: CONFIG.projectName,
    projectCode: CONFIG.projectCode,
    spreadsheetId: CONFIG.spreadsheetId,
    clientFoldersRootId: CONFIG.clientFoldersRootId,
    files: [],
    errors: []
  };

  const spreadsheetFile = DriveApp.getFileById(CONFIG.spreadsheetId);
  addFileToBackup_(spreadsheetFile, 'hlavni-tabulka', blobs, manifest, usedArchivePaths);

  const clientRoot = getClientFolderParent_();
  collectFolderForBackup_(clientRoot, 'klientske-slozky', blobs, manifest, usedArchivePaths);

  manifest.fileCount = manifest.files.length;
  manifest.errorCount = manifest.errors.length;
  blobs.push(Utilities.newBlob(JSON.stringify(manifest, null, 2), 'application/json', 'manifest.json'));

  if (manifest.errors.length) {
    throw new Error('Záloha nebyla vytvořena kompletně. Počet chyb při exportu: ' + manifest.errors.length + '.');
  }

  const zipBlob = Utilities.zip(blobs, zipName);
  const backupFolder = getBackupFolder_();
  const backupFile = backupFolder.createFile(zipBlob);
  backupFile.setDescription(JSON.stringify({
    projectName: CONFIG.projectName,
    projectCode: CONFIG.projectCode,
    generatedAt: generatedAt.toISOString(),
    fileCount: manifest.fileCount
  }));
  pruneOldBackups_(backupFolder, backupFile.getId());

  return {
    fileId: backupFile.getId(),
    fileName: backupFile.getName(),
    fileUrl: backupFile.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + backupFile.getId(),
    fileCount: manifest.fileCount,
    errorCount: 0
  };
}

function collectFolderForBackup_(folder, path, blobs, manifest, usedArchivePaths) {
  const files = folder.getFiles();
  while (files.hasNext()) addFileToBackup_(files.next(), path, blobs, manifest, usedArchivePaths);

  const folders = folder.getFolders();
  while (folders.hasNext()) {
    const child = folders.next();
    collectFolderForBackup_(child, path + '/' + sanitizeBackupPathPart_(child.getName()), blobs, manifest, usedArchivePaths);
  }
}

function addFileToBackup_(file, path, blobs, manifest, usedArchivePaths) {
  const originalName = file.getName();
  try {
    const spec = backupExportSpec_(file.getMimeType(), originalName);
    const blob = spec.exportMimeType
      ? exportGoogleFileBlob_(file.getId(), spec.exportMimeType)
      : file.getBlob();
    const requestedName = path + '/' + spec.fileName;
    const targetName = uniqueBackupArchivePath_(requestedName, usedArchivePaths || {});
    blob.setName(targetName);
    blobs.push(blob);
    manifest.files.push({
      id: file.getId(),
      sourceName: originalName,
      archivePath: targetName,
      sourceMimeType: file.getMimeType(),
      exportedMimeType: spec.exportMimeType || file.getMimeType(),
      updatedAt: file.getLastUpdated().toISOString()
    });
  } catch (error) {
    manifest.errors.push({
      id: file.getId(),
      name: originalName,
      path: path,
      error: String(error && error.message || error)
    });
  }
}

function uniqueBackupArchivePath_(requestedPath, usedArchivePaths) {
  const used = usedArchivePaths || {};
  const normalizedPath = String(requestedPath || 'soubor').toLowerCase();
  if (!used[normalizedPath]) {
    used[normalizedPath] = true;
    return requestedPath;
  }

  const slashIndex = requestedPath.lastIndexOf('/');
  const dotIndex = requestedPath.lastIndexOf('.');
  const hasExtension = dotIndex > slashIndex + 1;
  const base = hasExtension ? requestedPath.slice(0, dotIndex) : requestedPath;
  const extension = hasExtension ? requestedPath.slice(dotIndex) : '';
  let suffix = 2;
  let candidate;
  do {
    candidate = base + '-' + suffix + extension;
    suffix += 1;
  } while (used[candidate.toLowerCase()]);
  used[candidate.toLowerCase()] = true;
  return candidate;
}

function backupExportSpec_(mimeType, originalName) {
  const nativeExports = {
    'application/vnd.google-apps.document': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
    'application/vnd.google-apps.spreadsheet': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
    'application/vnd.google-apps.presentation': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', '.pptx'],
    'application/vnd.google-apps.drawing': ['application/pdf', '.pdf']
  };
  const exportInfo = nativeExports[mimeType];
  const safeName = sanitizeBackupPathPart_(originalName || 'soubor');
  if (!exportInfo) return { exportMimeType: '', fileName: safeName };
  const extension = exportInfo[1];
  const fileName = safeName.toLowerCase().endsWith(extension) ? safeName : safeName + extension;
  return { exportMimeType: exportInfo[0], fileName: fileName };
}

function exportGoogleFileBlob_(fileId, mimeType) {
  const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '/export?mimeType=' + encodeURIComponent(mimeType);
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('Export z Google Drive selhal se stavem ' + status + '.');
  return response.getBlob();
}

function getBackupFolder_() {
  if (CONFIG.backupFolderId) return DriveApp.getFolderById(CONFIG.backupFolderId);
  const clientRoot = getClientFolderParent_();
  const parents = clientRoot.getParents();
  const parent = parents.hasNext() ? parents.next() : null;
  const existing = parent ? parent.getFoldersByName(CONFIG.backupFolderName) : DriveApp.getFoldersByName(CONFIG.backupFolderName);
  if (existing.hasNext()) return existing.next();
  return parent ? parent.createFolder(CONFIG.backupFolderName) : DriveApp.createFolder(CONFIG.backupFolderName);
}

function pruneOldBackups_(folder, keepFileId) {
  const backups = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().indexOf('kompletni-zaloha-') === 0) backups.push(file);
  }
  backups.sort(function(left, right) { return right.getDateCreated().getTime() - left.getDateCreated().getTime(); });
  backups.slice(Math.max(Number(CONFIG.backupRetentionCount) || 12, 1)).forEach(function(file) {
    if (file.getId() !== keepFileId) file.setTrashed(true);
  });
}

function installWeeklyBackupTrigger_() {
  deleteTriggersByHandler_(BACKUP_WEEKLY_HANDLER_);
  ScriptApp.newTrigger(BACKUP_WEEKLY_HANDLER_)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(2)
    .create();
  return getBackupStatus_();
}

function getBackupStatus_() {
  const status = readBackupStatus_();
  try {
    status.weeklyEnabled = hasTrigger_(BACKUP_WEEKLY_HANDLER_);
  } catch (error) {
    if (!isTriggerAuthorizationError_(error)) throw error;
    status.weeklyEnabled = false;
    status.authorizationRequired = true;
    status.state = 'authorization_required';
    status.message = 'Automatické zálohy čekají na jednorázové povolení v Apps Scriptu. Spusťte funkci authorizeBackupTriggers a potvrďte oprávnění.';
  }
  status.retentionCount = Number(CONFIG.backupRetentionCount) || 12;
  return status;
}

function readBackupStatus_() {
  const raw = PropertiesService.getScriptProperties().getProperty(BACKUP_STATUS_PROPERTY_);
  if (!raw) return { state: 'idle', message: 'Záloha zatím nebyla vytvořena.' };
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { state: 'error', message: 'Stav poslední zálohy nelze načíst.' };
  }
}

function writeBackupStatus_(status) {
  PropertiesService.getScriptProperties().setProperty(BACKUP_STATUS_PROPERTY_, JSON.stringify(status || {}));
}

function hasTrigger_(handler) {
  return getProjectTriggers_().some(function(trigger) {
    return trigger.getHandlerFunction() === handler;
  });
}

function deleteTriggersByHandler_(handler) {
  getProjectTriggers_().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === handler) ScriptApp.deleteTrigger(trigger);
  });
}

function getProjectTriggers_() {
  try {
    return ScriptApp.getProjectTriggers();
  } catch (error) {
    if (isTriggerAuthorizationError_(error)) {
      throw new Error('[TRIGGER_AUTH_REQUIRED] Nejdříve v editoru Apps Scriptu spusťte funkci authorizeBackupTriggers a potvrďte požadovaná oprávnění.');
    }
    throw error;
  }
}

function isTriggerAuthorizationError_(error) {
  const message = String(error && (error.message || error));
  return message.indexOf('[TRIGGER_AUTH_REQUIRED]') !== -1
    || message.indexOf('ScriptApp.getProjectTriggers') !== -1
    || message.indexOf('script.scriptapp') !== -1;
}

function buildBackupFileName_(date) {
  return 'kompletni-zaloha-' + Utilities.formatDate(date || new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd-HHmmss') + '.zip';
}

function sanitizeBackupPathPart_(value) {
  return sanitizeFileName_(value).replace(/\.+$/g, '').slice(0, 180) || 'soubor';
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
    if (header === 'cas_od' || header === 'cas_do') {
      if (displayRow && displayRow[index]) {
        acc[header] = displayRow[index];
      } else if (value instanceof Date) {
        acc[header] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
      } else {
        acc[header] = value;
      }
    } else if (value instanceof Date) {
      acc[header] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      acc[header] = value;
    }
    return acc;
  }, {});
}


function normalizeDuplicateText_(value) {
  return String(value == null ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function findDuplicateClientRow_(sheet, headers, incoming, excludedRow) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;

  const incomingFirstName = normalizeDuplicateText_(incoming.jmeno);
  const incomingLastName = normalizeDuplicateText_(incoming.prijmeni);
  if (!incomingFirstName || !incomingLastName) return null;

  const incomingBirthDate = formatDateValue_(incoming.datum_narozeni || '');
  const values = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length).getValues();

  const index = values.findIndex((row, index) => {
    const sheetRow = CONFIG.headerRow + 1 + index;
    if (excludedRow && sheetRow === excludedRow) return false;
    const existing = rowToObject_(headers, row);
    if (normalizeDuplicateText_(existing.jmeno) !== incomingFirstName) return false;
    if (normalizeDuplicateText_(existing.prijmeni) !== incomingLastName) return false;

    const existingBirthDate = formatDateValue_(existing.datum_narozeni || '');
    if (incomingBirthDate && existingBirthDate) return incomingBirthDate === existingBirthDate;

    return true;
  });

  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function buildRecordDuplicateKey_(record, idHeader) {
  const ignoredHeaders = [idHeader, 'document_url', 'document_error', 'status', 'created_at', 'created_by', 'updated_at', 'updated_by'];
  const object = Object.assign({}, record);
  ignoredHeaders.forEach((header) => delete object[header]);
  return JSON.stringify(Object.keys(object).sort().reduce((acc, key) => {
    let value = object[key];
    if (value instanceof Date) value = formatDateValue_(value);
    acc[key] = normalizeDuplicateText_(value);
    return acc;
  }, {}));
}

function findDuplicateRecordRow_(sheet, headers, incoming, idHeader) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const incomingKey = buildRecordDuplicateKey_(incoming, idHeader);
  const values = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, headers.length).getValues();
  const index = values.findIndex((row) => {
    const existing = rowToObject_(headers, row);
    return buildRecordDuplicateKey_(existing, idHeader) === incomingKey;
  });
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function findClientRow_(sheet, klientIdColumn, klientId) {
  const rows = findClientRows_(sheet, klientIdColumn, klientId);
  return rows[0] || null;
}

function findClientRows_(sheet, klientIdColumn, klientId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return [];
  const targetId = String(klientId || '').trim();
  if (!targetId) return [];
  const values = sheet.getRange(CONFIG.headerRow + 1, klientIdColumn, lastRow - CONFIG.headerRow, 1).getValues();
  return values.reduce((rows, row, index) => {
    if (String(row[0] || '').trim() === targetId) rows.push(CONFIG.headerRow + 1 + index);
    return rows;
  }, []);
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
  const expectedToken = PropertiesService.getScriptProperties().getProperty('CLIENTS_API_TOKEN');
  if (!expectedToken) throw new Error('CLIENTS_API_TOKEN is not configured in Script Properties');
  if (token !== expectedToken) throw new Error('Invalid token');
}

function findRowByHeaderValue_(sheet, headers, headerName, value, excludedRow) {
  const column = headers.indexOf(headerName) + 1;
  if (!column) throw new Error('Missing ' + headerName + ' column');
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.headerRow) return null;
  const targetValue = String(value == null ? '' : value).trim();
  if (!targetValue) return null;
  const values = sheet.getRange(CONFIG.headerRow + 1, column, lastRow - CONFIG.headerRow, 1).getValues();
  const index = values.findIndex((row, index) => {
    const sheetRow = CONFIG.headerRow + 1 + index;
    return sheetRow !== excludedRow && String(row[0] == null ? '' : row[0]).trim() === targetValue;
  });
  return index === -1 ? null : CONFIG.headerRow + 1 + index;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
