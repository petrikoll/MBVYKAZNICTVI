import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  Clock,
  Database,
  Download,
  Eye,
  FileBadge,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  GraduationCap,
  History,
  Lightbulb,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  PieChart,
  Plus,
  Presentation,
  Save,
  Scale,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  Users,
  Workflow,
  Brain,
  Printer,
  X
} from 'lucide-react';
import {
  APP_VIEWS,
  GOOGLE_DRIVE_UPLOAD_URL,
  GOOGLE_SHEET_MACRO_URL,
  PROJECT_START_DATE,
  REPORTING_PERIODS,
  REPORT_PROMPTS,
  TARGETS,
  WORKER_NAMES,
  WORKERS,
  canonicalizeWorkerName,
  canonicalizeWorkerReferences,
  isCaseManagerWorker,
  isGarantWorker,
  CLIENT_GENDER_OPTIONS,
  CLIENT_EMPLOYMENT_OPTIONS,
  CLIENT_EDUCATION_OPTIONS,
  CLIENT_DISADVANTAGE_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  YES_NO_OPTIONS,
  KU_SUPPORT_DEFAULT_CODE,
  emptyClientDraft,
  emptyFilters,
  emptyGeneratorDraft
} from '../config/projectConfig.js';
import { HELP } from '../config/helpCatalog.js';
import {
  CheckboxField,
  CompactMetric,
  DetailRow,
  EmptyState,
  InfoCard,
  HelpIcon,
  InputField,
  LoadingCard,
  MiniBadge,
  Panel,
  SaveInlineNotice,
  SelectField,
  StatCard,
  TextAreaField,
  TopMetric
} from '../components/ui.jsx';
import IdleFlyScreensaver from '../components/IdleFlyScreensaver.jsx';
import RuianAddressFields from '../components/RuianAddressFields.jsx';
import { buildSensitiveTerms, parseAiJson, redactClientIdentifiers, sanitizeAiInput, validatePlanOutput, validateRecordOutput } from '../lib/aiSafety.js';
import { parseGoogleSheetResponse, requireSavedGoogleSheetRecord } from '../lib/googleSheetApi.js';
import {
  actorContactsToSheetFields,
  attendanceSheetTitle,
  buildAttendanceParticipants,
  contactsFromSheetRow,
  createEmptyActorContact,
  isAttendanceReadyContact,
  normalizeActorContacts,
  selectedContactIds
} from '../lib/actorContacts.js';
import { buildClientSelectionPool } from '../lib/clientSelection.js';
import { buildClientCaseAiPrompt, buildClientCaseSummaryPrintHtml, filterClientCaseAiRecords } from '../lib/clientCaseSummary.js';
import { GOAL_STATUS, goalStatusLabel, isGoalCompleted, isGoalTerminal, normalizeGoalStatus } from '../lib/goalStatus.js';
import { buildIsEsfPersonExport, serializeIsEsfPersonCsv } from '../lib/isEsfExport.js';
import { validateClientAddress } from '../lib/ruianAddress.js';
import {
  buildIsEsfSupportExport,
  matchClientsToIsEsfPersonRows,
  parseIsEsfPersonTemplateCsv,
  serializeIsEsfSupportCsv
} from '../lib/isEsfSupportExport.js';
import { buildPhysicalSignedFiledOutreachText } from '../lib/physicalOutreach.js';
import { isBackupStatusActive } from '../lib/backupStatus.js';
import {
  readSafeRecordIndex,
  readSafeStartupRecords,
  writeSafeClientIndex,
  writeSafeRecordIndex
} from '../lib/safeDataCache.js';
import {
  buildGoalAlertSignature,
  rememberDismissedGoalAlertSignature
} from '../lib/goalAlertDismissal.js';
import { buildHorizontalPrincipleAiPrompt, buildHorizontalPrinciplesTexts, buildZorTexts, ZOR_TEXT_MAX_LENGTH } from '../lib/zorSummary.js';
import AiDocumentPanel from './AiDocumentPanel.jsx';
import sfLogoImage from '../assets/eu-spolufinancovano-logo.png';
import cityLogoImage from '../assets/moravsky-beroun-erb.jpg';
import {
  buildAddress,
  buildAllRecordsBackupHtml,
  buildClientFolderHtml,
  buildDriveUploadPayload,
  buildFallbackGeneratedText,
  buildAiStyleMemoryRecord,
  buildGeneratorRecord,
  buildStyleMemoryContext,
  buildIndicators,
  buildPartnerStats,
  buildKa02Record,
  buildKa03Record,
  buildManualClientId,
  buildMonitoringBundleHtml,
  buildRecordHtmlDocument,
  buildSelectedJourneyPrintHtml,
  cleanGeneratedText,
  computedIndicatorsMap,
  copyToClipboard,
  downloadHtmlDocument,
  enrichClient,
  extractGeminiText,
  getClientSupportBreakdown,
  getClientStats,
  getEffectiveRecordKa,
  isDepistageRecord,
  isLongTermProjectGoalEvidenceRecord,
  isShortTermProjectGoalEvidenceRecord,
  CASE_MEETING_DASHBOARD_NOTE,
  isCaseMeetingDashboardRecord,
  groupRecordsByType,
  mapSheetRowToClient,
  slugify,
  todayIso,
  truncate
} from '../lib/projectUtils.js';

const Ka01View = React.lazy(() => import('./Ka01View.jsx'));
const Ka02View = React.lazy(() => import('./Ka02View.jsx'));
const Ka2CaseManagementView = React.lazy(() => import('./Ka2CaseManagementView.jsx'));
const ReportingView = React.lazy(() => import('./ReportingView.jsx'));

const LazyViewFallback = () => (
  <LoadingCard text="Načítám modul..." />
);

const KA02_AI_DOCUMENT_KEYS = ['plan', 'consultation'];
const KA02_STRUCTURED_FORM_KEYS = ['consultation'];
const SUPERVISION_TYPE_OPTIONS = ['individuální', 'skupinová'];
const KA1_SUPPORT_SPECIFIC_SHEET_COLUMNS = [
  ['contactPlace', 'misto_depistaze'],
  ['contactMethod', 'zpusob_kontaktu'],
  ['cooperationInterest', 'zajem_o_spolupraci'],
  ['physicalSignedFiled', 'zapis_fyzicky_podepsan_zalozen'],
  ['mappedAreas', 'hlavni_zjistene_oblasti'],
  ['risks', 'rizika'],
  ['clientResources', 'zdroje_klienta'],
  ['clientNeeds', 'potreby_klienta'],
  ['providedInformation', 'poskytnute_informace'],
  ['recommendedProcedure', 'doporuceny_postup'],
  ['fieldWorkPlace', 'misto_vykonu'],
  ['visitPurpose', 'ucel_navstevy'],
  ['accompanimentPlace', 'kam_doprovod'],
  ['accompanimentPurpose', 'ucel_doprovodu'],
  ['accompanimentResult', 'vysledek_doprovodu'],
  ['crisisType', 'typ_krize'],
  ['urgency', 'mira_akutnosti'],
  ['measures', 'prijata_opatreni'],
  ['followupHelp', 'predani_navazne_pomoci'],
  ['contactedFollowupServices', 'kontaktovana_navazna_sluzba'],
  ['evaluationReason', 'duvod_vyhodnoceni_ukonceni'],
  ['achievedProgress', 'dosazeny_posun'],
  ['unresolvedAreas', 'nedoresene_oblasti'],
  ['recommendation', 'doporuceni'],
];
const mapKA1SupportSpecificToSheetColumns = (supportSpecific = {}) =>
  KA1_SUPPORT_SPECIFIC_SHEET_COLUMNS.reduce((accumulator, [key, column]) => {
    accumulator[column] = supportSpecific?.[key] ?? '';
    return accumulator;
  }, {});
const mapSheetColumnsToKA1SupportSpecific = (row = {}) =>
  KA1_SUPPORT_SPECIFIC_SHEET_COLUMNS.reduce((accumulator, [key, column]) => {
    const value = asSheetText(row[column]).trim();
    if (value) accumulator[key] = key === 'physicalSignedFiled' ? /^(ano|true|1)$/i.test(value) : value;
    return accumulator;
  }, {});
const isDepistageType = (value) =>
  String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('depist');
const isPhysicalSignedFiledOutreach = (draft = {}) =>
  draft.selectedKey === 'consultation' &&
  !draft.caseManagementMode &&
  isDepistageType(draft.consultationType) &&
  Boolean(draft.supportSpecific?.physicalSignedFiled);
const APP_VERSION_LABEL = 'verze 2026-08-01';
const DEFAULT_AI_MODEL = 'gemini-2.5-flash';

const KA01_ACTIVITY_AI_CONTEXT = [
  'KA02-Tvorba s\u00edt\u011b sleduje rozvoj a udr\u017eov\u00e1n\u00ed partnersk\u00e9 s\u00edt\u011b v Moravsk\u00e9m Beroun\u011b a jeho p\u0159ilehl\u00fdch \u010d\u00e1stech.',
  'Z\u00e1znam zachycuje individu\u00e1ln\u00ed nebo skupinovou sch\u016fzku partner\u016f, p\u0159\u00edpadn\u011b poradu realiza\u010dn\u00edho t\u00fdmu.',
  'Popisuj pouze dolo\u017een\u00fd obsah jedn\u00e1n\u00ed, jeho v\u00fdsledek a dohodnut\u00e9 dal\u0161\u00ed kroky.',
  'Nezmi\u0148uj n\u00e1bor klient\u016f, distribuci materi\u00e1l\u016f ani obsah star\u00e9ho projektu, pokud nebyly v\u00fdslovn\u011b zad\u00e1ny.'
].join('\n');

const KA01_AI_OUTPUT_RULES = [
  'Pi\u0161 \u010desky, v\u011bcn\u011b a auditn\u011b obhajiteln\u011b.',
  'Rozsah p\u0159izp\u016fsob typu a obsahu aktivity. Obvykle napi\u0161 3 a\u017e 6 dokon\u010den\u00fdch v\u011bt, u porady realiza\u010dn\u00edho t\u00fdmu 5 a\u017e 8 v\u011bt.',
  'Nevym\u00fd\u0161lej osoby, rozhodnut\u00ed, \u00fakoly, odpov\u011bdnosti ani term\u00edny. Chyb\u011bj\u00edc\u00ed informace nep\u0159id\u00e1vej.',
  'Nevracej JSON, Markdown ani seznam n\u00e1zv\u016f pol\u00ed. Vra\u0165 pouze hotov\u00fd text z\u00e1pisu.'
].join('\n');

const getKa01PhaseGuidance = () =>
  'Z\u00e1pis formuluj jako konkr\u00e9tn\u00ed krok v rozvoji nebo udr\u017eov\u00e1n\u00ed spolupracuj\u00edc\u00ed s\u00edt\u011b.';
const getKa01ActivityTypeGuidance = (type) => {
  const normalized = String(type || '').trim().toLocaleLowerCase('cs');
  if (normalized === 'porada') {
    return [
      'Jde o interní poradu realizačního týmu projektu, nikoli o schůzku partnerské sítě.',
      'Zvol kultivovanější, plynulý a o něco květnatější administrativní styl. Text má působit jako kvalitní zápis z porady, ne jako stručný seznam bodů.',
      'Rozveď souvislosti mezi projednanými tématy, ale nepřidávej nová fakta, osoby, rozhodnutí, odpovědnosti ani termíny.',
      'Zachyť projednaná témata, podstatné závěry a konkrétní úkoly. U úkolů uveď odpovědnost a termín pouze tehdy, jsou-li v datech.',
      'Na konci uveď domluvený termín a témata dalšího jednání, pokud byla zadána.'
    ].join('\n');
  }
  if (normalized === 'koordina\u010dn\u00ed setk\u00e1n\u00ed') {
    return 'Zd\u016frazni koordinaci zapojen\u00fdch akt\u00e9r\u016f, sd\u00edlen\u00ed informac\u00ed, rozd\u011blen\u00ed rol\u00ed a dohodnut\u00fd postup. Nevyd\u00e1vej setk\u00e1n\u00ed za poradu realiza\u010dn\u00edho t\u00fdmu.';
  }
  if (normalized.includes('roz\u0161\u00ed\u0159en\u00ed') || normalized.includes('udr\u017een\u00ed s\u00edt\u011b')) {
    return 'Popi\u0161, zda \u0161lo o nav\u00e1z\u00e1n\u00ed nov\u00e9 spolupr\u00e1ce nebo udr\u017een\u00ed st\u00e1vaj\u00edc\u00edho vztahu, jak\u00fd byl p\u0159\u00ednos kontaktu pro partnerskou s\u00ed\u0165 a jak\u00fd konkr\u00e9tn\u00ed krok byl dohodnut.';
  }
  if (normalized === 'skupinov\u00e1') {
    return 'Jde o skupinov\u00e9 jedn\u00e1n\u00ed v\u00edce akt\u00e9r\u016f s\u00edt\u011b. Shr\u0148 spole\u010dn\u00e1 t\u00e9mata, dosa\u017een\u00e9 shody nebo rozd\u00edln\u00e9 postoje a navazuj\u00edc\u00ed \u00fakoly pouze podle zadan\u00fdch dat.';
  }
  if (normalized === 'individu\u00e1ln\u00ed') {
    return 'Jde o dvoustrann\u00e9 jedn\u00e1n\u00ed s jedn\u00edm akt\u00e9rem. Popi\u0161 \u00fa\u010del kontaktu, projednanou oblast spolupr\u00e1ce, v\u00fdsledek a navazuj\u00edc\u00ed krok.';
  }
  return 'Popi\u0161 \u00fa\u010del aktivity, zapojen\u00e9 akt\u00e9ry, projednan\u00fd obsah, dolo\u017een\u00fd v\u00fdsledek a dal\u0161\u00ed postup.';
};
const parseTimeToMinutes = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const formatDurationFromTimes = (startTime, endTime) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes == null || endMinutes == null) return '';
  const durationMinutes = endMinutes >= startMinutes ?endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes;
  if (durationMinutes <= 0) return '';
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours && minutes) return `${hours} hod. ${minutes} min.`;
  if (hours) return `${hours} ${hours === 1 ?'hodina' : hours < 5 ?'hodiny' : 'hodin'}`;
  return `${minutes} min.`;
};

const KA01_HALF_HOUR_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return `${hour}:${minute}`;
});

const getKa01TimeSuggestions = (value) => {
  const query = String(value || '').trim();
  if (!query) {
    const preferredStartIndex = KA01_HALF_HOUR_OPTIONS.indexOf('7:00');
    const ordered = preferredStartIndex >= 0
      ? [
          ...KA01_HALF_HOUR_OPTIONS.slice(preferredStartIndex),
          ...KA01_HALF_HOUR_OPTIONS.slice(0, preferredStartIndex)
        ]
      : KA01_HALF_HOUR_OPTIONS;
    return ordered;
  }

  const hourOnlyMatch = query.match(/^(\d{1,2})$/);
  if (hourOnlyMatch) {
    const hour = Number(hourOnlyMatch[1]);
    if (hour >= 0 && hour <= 23) {
      return [`${hour}:00`, `${hour}:30`];
    }
  }

  const normalized = query.replace('.', ':');
  return KA01_HALF_HOUR_OPTIONS.filter((item) => item.startsWith(normalized)).slice(0, 24);
};

const KA01_ACTOR_CUSTOM = '__custom__';
const KA01_ACTOR_ROLE_FIELDS = [
  'roleRecruitment',
  'roleClientReferral',
  'roleMaterialDistribution',
  'roleJobOpportunities',
  'roleTpm',
  'roleHpp',
  'roleFollowupService',
  'roleDebtSocialSupport',
  'roleInfoSharingWithConsent',
  'roleCoordinationMeetings',
  'roleWorkplaceAdaptation',
  'roleOther'
];
const KA01_EMPTY_ACTOR_ROLES = KA01_ACTOR_ROLE_FIELDS.reduce((accumulator, field) => {
  accumulator[field] = false;
  return accumulator;
}, {});
const isCheckedValue = (value) => {
  if (value === true) return true;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['true', 'ano', '1', 'yes'].includes(value.trim().toLowerCase());
  return false;
};
const KA01_PLACE_CUSTOM = '__custom__';
const KA01_PLACE_OPTIONS = [
  { value: 'Moravsk\u00fd Beroun', label: 'Moravsk\u00fd Beroun' },
  { value: 'Ondr\u00e1\u0161ov', label: 'Ondr\u00e1\u0161ov' },
  { value: 'Sedm Dvor\u016f', label: 'Sedm Dvor\u016f' },
  { value: '\u010cabov\u00e1', label: '\u010cabov\u00e1' },
  { value: 'Nov\u00e9 Valte\u0159ice', label: 'Nov\u00e9 Valte\u0159ice' },
  { value: 'Norber\u010dany', label: 'Norber\u010dany' },
  { value: 'Star\u00e1 Libav\u00e1', label: 'Star\u00e1 Libav\u00e1' },
  { value: 'Trhavice', label: 'Trhavice' },
  { value: 'Nov\u00e1 V\u00e9ska', label: 'Nov\u00e1 V\u00e9ska' },
  { value: KA01_PLACE_CUSTOM, label: 'Jin\u00e9 m\u00edsto (ru\u010dn\u011b)' }
];
const KA01_DEFAULT_ACTOR_REGISTRY = [];

const buildEmptyKa01ActorEntry = () => ({ actorType: '', customName: '' });
const getKa01ActorDisplayName = (entry) => {
  if (!entry) return '';
  if (entry.actorType === KA01_ACTOR_CUSTOM) return String(entry.customName || '').trim();
  return String(entry.actorType || '').trim();
};
const normalizeKa01ActorEntries = (entries) => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const selectedEntries = safeEntries
    .map((entry) => ({
      actorType: String(entry?.actorType || ''),
      customName: String(entry?.customName || '')
    }))
    .filter((entry) => entry.actorType === KA01_ACTOR_CUSTOM || Boolean(getKa01ActorDisplayName(entry)));

  return [...selectedEntries, buildEmptyKa01ActorEntry()];
};
const serializeKa01ActorEntries = (entries) =>
  normalizeKa01ActorEntries(entries)
    .map((entry) => getKa01ActorDisplayName(entry))
    .filter(Boolean)
    .join(', ');
const parseKa01ActorEntries = (participantsText, knownActorOptionValues = []) => {
  const text = String(participantsText || '').trim();
  if (!text) return [buildEmptyKa01ActorEntry()];

  const knownOptionValues = new Set(
    (Array.isArray(knownActorOptionValues) ? knownActorOptionValues : [])
      .map((value) => String(value || '').trim())
      .filter((value) => value && value !== KA01_ACTOR_CUSTOM)
  );
  const entries = text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) =>
      knownOptionValues.has(item)
        ? { actorType: item, customName: '' }
        : { actorType: KA01_ACTOR_CUSTOM, customName: item }
    );

  return normalizeKa01ActorEntries(entries);
};
const parseKa01PlaceValue = (placeText) => {
  const value = String(placeText || '').trim();
  if (!value) return { placeType: '', customPlace: '' };
  const knownPlaceValues = new Set(KA01_PLACE_OPTIONS.map((item) => item.value).filter((item) => item !== KA01_PLACE_CUSTOM));
  if (knownPlaceValues.has(value)) {
    return { placeType: value, customPlace: '' };
  }
  return { placeType: KA01_PLACE_CUSTOM, customPlace: value };
};

const inspectAiOutputCompleteness = (text, { finishReason = '' } = {}) => {
  const normalized = cleanGeneratedText(text || '');
  const reasons = [];
  if (!normalized) return { isSuspicious: false, reasons };

  if (finishReason === 'MAX_TOKENS') {
    reasons.push('Gemini ukončil odpověď kvůli limitu délky.');
  }

  const ending = normalized.slice(-160).trim();
  const lastWord = ending.split(/\s+/).filter(Boolean).pop() || '';
  const hasSentenceEnding = /[.!?)]["'”’]*$/.test(ending);
  const endsWithDanglingPunctuation = /[,;:([/-]$/.test(ending);
  const endsWithDanglingWord = /^(a|i|k|s|v|z|do|na|po|pro|při|ve|ze|že|aby|kdyby|pokud|protože|který|která|které|nebo|zejména)$/i.test(lastWord);
  const openParentheses = (normalized.match(/\(/g) || []).length > (normalized.match(/\)/g) || []).length;

  if (normalized.length > 900 && !hasSentenceEnding) {
    reasons.push('Text nekončí ukončenou větou.');
  }
  if (endsWithDanglingPunctuation || endsWithDanglingWord) {
    reasons.push('Text končí rozpracovanou formulací.');
  }
  if (openParentheses) {
    reasons.push('Text má neuzavřenou závorku.');
  }

  return { isSuspicious: reasons.length > 0, reasons };
};

const AI_SAFETY_BASE = 'Jsi odborný asistent pro zpracování interních záznamů projektu „Podpora sociální práce v Moravském Berouně II“. Pracuj pouze s výslovně uvedenými údaji. Nevymýšlej osoby, diagnózy, výsledky, rozhodnutí, termíny ani služby. Piš česky, věcně, profesionálně a auditně obhajitelně.';

const KA2_NETWORK_SYSTEM_PROMPT = `${AI_SAFETY_BASE}

Vytváříš projektový zápis aktivity KA2 – Tvorba sítě. Zápis se netýká individuální klientské podpory, ale rozvoje, koordinace, udržení nebo rozšíření partnerské sítě. Všechny obsahové informace čerpej z jediného vstupního pole Popis. Rozděl je do polí description, outcome a nextSteps. Nevymýšlej osoby, rozhodnutí, úkoly, odpovědnosti ani termíny. Pokud pro některé pole není ve vstupním Popisu podklad, vrať v něm text Neuvedeno. Vrať pouze JSON podle zadaného schématu.`;

const fetchGemini = (model, payload, sensitiveTerms = []) => fetch('/api/gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: model || DEFAULT_AI_MODEL, payload, sensitiveTerms })
});

const buildSafeGeneratorUserPrompt = (config, client, fields) => {
  const safeClient = sanitizeAiInput(client || {});
  const safeFields = sanitizeAiInput(fields || {});
  return redactClientIdentifiers(config.buildUserPrompt({ client: safeClient, fields: safeFields }), client);
};

const KA02_ACTIVITY_AI_CONTEXT = `
KA2 je v této aplikaci zaměřena na case management, koordinaci podpory klienta a tvorbu či udržování partnerské sítě.

Při generování zápisů v KA2 pracuj zejména s tím, co bylo skutečně projednáno, kteří aktéři byli zapojeni, jaký byl výsledek jednání a jaký navazující krok byl domluven.

Kontext používej pouze k návaznosti a věcnému zasazení textu. Nepřidávej nové instituce, služby, dohody, úkoly ani termíny, pokud nejsou uvedené v aktuálním záznamu.
`.trim();

const CURRENT_ACTIVITY_ENTITY_TYPES = new Set([
  'network_activities',
  'plans',
  'consultations',
  'debt_cases',
  'therapy_sessions',
  'cv_outputs',
  'job_simulators',
  'tpm_records',
  'employment_records'
]);
const ZOR_ACTIVITY_ENTITY_TYPES = new Set([
  ...CURRENT_ACTIVITY_ENTITY_TYPES,
  'education_records',
  'supervision_records'
]);

const getRecordClientIds = (record) => (
  Array.isArray(record?.clientIds)
    ? record.clientIds.filter(Boolean)
    : record?.clientId
      ? [record.clientId]
      : []
);

const getUniqueKa1ClientSupportRecords = (sourceRecords) => {
  const seen = new Set();
  return (sourceRecords || []).filter((record) => {
    if (record.isSynthetic || record.entityType !== 'consultations') return false;
    const normalizedKa = String(getEffectiveRecordKa(record) || record.ka || '').trim().toUpperCase();
    if (!['KA1', 'KA01'].includes(normalizedKa) || record.payload?.caseManagementMode) return false;
    const clientIds = getRecordClientIds(record);
    if (!clientIds.length) return false;
    const payload = record.payload || {};
    const key = [
      [...clientIds].sort().join(','),
      record.activityDate || '',
      payload.startTime || payload.ka02StartTime || '',
      payload.endTime || payload.ka02EndTime || '',
      Number(payload.durationMinutes || 0),
      payload.consultationType || record.title || '',
      record.documentText || payload.topics || '',
      payload.outcome || '',
      payload.nextSteps || ''
    ].map((value) => String(value).trim()).join('|').toLocaleLowerCase('cs');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const CLIENT_JOURNEY_ENTITY_TYPES = new Set([
  'plans',
  'consultations',
  'debt_cases',
  'therapy_sessions',
  'cv_outputs',
  'job_simulators',
  'tpm_records',
  'employment_records'
]);

const CLIENT_JOURNEY_META = {
  project_entry: { stage: 'Vstup', label: 'Zařazení klienta', tone: 'slate', icon: Calendar },
  plans: { stage: 'KA02', label: 'Plán rozvoje', tone: 'blue', icon: Target },
  consultations: { stage: 'KA02', label: 'Konzultace', tone: 'blue', icon: MessageSquare },
  debt_cases: { stage: 'KA02', label: 'Dluhové poradenství', tone: 'blue', icon: Scale },
  therapy_sessions: { stage: 'KA02', label: 'Terapie', tone: 'blue', icon: Brain },
  job_simulators: { stage: 'KA02', label: 'Pracovní simulátor', tone: 'blue', icon: Presentation },
};

const JOURNEY_TONE_CLASSES = {
  slate: {
    dot: 'bg-slate-400',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    panel: 'border-slate-200 bg-white'
  },
  blue: {
    dot: 'bg-blue-500',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    panel: 'border-blue-100 bg-blue-50/40'
  },
  amber: {
    dot: 'bg-amber-500',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    panel: 'border-amber-100 bg-amber-50/40'
  },
  emerald: {
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    panel: 'border-emerald-100 bg-emerald-50/40'
  }
};

function formatDateLabel(value) {
  if (!value) return 'Bez data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('cs-CZ').format(parsed);
}

function parseDateForSort(value) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const normalized = String(value).trim();
  const isoDate = new Date(normalized);
  if (!Number.isNaN(isoDate.getTime())) return isoDate.getTime();
  const czechDate = normalized.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (czechDate) {
    const [, day, month, year] = czechDate;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }
  return 0;
}

function compareTimelineRecordsDesc(a, b) {
  if (a.entityType === 'project_entry' && b.entityType !== 'project_entry') return 1;
  if (b.entityType === 'project_entry' && a.entityType !== 'project_entry') return -1;
  const dateDiff = parseDateForSort(b.activityDate) - parseDateForSort(a.activityDate);
  if (dateDiff !== 0) return dateDiff;
  const createdDiff = Number(b.createdAt || 0) - Number(a.createdAt || 0);
  if (createdDiff !== 0) return createdDiff;
  return String(a.title || '').localeCompare(String(b.title || ''), 'cs');
}

function timeToMinutesForSupport(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getGeneratorSupportMinutes(draft) {
  if (draft.selectedKey === 'plan') return Number(draft.planDurationMinutes || 0);
  if (draft.selectedKey === 'cv') return Number(draft.cvDurationMinutes || 0);
  const startMinutes = timeToMinutesForSupport(draft.ka02StartTime);
  const endMinutes = timeToMinutesForSupport(draft.ka02EndTime);
  if (startMinutes !== null && endMinutes !== null) {
    const duration = endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes;
    if (duration > 0) return duration;
  }
  return Number(draft.durationMinutes || 0);
}

function formatSupportDuration(minutes) {
  const value = Number(minutes || 0);
  if (!Number.isFinite(value) || value <= 0) return 'není zadána';
  const hours = value / 60;
  const hoursLabel = Number.isInteger(hours) ? String(hours) : String(hours).replace('.', ',');
  return `${value} minut (${hoursLabel} h)`;
}

function formatSupportMinutes(value) {
  const totalMinutes = Math.max(0, Math.round(Number(value || 0)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours} h ${minutes} min`;
  if (hours) return `${hours} h`;
  return `${minutes} min`;
}

function getEffectiveGeneratorKa(config, draft = {}) {
  if (draft?.caseManagementMode) return 'KA2';
  return config?.ka || '';
}

function buildExactGeneratorFacts(config, draft) {
  const effectiveKa = getEffectiveGeneratorKa(config, draft);
  return [
    'AKTUÁLNÍ AKTIVITA – závazná data z formuláře:',
    `Typ dokumentu: ${config.label}`,
    `KA: ${effectiveKa}`,
    `Datum aktivity: ${draft.date || todayIso()}`,
    `Pracovník: ${draft.worker || 'Neuvedeno'}`,
    `Délka podpory: ${formatSupportDuration(getGeneratorSupportMinutes(draft))}`,
    '',
    'Tato část je jediný zdroj faktů pro aktuální zápis. Datum, KA ani délku podpory neměň, nepřepisuj a nenahrazuj odhadem.'
  ].join('\n');
}

function getClientJourneyMeta(record) {
  const payload = record.payload || {};
  const recordKa = String(record.ka || '').toUpperCase();
  const isKa1 = recordKa === 'KA1' || recordKa === 'KA01';
  const isKa2 = recordKa === 'KA2' || recordKa === 'KA02' || Boolean(payload.caseManagementMode);

  if (record.entityType === 'plans') {
    return { stage: 'KA1', label: 'Individuální plán rozvoje', tone: 'emerald', icon: Target };
  }

  if (record.entityType === 'consultations') {
    if (isKa2) {
      return {
        stage: 'KA2',
        label: payload.consultationType || 'Case management',
        tone: 'blue',
        icon: MessageSquare
      };
    }

    if (isKa1) {
      return {
        stage: 'KA1',
        label: payload.consultationType || 'Individuální podpora',
        tone: 'emerald',
        icon: MessageSquare
      };
    }
  }

  return CLIENT_JOURNEY_META[record.entityType] || {
    stage: record.ka || 'Dokument',
    label: record.entityType || 'Záznam',
    tone: 'slate',
    icon: FileText
  };
}
function buildClientJourneySummary(record) {
  if (record.entityType === 'project_entry') {
    return record.summary || 'Klient byl zařazen do projektu a otevřela se jeho klientská cesta.';
  }

  const payload = record.payload || {};
  const specificSummary = {
    plans: record.situationDescription || payload.situationDescription || payload.currentSituation || payload.plannedSteps,
    consultations: payload.topics || payload.outcome || payload.nextSteps,
    debt_cases: payload.debtSummary || payload.solutionPlan || payload.educationTopic,
    therapy_sessions: payload.themes || payload.recommendations || payload.mentalState,
    cv_outputs: payload.targetJob || payload.skills || payload.experience,
    job_simulators: payload.position || payload.feedback || payload.committee,
    tpm_records: [payload.employer, payload.workplace].filter(Boolean).join(' • '),
    employment_records: [payload.employmentType, payload.employmentStatus, payload.sustainabilitySupport].filter(Boolean).join(' • ')
  }[record.entityType];

  const textSource = specificSummary || record.documentText || JSON.stringify(payload || {});
  return truncate(cleanGeneratedText(textSource || 'Bez doplňujícího shrnutí.'), 220);
}

function formatCaseSummaryDate(value) {
  if (!value) return '';
  const dateValue = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return String(value);
  return new Intl.DateTimeFormat('cs-CZ').format(dateValue);
}

function safeParsePlanGoals(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getPlanGoals(planRecord) {
  if (!planRecord) return [];
  const directGoals = safeParsePlanGoals(planRecord.goals);
  if (directGoals.length) return directGoals;
  const payloadGoals = safeParsePlanGoals(planRecord.payload?.goals);
  if (payloadGoals.length) return payloadGoals;
  const structuredGoals = safeParsePlanGoals(planRecord.payload?.structuredGoals);
  if (structuredGoals.length) return structuredGoals;
  return safeParsePlanGoals(planRecord.cile_json || planRecord.payload?.cile_json);
}


const GOAL_DEADLINE_WARNING_DAYS = 30;

function parseGoalDeadline(value) {
  const time = parseDateForSort(value);
  if (!time) return 0;
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function isGoalEvaluatedOrClosed(goal, planRecord = null) {
  return isGoalTerminal(goal) ||
    Boolean(String(goal?.goalEvaluation || '').trim()) ||
    Boolean(String(planRecord?.finalEvaluation || planRecord?.payload?.finalEvaluation || '').trim());
}

function getGoalDescription(goal, index) {
  return cleanGeneratedText(goal?.goalDescription || goal?.description || goal?.title || `Cíl ${index + 1}`);
}

function buildGoalDeadlineAlerts({ clients = [], records = [], warningDays = GOAL_DEADLINE_WARNING_DAYS, referenceDate = todayIso() }) {
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const latestPlanByClient = new Map();
  records
    .filter((record) => record.entityType === 'plans' && record.clientId && clientById.has(record.clientId))
    .forEach((record) => {
      const current = latestPlanByClient.get(record.clientId);
      const recordTime = parseDateForSort(record.activityDate || record.updatedAt || record.createdAt);
      const currentTime = current ? parseDateForSort(current.activityDate || current.updatedAt || current.createdAt) : 0;
      if (!current || recordTime >= currentTime) latestPlanByClient.set(record.clientId, record);
    });

  const today = parseGoalDeadline(referenceDate) || parseGoalDeadline(todayIso());
  const dayMs = 24 * 60 * 60 * 1000;
  const approaching = [];
  const overdue = [];

  latestPlanByClient.forEach((planRecord, clientId) => {
    const client = clientById.get(clientId);
    getPlanGoals(planRecord).forEach((goal, index) => {
      const deadlineTime = parseGoalDeadline(goal.targetDate || goal.deadline || goal.term || '');
      if (!deadlineTime || isGoalEvaluatedOrClosed(goal, planRecord)) return;
      const daysUntil = Math.ceil((deadlineTime - today) / dayMs);
      const item = {
        clientId,
        clientName: client?.fullName || planRecord.clientName || clientId,
        keyWorker: client?.keyWorker || '',
        goalLabel: truncate(getGoalDescription(goal, index), 90),
        deadline: new Date(deadlineTime).toISOString().slice(0, 10),
        daysUntil
      };
      if (daysUntil < 0) overdue.push({ ...item, daysOverdue: Math.abs(daysUntil) });
      else if (daysUntil <= warningDays) approaching.push(item);
    });
  });

  approaching.sort((a, b) => a.daysUntil - b.daysUntil || a.clientName.localeCompare(b.clientName, 'cs'));
  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue || a.clientName.localeCompare(b.clientName, 'cs'));
  return { approaching, overdue, total: approaching.length + overdue.length };
}

function normalizePlanGoalForAi(goal, index) {
  return {
    goalId: goal.goalId || goal.id || `goal-${index + 1}`,
    goalDescription: cleanGeneratedText(goal.goalDescription || ''),
    actionSteps: cleanGeneratedText(goal.actionSteps || ''),
    deadline: goal.deadline || goal.targetDate || '',
    goalStatus: normalizeGoalStatus(goal),
    isCompleted: isGoalCompleted(goal),
    goalEvaluation: cleanGeneratedText(goal.goalEvaluation || '')
  };
}

function buildStructuredPlanForAi(record) {
  const payload = record.payload || {};
  return {
    situationDescription: cleanGeneratedText(record.situationDescription || payload.situationDescription || ''),
    goals: getPlanGoals(record).map(normalizePlanGoalForAi),
    finalEvaluation: cleanGeneratedText(record.finalEvaluation || payload.finalEvaluation || '')
  };
}

function buildStructuredPlanFallback(rawValue, sourceRecord) {
  const structured = buildStructuredPlanForAi(sourceRecord);
  return {
    ...structured,
    acceptedPlanText: cleanGeneratedText(rawValue || '') || buildPersonalDevelopmentPlanText(sourceRecord, null)
  };
}

function parseStructuredPlanAiResult(rawValue, sourceRecord) {
  const rawText = cleanGeneratedText(rawValue || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('AI nevrátila strukturovaný návrh plánu ve formátu JSON.');

  let parsed;
  try {
    parsed = JSON.parse(rawText.slice(start, end + 1));
  } catch (error) {
    throw new Error('AI vrátila neplatný JSON pro individuální plán.');
  }
  const sourceGoals = getPlanGoals(sourceRecord);
  const aiGoals = Array.isArray(parsed.goals) ? parsed.goals : [];
  validatePlanOutput(
    { ...parsed, goals: aiGoals.map((goal) => ({ ...goal, deadline: goal.deadline ?? goal.targetDate ?? '' })) },
    { goals: sourceGoals.map((goal, index) => ({ goalId: String(goal.goalId || goal.id || `goal-${index + 1}`), goalDescription: goal.goalDescription || '', actionSteps: Array.isArray(goal.actionSteps) ? goal.actionSteps.join('\n') : goal.actionSteps || '', deadline: goal.deadline ?? goal.targetDate ?? '' })), finalEvaluation: sourceRecord.finalEvaluation || sourceRecord.payload?.finalEvaluation || '' }
  );
  const sourceGoalById = new Map(
    sourceGoals.map((goal, index) => [String(goal.goalId || goal.id || `goal-${index + 1}`), { goal, index }])
  );

  const goals = sourceGoals.map((sourceGoal, index) => {
    const goalId = String(sourceGoal.goalId || sourceGoal.id || `goal-${index + 1}`);
    const aiGoal = aiGoals.find((goal) => String(goal.goalId || '') === goalId) || aiGoals[index] || {};
    return {
      ...sourceGoal,
      goalId,
      goalDescription: cleanGeneratedText(aiGoal.goalDescription || sourceGoal.goalDescription || ''),
      actionSteps: cleanGeneratedText(aiGoal.actionSteps || sourceGoal.actionSteps || ''),
      targetDate: sourceGoal.targetDate || null,
      goalStatus: normalizeGoalStatus(sourceGoal),
      isCompleted: isGoalCompleted(sourceGoal),
      goalEvaluation: isGoalTerminal(sourceGoal) ? cleanGeneratedText(aiGoal.goalEvaluation || sourceGoal.goalEvaluation || '') : ''
    };
  });

  return {
    situationDescription: cleanGeneratedText(parsed.situationDescription || sourceRecord.situationDescription || sourceRecord.payload?.situationDescription || ''),
    goals,
    finalEvaluation: cleanGeneratedText(sourceRecord.finalEvaluation || sourceRecord.payload?.finalEvaluation || ''),
    acceptedPlanText: cleanGeneratedText(parsed.acceptedPlanText || '')
  };
}

function buildAcceptedPlanTextFromStructuredDraft(structuredDraft) {
  const lines = ['Individuální plán rozvoje klienta.', '', 'Popis situace:', structuredDraft.situationDescription || '', '', 'Cíle a kroky:'];
  (structuredDraft.goals || []).forEach((goal, index) => {
    lines.push(`${index + 1}. Cíl: ${goal.goalDescription || ''}`);
    lines.push(`Akční kroky: ${goal.actionSteps || ''}`);
    if (goal.targetDate || goal.deadline) lines.push(`Termín: ${String(goal.targetDate || goal.deadline).slice(0, 10)}`);
    lines.push(`Stav: ${goalStatusLabel(goal).toLowerCase()}`);
    if (isGoalTerminal(goal) && goal.goalEvaluation) lines.push(`Vyhodnocení cíle: ${goal.goalEvaluation}`);
  });
  if (structuredDraft.finalEvaluation) lines.push('', 'Závěrečné vyhodnocení:', structuredDraft.finalEvaluation);
  return lines.join('\n').trim();
}

function buildPlanRecordWithStructuredDraft(record, structuredDraft, client = null) {
  const payload = record.payload || {};
  const updatedRecord = {
    ...record,
    situationDescription: structuredDraft.situationDescription,
    goals: structuredDraft.goals,
    finalEvaluation: structuredDraft.finalEvaluation || '',
    acceptedPlanText: structuredDraft.acceptedPlanText || '',
    payload: {
      ...payload,
      situationDescription: structuredDraft.situationDescription,
      goals: structuredDraft.goals,
      structuredGoals: structuredDraft.goals,
      finalEvaluation: structuredDraft.finalEvaluation || '',
      acceptedPlanText: structuredDraft.acceptedPlanText || '',
      structuredPersonalDevelopmentPlan: true
    }
  };
  return {
    ...updatedRecord,
    documentText: structuredDraft.acceptedPlanText || buildPersonalDevelopmentPlanText(updatedRecord, client)
  };
}
function buildPersonalDevelopmentPlanText(planRecord, client = null) {
  if (!planRecord) return '';
  const payload = planRecord.payload || {};
  const acceptedPlanText = cleanGeneratedText(planRecord.acceptedPlanText || payload.acceptedPlanText || '');
  if (acceptedPlanText) return acceptedPlanText;
  const goals = getPlanGoals(planRecord);
  const lines = [
    'Individuální plán rozvoje',
    '',
    `Klient: ${client?.fullName || planRecord.clientName || 'Neuvedeno'}`,
    `Datum plánu: ${formatDateLabel(planRecord.activityDate)}`,
    `Pracovník: ${planRecord.worker || 'Neuvedeno'}`,
    '',
    'Popis situace',
    planRecord.situationDescription || payload.situationDescription || 'Neuvedeno',
    '',
    '',
    'Cíle a plánované kroky'
  ];

  if (goals.length) {
    goals.forEach((goal, index) => {
      const targetDate = formatCaseSummaryDate(goal.targetDate);
      lines.push(`${index + 1}. ${cleanGeneratedText(goal.goalDescription || 'Bez popisu cíle.')}`);
      if (goal.actionSteps) lines.push(`   Kroky: ${cleanGeneratedText(goal.actionSteps)}`);
      if (targetDate) lines.push(`   Termín: ${targetDate}`);
      lines.push(`   Stav: ${goalStatusLabel(goal).toLowerCase()}`);
      if (goal.goalEvaluation) lines.push(`   Vyhodnocení: ${cleanGeneratedText(goal.goalEvaluation)}`);
    });
  } else {
    lines.push('Cíle zatím nejsou doplněné.');
  }

  const finalEvaluation = planRecord.finalEvaluation || payload.finalEvaluation || '';
  if (finalEvaluation) {
    lines.push('', 'Závěrečné vyhodnocení', cleanGeneratedText(finalEvaluation));
  }

  const documentText = cleanGeneratedText(planRecord.documentText || '');
  if (documentText && !documentText.includes('První cíl:')) {
    lines.push('', 'Text zápisu', documentText);
  }

  return lines.join('\n');
}

function buildClientIndicatorRows(timeline) {
  const records = timeline.filter((record) => !record.isSynthetic);
  const countByType = (entityType) => records.filter((record) => record.entityType === entityType).length;
  const hasAny = (entityTypes) => records.some((record) => entityTypes.includes(record.entityType));
  const supportRecords = records.filter((record) => ['consultations', 'case_management'].includes(record.entityType));

  return [
    { ka: 'KA1', label: 'Individuální plány', target: TARGETS.ka02Plans, value: countByType('plans'), note: countByType('plans') ? 'evidováno' : 'neevidováno' },
    { ka: 'KA1', label: 'Individuální podpora', target: TARGETS.ka02Consultations, value: supportRecords.length, note: supportRecords.length ? 'počet zápisů podpory' : 'bez zápisu podpory' },
    { ka: 'KA1/KA2', label: 'Klient se zaznamenanou podporou', target: TARGETS.ka02SupportedClients, value: hasAny(['plans', 'consultations', 'case_management']) ? 1 : 0, note: 'unikátní klient s plánem nebo podporou' }
  ];
}

function buildClientIndicatorTable(timeline) {
  const rows = buildClientIndicatorRows(timeline);
  return [
    '| KA | Indikátor | Cíl projektu | Hodnota za klienta | Dopad / poznámka |',
    '|---|---|---:|---:|---|',
    ...rows.map((row) => `| ${row.ka} | ${row.label} | ${row.target} | ${row.value} | ${row.note} |`)
  ].join('\n');
}

function buildClientCaseQualityWarnings(client, timeline) {
  const records = timeline.filter((record) => !record.isSynthetic);
  const entryTime = parseDateForSort(client.datumVstupu || client.datumZarazeni || '');
  const warnings = [];
  const planRecords = records.filter((record) => record.entityType === 'plans');
  const goals = planRecords.flatMap(getPlanGoals);
  const activityRecords = records.filter((record) => record.entityType !== 'plans');

  if (!planRecords.length) warnings.push('Chybí individuální plán rozvoje.');
  if (planRecords.length > 1) warnings.push(`Klient má více uložených plánů osobního rozvoje (${planRecords.length}). Ověřit, který je aktuální.`);
  if (!goals.length) warnings.push('Individuální plán rozvoje neobsahuje konkrétní cíle.');
  if (activityRecords.length && !planRecords.length) warnings.push('Existují navazující aktivity, ale chybí individuální plán rozvoje.');
  if (entryTime) {
    const beforeEntry = records.filter((record) => parseDateForSort(record.activityDate) && parseDateForSort(record.activityDate) < entryTime);
    if (beforeEntry.length) warnings.push(`Některé podpory jsou evidované před vstupem klienta do projektu (${beforeEntry.length} záznamů).`);
  }

  const unsupportedGoalLinks = activityRecords.filter((record) => !record.linkedPlanGoalId && !record.payload?.linkedPlanGoalId);
  if (unsupportedGoalLinks.length) warnings.push(`Některé navazující podpory nemají vazbu na cíl IPR (${unsupportedGoalLinks.length} záznamů).`);


  const closedGoals = goals.filter(isGoalTerminal);
  const goalsMissingEvaluation = closedGoals.filter((goal) => !String(goal.goalEvaluation || '').trim());
  if (goalsMissingEvaluation.length) warnings.push(`Některé uzavřené cíle nemají vyplněné hodnocení (${goalsMissingEvaluation.length}).`);
  if (goals.length && goals.every((goal) => isGoalTerminal(goal) && String(goal.goalEvaluation || '').trim()) && !planRecords.some((record) => String(record.finalEvaluation || record.payload?.finalEvaluation || '').trim())) {
    warnings.push('Všechny cíle jsou uzavřené a vyhodnocené, ale chybí závěrečné vyhodnocení plánu.');
  }

  return warnings;
}

function buildClientCaseSummary(client, timeline, supportBreakdown) {
  const planRecords = timeline.filter((record) => record.entityType === 'plans');
  const planRecord =
    planRecords
      .slice()
      .reverse()
      .find((record) => getPlanGoals(record).some((goal) => String(goal.goalDescription || '').trim())) ||
    planRecords[planRecords.length - 1] ||
    null;
  const goals = getPlanGoals(planRecord);
  const activityRecords = timeline.filter((record) => !record.isSynthetic && record.entityType !== 'plans');
  const byType = activityRecords.reduce((acc, record) => {
    const meta = getClientJourneyMeta(record);
    const key = `${meta.stage} - ${meta.label}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const completedGoals = goals.filter(isGoalCompleted).length;
  const evaluatedGoals = goals.filter((goal) => isGoalTerminal(goal) && String(goal.goalEvaluation || '').trim()).length;
  const allGoalsEvaluated = goals.length > 0 && goals.every((goal) => isGoalTerminal(goal) && String(goal.goalEvaluation || '').trim());
  const finalEvaluation = String(planRecord?.finalEvaluation || planRecord?.payload?.finalEvaluation || '').trim();

  const lines = [
    `Souhrn zakázky klienta - ${client.fullName}`,
    '',
    'Základní údaje',
    `- Status: ${client.projectStatusLabel || 'neuvedeno'}`,
    `- Vstup do projektu: ${formatDateLabel(client.datumVstupu || client.datumZarazeni || '')}`,
    `- Postavení na trhu práce: ${client.postaveniNaTrhu || 'neuvedeno'}`,
    `- Vzdělání: ${client.vzdelani || 'neuvedeno'}`,
    `- Znevýhodnění / bariéry z registru: ${client.znevyhodneni || 'neuvedeno'}`,
    '',
    'Individuální plán rozvoje',
    `- Popis situace: ${planRecord?.situationDescription || planRecord?.payload?.situationDescription || 'zatím neuvedeno'}`,
    `- Cíle: ${goals.length} celkem, ${completedGoals} splněno, ${evaluatedGoals} vyhodnoceno`,
    '',
    'Cíle'
  ];

  if (goals.length) {
    goals.forEach((goal, index) => {
      const targetDate = formatCaseSummaryDate(goal.targetDate);
      lines.push(`${index + 1}. ${cleanGeneratedText(goal.goalDescription || 'Bez popisu cíle.')}`);
      lines.push(`   Stav: ${goalStatusLabel(goal).toLowerCase()}${targetDate ? `, termín: ${targetDate}` : ''}`);
      if (isGoalTerminal(goal) && String(goal.goalEvaluation || '').trim()) {
        lines.push(`   Vyhodnocení cíle: ${cleanGeneratedText(goal.goalEvaluation)}`);
      }
    });
  } else {
    lines.push('- Plán zatím neobsahuje konkrétní cíle.');
  }

  lines.push('', 'Realizované záznamy');
  if (Object.keys(byType).length) {
    Object.entries(byType).forEach(([label, count]) => lines.push(`- ${label}: ${count}x`));
  } else {
    lines.push('- Zatím nejsou uložené navazující aktivity.');
  }
  lines.push(
    `- Celkový rozsah podpory: ${(supportBreakdown.totalHours || 0).toFixed(1)} h`,
    `- Počet dokumentů / záznamů: ${supportBreakdown.totalDocuments || activityRecords.length}`
  );

  if (activityRecords.length) {
    lines.push('', 'Stručná časová osa');
    activityRecords.slice(-12).forEach((record) => {
      const meta = getClientJourneyMeta(record);
      lines.push(`- ${formatDateLabel(record.activityDate)} - ${meta.label}: ${buildClientJourneySummary(record)}`);
    });
    if (activityRecords.length > 12) {
      lines.push(`- ... další záznamy: ${activityRecords.length - 12}`);
    }
  }

  lines.push('', 'Závěrečné vyhodnocení cílů');
  if (finalEvaluation) {
    lines.push(finalEvaluation);
  } else if (allGoalsEvaluated) {
    lines.push('Všechny cíle jsou uzavřené a slovně vyhodnocené. Závěrečné slovní vyhodnocení ještě není doplněné v plánu osobního rozvoje.');
  } else {
    lines.push('Závěrečné vyhodnocení zatím není kompletní, protože nejsou uzavřené a vyhodnocené všechny cíle v plánu osobního rozvoje.');
  }

  return lines.join('\n');
}

function buildAiClientCaseSummaryPrompt(client, timeline, supportBreakdown) {
  const deterministicSummary = redactClientIdentifiers(buildClientCaseSummary(sanitizeAiInput(client), timeline, supportBreakdown), client);
  return buildClientCaseAiPrompt(deterministicSummary);
}

function buildClientJourneyDetail(record, client = null) {
  if (record.entityType === 'project_entry') {
    return record.summary || 'Klient byl zařazen do projektu.';
  }

  if (record.entityType === 'plans') {
    return buildPersonalDevelopmentPlanText(record, client);
  }

  const documentText = cleanGeneratedText(record.documentText || '');
  if (documentText) return documentText;

  const payloadEntries = Object.entries(record.payload || {})
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ?value.join(', ') : String(value)}`);

  return payloadEntries.join('\n') || 'Zápis neobsahuje další detail.';
}

function buildPreviousRecordContext(record, index = 0) {
  if (!record) return '';
  const dateLabel = formatDateLabel(record.activityDate);
  const summary = buildClientJourneySummary(record);
  const documentPreview = truncate(cleanGeneratedText(record.documentText || ''), 650);
  return [
    `${index + 1}. ${dateLabel} | ${record.title || 'Bez názvu'}`,
    summary ?`Shrnutí: ${summary}` : '',
    documentPreview ?`Krátká ukázka textu: ${documentPreview}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

function buildPreviousRecordsContext(records = []) {
  const items = Array.isArray(records) ? records.filter(Boolean).slice(0, 3) : [];
  if (!items.length) return '';
  return [
    'KONTEXT Z PŘEDCHOZÍCH ZÁZNAMŮ – pouze pro pochopení návaznosti, nesmí být použit jako nový fakt aktuální aktivity.',
    items.map((record, index) => buildPreviousRecordContext(record, index)).join('\n\n'),
    '',
    'Pravidla pro použití kontextu: můžeš napsat obecnou návaznost typu „v návaznosti na dříve řešenou situaci“, ale nepřebírej z kontextu konkrétní úkony, instituce, výsledky, dohody, termíny ani další kroky, pokud nejsou výslovně uvedeny v aktuální aktivitě.'
  ].join('\n');
}

function isDateWithinPeriod(dateValue, period) {
  if (!period || period.value === 'all') return true;
  if (!dateValue) return false;
  const valueTime = parseDateForSort(dateValue);
  const startTime = parseDateForSort(period.start);
  const endTime = parseDateForSort(period.end);
  if (!valueTime || !startTime || !endTime) return false;
  return valueTime >= startTime && valueTime <= endTime;
}

function buildArchivedZorText() {
  return '';
}

function extractPlanSections(text) {
  const normalized = cleanGeneratedText(text || '');
  const headingMap = {
    'Identifikace klienta': 'clientIdentification',
    'Východzí situace klienta': 'currentSituation',
    'Výchozí situace klienta': 'currentSituation',
    'Silné stránky a zdroje klienta': 'strengthsResources',
    'Bariéry vstupu na trh práce': 'barriers',
    'Identifikované bariéry vstupu na trh práce': 'barriers',
    'Hlavní cíl spolupráce': 'mainGoal',
    'Dílčí cíle': 'subGoals',
    'Dílčí cíle spolupráce': 'subGoals',
    'Plánované kroky podpory': 'plannedSteps',
    'Zapojení dalších služeb nebo aktérů': 'otherServices',
    'Zapojení dalších služeb': 'otherServices',
    'Vyhodnocování a aktualizace plánu': 'evaluationUpdates'
  };

  const sections = {};
  let currentKey = '';
  normalized.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const mappedKey = headingMap[trimmed];
    if (mappedKey) {
      currentKey = mappedKey;
      if (!sections[currentKey]) sections[currentKey] = '';
      return;
    }
    if (currentKey) {
      sections[currentKey] = sections[currentKey]
        ? `${sections[currentKey]} ${trimmed}`.trim()
        : trimmed;
    }
  });
  return sections;
}

function formatDateForDocument(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('cs-CZ').format(parsed);
}

function buildPlanTemplatePayload(client, draft, generatedText) {
  const sections = extractPlanSections(generatedText);
  const clientIdentification =
    sections.clientIdentification ||
    [
      `Klient ${client.fullName}.`,
      client.postaveniNaTrhu ?`Postavení na trhu práce: ${client.postaveniNaTrhu}.` : '',
      client.vzdelani ?`Vzdělání: ${client.vzdelani}.` : '',
      client.znevyhodneni ?`Znevýhodnění: ${client.znevyhodneni}.` : ''
    ]
      .filter(Boolean)
      .join(' ');

  return {
    filename: `plan-osobniho-rozvoje-${slugify(client.fullName)}.docx`,
    clientIdentification,
    currentSituation: sections.currentSituation || draft.currentSituation || '',
    strengthsResources: sections.strengthsResources || 'Silné stránky a zdroje klienta budou dále průběžně doplňovány v rámci spolupráce.',
    barriers: sections.barriers || draft.barriers || '',
    mainGoal: sections.mainGoal || draft.goals || '',
    subGoals: sections.subGoals || draft.goals || '',
    plannedSteps: sections.plannedSteps || draft.plannedSteps || '',
    otherServices: sections.otherServices || 'Zapojení dalších služeb bude upřesňováno dle aktuálních potřeb klienta.',
    evaluationUpdates: sections.evaluationUpdates || 'Plán bude průběžně vyhodnocován a podle potřeby aktualizován.',
    planDate: formatDateForDocument(draft.date),
    workerSignature: draft.worker || ''
  };
}

const VIEW_THEMES = {
  clients: {
    page: 'bg-[radial-gradient(circle_at_top_left,#f7dfb9_0,#f3ead9_32%,#eee7d8_58%,#e8edf0_100%)]',
    header: 'border-amber-200 bg-amber-50/90',
    accent: 'bg-amber-300/25',
    label: 'text-amber-700'
  },
  ka02: {
    page: 'bg-[radial-gradient(circle_at_top_left,#d7f2df_0,#eef4dc_36%,#edf2e6_62%,#e8eef0_100%)]',
    header: 'border-emerald-200 bg-emerald-50/85',
    accent: 'bg-emerald-300/25',
    label: 'text-emerald-700'
  },
  ka2case: {
    page: 'bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#eaf2f8_36%,#edf2f4_62%,#e8edf0_100%)]',
    header: 'border-blue-200 bg-blue-50/85',
    accent: 'bg-blue-300/25',
    label: 'text-blue-700'
  },
  ka01: {
    page: 'bg-[radial-gradient(circle_at_top_left,#eadff5_0,#f1ebf5_36%,#eeeaf1_62%,#e9edf0_100%)]',
    header: 'border-violet-200 bg-violet-50/85',
    accent: 'bg-violet-300/20',
    label: 'text-violet-700'
  },
  education: {
    page: 'bg-[radial-gradient(circle_at_top_left,#fef3c7_0,#f5ead2_36%,#eee8dc_62%,#e8edf0_100%)]',
    header: 'border-amber-200 bg-amber-50/85',
    accent: 'bg-amber-300/20',
    label: 'text-amber-700'
  },
  ka03: {
    page: 'bg-[radial-gradient(circle_at_top_left,#ffd7ba_0,#f7e5d2_34%,#eee4d8_62%,#e8edf1_100%)]',
    header: 'border-orange-200 bg-orange-50/85',
    accent: 'bg-orange-300/25',
    label: 'text-orange-700'
  },
  dashboard: {
    page: 'bg-[radial-gradient(circle_at_top_left,#e2e8f0_0,#edf1f4_36%,#f1eee8_66%,#ebe8e3_100%)]',
    header: 'border-slate-300 bg-slate-100/90',
    accent: 'bg-slate-400/15',
    label: 'text-slate-700'
  }
};

const NAV_THEMES = {
  clients: {
    active: 'border-amber-300 bg-amber-600 text-white shadow-sm shadow-amber-200/70',
    idle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800'
  },
  ka02: {
    active: 'border-emerald-300 bg-emerald-600 text-white shadow-sm shadow-emerald-200/70',
    idle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800'
  },
  ka2case: {
    active: 'border-blue-300 bg-blue-600 text-white shadow-sm shadow-blue-200/70',
    idle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800'
  },
  ka01: {
    active: 'border-violet-300 bg-violet-600 text-white shadow-sm shadow-violet-200/70',
    idle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800'
  },
  education: {
    active: 'border-amber-300 bg-amber-600 text-white shadow-sm shadow-amber-200/70',
    idle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800'
  },
  dashboard: {
    active: 'border-slate-400 bg-slate-700 text-white shadow-sm shadow-slate-300/70',
    idle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-800'
  }
};

function asSheetText(value) {
  if (value == null) return '';
  if (typeof value?.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  return String(value);
}

function asSheetWorker(value) {
  const text = asSheetText(value).trim();
  return text === 'test-user' ? '' : canonicalizeWorkerName(text);
}

function asSheetDate(value) {
  const text = asSheetText(value).trim();
  if (!text) return '';
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
  }
  const czechMatch = text.match(/^(\d{1,2})[.\/]\s*(\d{1,2})[.\/]\s*(\d{4})/);
  if (czechMatch) {
    const [, day, month, year] = czechMatch;
    return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return '';
}

function parseSheetJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function normalizeStatisticsRow(row = {}) {
  const status = asSheetText(row.status).trim().toLowerCase();
  return {
    id: asSheetText(row.statistika_id || row.id),
    sourceRecordId: asSheetText(row.zdrojovy_zaznam_id),
    clientId: asSheetText(row.client_id),
    clientName: asSheetText(row.client_name),
    date: asSheetDate(row.datum || row.created_at),
    period: asSheetText(row.obdobi),
    type: asSheetText(row.typ_statistiky),
    code: asSheetText(row.kod),
    group: asSheetText(row.skupina) || 'Ostatní',
    name: asSheetText(row.nazev) || asSheetText(row.hodnota_text) || asSheetText(row.kod),
    valueText: asSheetText(row.hodnota_text),
    status,
    createdAt: asSheetText(row.created_at),
    updatedAt: asSheetText(row.updated_at)
  };
}

function isActiveStatistic(row = {}) {
  const status = String(row.status || '').toLowerCase();
  return status !== 'ne' && !status.includes('smaz') && !status.includes('neaktiv');
}

function isDateWithinRange(dateValue, dateFrom, dateTo) {
  const valueTime = parseDateForSort(dateValue);
  const fromTime = parseDateForSort(dateFrom);
  const toTime = parseDateForSort(dateTo);
  if (!valueTime || !fromTime || !toTime) return false;
  return valueTime >= fromTime && valueTime <= toTime;
}

function buildKuStatisticsOverview(statisticsRows = [], { dateFrom = '', dateTo = '' } = {}) {
  const activeRows = statisticsRows
    .map(normalizeStatisticsRow)
    .filter((row) =>
      row.type === 'FORMA_POMOCI_KU' &&
      row.code &&
      row.clientId &&
      isActiveStatistic(row) &&
      isDateWithinRange(row.date, dateFrom, dateTo)
    );

  const grouped = new Map();
  activeRows.forEach((row) => {
    const key = `${row.group}|||${row.code}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        group: row.group,
        code: row.code,
        name: row.name,
        clients: new Map(),
        records: 0
      });
    }
    const item = grouped.get(key);
    item.records += 1;
    item.clients.set(row.clientId, row.clientName || row.clientId);
  });

  const rows = Array.from(grouped.values())
    .map((item) => ({
      ...item,
      clientCount: item.clients.size,
      clientNames: Array.from(item.clients.values()).sort((a, b) => a.localeCompare(b, 'cs'))
    }))
    .sort((a, b) => a.group.localeCompare(b.group, 'cs') || a.name.localeCompare(b.name, 'cs'));

  const groups = rows.reduce((accumulator, item) => {
    if (!accumulator[item.group]) accumulator[item.group] = [];
    accumulator[item.group].push(item);
    return accumulator;
  }, {});

  const uniqueClients = new Set(activeRows.map((row) => row.clientId));
  return {
    rows,
    groups,
    totalUniqueClients: uniqueClients.size,
    totalRecords: activeRows.length,
    dateFrom,
    dateTo
  };
}

function buildKuStatisticsDocumentText(overview) {
  const lines = [
    'Přehled konkrétních forem pomoci lidem v rámci projektu',
    `Období: ${formatDateLabel(overview.dateFrom)} – ${formatDateLabel(overview.dateTo)}`,
    '',
    `Celkový počet unikátních osob: ${overview.totalUniqueClients}`,
    `Počet statistických záznamů: ${overview.totalRecords}`,
    ''
  ];

  if (!overview.rows.length) {
    lines.push('Ve zvoleném období nejsou evidovány žádné aktivní položky typu podpory dle KÚ.');
    return lines.join('\n');
  }

  Object.entries(overview.groups).forEach(([group, items]) => {
    lines.push(group);
    items.forEach((item) => {
      lines.push(`- ${item.name}: ${item.clientCount} ${item.clientCount === 1 ? 'osoba' : item.clientCount >= 2 && item.clientCount <= 4 ? 'osoby' : 'osob'}`);
    });
    const groupTotal = new Set(items.flatMap((item) => Array.from(item.clients.keys()))).size;
    lines.push(`Celkem ${group.toLowerCase()}: ${groupTotal} ${groupTotal === 1 ? 'osoba' : groupTotal >= 2 && groupTotal <= 4 ? 'osoby' : 'osob'}`);
    lines.push('');
  });

  return lines.join('\n');
}

function hoursToMinutes(value) {
  if (value === null || value === undefined || value === '') return 0;
  const text = String(value).trim();
  const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    return Number(hours) * 60 + Number(minutes);
  }
  const number = Number(text.replace(',', '.'));
  return Number.isFinite(number) ? Math.round(number * 60) : 0;
}

function stringifyPlanGoals(goals) {
  if (!Array.isArray(goals)) return '';
  return goals
    .map((goal, index) => {
      const title = goal.goalDescription || goal.description || goal.title || goal.text || '';
      const steps = Array.isArray(goal.actionSteps) ? goal.actionSteps.join('\n') : goal.actionSteps || goal.steps || '';
      const deadline = goal.deadline || goal.targetDate || goal.term || '';
      return ['C?l ' + (index + 1) + ': ' + title, steps ? 'Ak?n? kroky: ' + steps : '', deadline ? 'Term?n: ' + deadline : ''].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function mapSheetRecordsToAppRecords({ individualPlans = [], performances = [], meetings = [], networkMeetings = [], partners = [], education = [], supervision = [] }, clientIndex = {}) {
  const clientName = (clientId) => clientIndex[clientId]?.fullName || clientId || '';
  const statusOk = (row) => !String(row.status || '').toLowerCase().includes('smaz');
  const records = [];

  individualPlans.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.plan_id);
    const clientId = asSheetText(row.klient_id);
    if (!id || !clientId) return;
    const goals = parseSheetJson(row.cile_json, []);
    const storedDurationText = asSheetText(row.pocet_minut).trim();
    const storedDurationMinutes = Number(storedDurationText.replace(',', '.'));
    records.push({
      id,
      remoteSource: 'google-sheet',
      entityType: 'plans',
      ka: 'KA1',
      title: 'Individuální plán - ' + clientName(clientId),
      activityDate: asSheetDate(row.updated_at || row.created_at),
      worker: asSheetWorker(row.pracovnik || row.updated_by || row.created_by),
      clientId,
      clientIds: [clientId],
      clientName: clientName(clientId),
      documentText: asSheetText(row.accepted_plan_text),
      goals: Array.isArray(goals) ? goals : [],
      payload: {
        currentSituation: asSheetText(row.popis_situace),
        situationDescription: asSheetText(row.popis_situace),
        goals: Array.isArray(goals) ? goals : [],
        structuredGoals: Array.isArray(goals) ? goals : [],
        plannedSteps: stringifyPlanGoals(goals),
        finalEvaluation: asSheetText(row.zaverecne_vyhodnoceni),
        acceptedPlanText: asSheetText(row.accepted_plan_text),
        durationMinutes: storedDurationText && Number.isFinite(storedDurationMinutes) && storedDurationMinutes >= 0 ? storedDurationMinutes : 60
      },
      indicatorFlags: { ka02Plans: true },
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0,
      expectedUpdatedAt: asSheetText(row.updated_at)
    });
  });

  performances.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.vykon_id);
    const clientId = asSheetText(row.klient_id);
    if (!id || !clientId) return;
    const specific = parseSheetJson(row.specificka_pole_json, {});
    const supportSpecific = { ...(specific.supportSpecific || {}), ...mapSheetColumnsToKA1SupportSpecific(row) };
    records.push({
      id,
      remoteSource: 'google-sheet',
      entityType: 'consultations',
      ka: 'KA1',
      title: asSheetText(row.typ_podpory) || 'Z?pis podpory - ' + clientName(clientId),
      activityDate: asSheetDate(row.datum || row.created_at),
      worker: asSheetWorker(row.pracovnik),
      clientId,
      clientIds: [clientId],
      clientName: clientName(clientId),
      documentText: asSheetText(row.dokument_text),
      documentUrl: asSheetText(row.document_url),
      linkedPlanGoalId: asSheetText(row.cil_ip_id),
      linkedPlanGoalLabel: asSheetText(row.cil_ip),
      payload: {
        ...specific,
        startTime: asSheetText(row.cas_od),
        endTime: asSheetText(row.cas_do),
        durationMinutes: hoursToMinutes(row.pocet_hodin),
        consultationType: asSheetText(row.typ_podpory),
        supportArea: asSheetText(row.tema_podpory),
        supportSpecific,
        topics: asSheetText(row.popis || row.tema_podpory),
        outcome: asSheetText(row.vysledek),
        nextSteps: asSheetText(row.dalsi_krok),
        place: asSheetText(row.forma_poskytovani),
        linkedPlanGoalId: asSheetText(row.cil_ip_id),
        linkedPlanGoalLabel: asSheetText(row.cil_ip),
        caseManagementMode: false
      },
      indicatorFlags: { ka02Consultations: true },
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0,
      expectedUpdatedAt: asSheetText(row.updated_at)
    });
  });

  meetings.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.meeting_id);
    const clientId = asSheetText(row.klient_id);
    if (!id || !clientId) return;
    const registeredPartnerNames = asSheetText(row.partneri).split(';').map((item) => item.trim()).filter(Boolean);
    const participantNames = (asSheetText(row.ucastnici) || asSheetText(row.partneri)).split(';').map((item) => item.trim()).filter(Boolean);
    const registeredNameSet = new Set(registeredPartnerNames);
    const manualPartnerNames = participantNames.filter((name) => !registeredNameSet.has(name));

    records.push({
      id,
      remoteSource: 'google-sheet',
      entityType: 'consultations',
      ka: 'KA2',
      title: asSheetText(row.typ_podpory) || 'Case management - ' + clientName(clientId),
      activityDate: asSheetDate(row.datum || row.created_at),
      worker: asSheetWorker(row.pracovnik),
      clientId,
      clientIds: [clientId],
      clientName: clientName(clientId),
      documentText: asSheetText(row.dokument_text),
      documentUrl: asSheetText(row.document_url),
      linkedPlanGoalId: asSheetText(row.cil_ip_id),
      linkedPlanGoalLabel: asSheetText(row.cil_ip),
      payload: {
        startTime: asSheetText(row.cas_od),
        endTime: asSheetText(row.cas_do),
        durationMinutes: hoursToMinutes(row.pocet_hodin),
        consultationType: asSheetText(row.typ_podpory),
        supportArea: asSheetText(row.tema_podpory),
        topics: asSheetText(row.popis),
        outcome: asSheetText(row.vysledek),
        nextSteps: asSheetText(row.dalsi_krok),
        place: asSheetText(row.forma_poskytovani),
        linkedPlanGoalId: asSheetText(row.cil_ip_id),
        linkedPlanGoalLabel: asSheetText(row.cil_ip),
        selectedPartnerIds: asSheetText(row.partner_ids).split(/[;,]/).map((item) => item.trim()).filter(Boolean),
        registeredPartnerNames,
        manualPartnerNames,
        partnerNames: participantNames,
        partners: participantNames.join('; '),
        participantCount: Number(asSheetText(row.pocet_akteru) || 0),
        caseManagementMode: true
      },
      indicatorFlags: { ka02Consultations: true },
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0,
      expectedUpdatedAt: asSheetText(row.updated_at)
    });
  });

  networkMeetings.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.schuzka_site_id);
    if (!id) return;
    const hasContent = [row.typ_schuzky, row.obsah_jednani, row.vystup, row.dokument_text].some((value) => asSheetText(value).trim());
    if (!hasContent) return;
    records.push({
      id,
      remoteSource: 'google-sheet',
      entityType: 'network_activities',
      ka: 'KA2',
      title: asSheetText(row.typ_schuzky) || 'Z\u00e1znam tvorby s\u00edt\u011b',
      activityDate: asSheetDate(row.datum || row.created_at),
      worker: asSheetWorker(row.pracovnik),
      clientIds: [],
      documentText: asSheetText(row.dokument_text || row.vystup || row.obsah_jednani),
      payload: {
        type: asSheetText(row.typ_schuzky),
        startTime: asSheetText(row.cas_od),
        endTime: asSheetText(row.cas_do),
        place: asSheetText(row.misto),
        participants: [row.partneri, row.rt_clenove, row.dalsi_osoby].map(asSheetText).filter(Boolean).join(', '),
        notes: asSheetText(row.obsah_jednani),
        outcome: asSheetText(row.vystup),
        description: asSheetText(row.dokument_text || row.vystup),
        nextSteps: asSheetText(row.dalsi_kroky),
        partnerIds: asSheetText(row.partner_ids).split(',').map((value) => value.trim()).filter(Boolean),
        partnerNames: asSheetText(row.partneri).split(',').map((value) => value.trim()).filter(Boolean),
        rtMembers: asSheetText(row.rt_clenove).split(',').map((value) => value.trim()).filter(Boolean),
        otherPeople: asSheetText(row.dalsi_osoby).split(',').map((value) => value.trim()).filter(Boolean)
      },
      indicatorFlags: { ka01NetworkActivity: true },
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0,
      expectedUpdatedAt: asSheetText(row.updated_at)
    });
  });

  partners.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.partner_id);
    const name = asSheetText(row.nazev_subjektu || row.subjekt || row.name);
    if (!id && !name) return;
    const contacts = contactsFromSheetRow(row);
    const primaryContact = contacts[0] || createEmptyActorContact();
    records.push({
      id: id || 'partner-' + name,
      remoteSource: 'google-sheet',
      entityType: 'actor_registry',
      ka: 'KA2',
      title: 'Registr akt?ra - ' + (name || id),
      activityDate: asSheetDate(row.datum_zapojeni || row.updated_at || row.created_at),
      worker: asSheetWorker(row.pracovnik || row.updated_by),
      clientIds: [],
      payload: {
        name,
        actorType: asSheetText(row.typ_aktera),
        networkOrigin: asSheetText(row.puvod_site),
        joinedNetworkDate: asSheetDate(row.datum_zapojeni),
        contacts,
        contactName: primaryContact.name,
        contactTitle: primaryContact.title,
        contactFirstName: primaryContact.firstName,
        contactLastName: primaryContact.lastName,
        contactRole: primaryContact.role,
        phone: primaryContact.phone,
        email: primaryContact.email,
        cooperationStatus: asSheetText(row.status) || 'zapojen? akt?r'
      },
      indicatorFlags: { ka01ActorRegistry: true },
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0,
      expectedUpdatedAt: asSheetText(row.updated_at)
    });
  });

  education.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.vzdelavani_id);
    const title = asSheetText(row.nazev_vzdelavani);
    if (!id && !title) return;
    const workers = [
      row.jmeno_pracovnika1 || row.jmeno_pracovnika,
      row.jmeno_pracovnika2,
      row.jmeno_pracovnika3
    ].map(asSheetWorker).filter(Boolean);
    records.push({
      id: id || 'vzdelavani-' + title,
      remoteSource: 'google-sheet',
      entityType: 'education_records',
      ka: 'VZDELAVANI',
      title: title || 'Vzdělávání',
      activityDate: asSheetDate(row.datum || row.created_at),
      worker: workers[0] || '',
      clientIds: [],
      documentText: title || '',
      payload: {
        date: asSheetDate(row.datum || row.created_at),
        hours: asSheetText(row.pocet_hodin),
        title,
        accreditationNumber: asSheetText(row.cislo_akreditace),
        worker: workers[0] || '',
        workers
      },
      indicatorFlags: {},
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0,
      expectedUpdatedAt: asSheetText(row.updated_at)
    });
  });

  supervision.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.sepervize_id);
    const type = asSheetText(row.typ_supervize);
    if (!id && !type) return;
    const workers = [row.jmeno_pracovnika1, row.jmeno_pracovnika2, row.jmeno_pracovnika3]
      .map(asSheetWorker)
      .filter(Boolean);
    records.push({
      id: id || 'supervize-' + type + '-' + asSheetDate(row.datum),
      remoteSource: 'google-sheet',
      entityType: 'supervision_records',
      ka: 'SUPERVIZE',
      title: type ? 'Supervize - ' + type : 'Supervize',
      activityDate: asSheetDate(row.datum),
      worker: workers[0] || '',
      clientIds: [],
      documentText: type || '',
      payload: {
        date: asSheetDate(row.datum),
        hours: asSheetText(row.pocet_hodin),
        type,
        workers
      },
      indicatorFlags: {},
      createdAt: Date.parse(asSheetText(row.created_at || row.datum)) || 0,
      updatedAt: parseSheetVersion(row.updated_at) || Date.parse(asSheetText(row.datum)) || 0
    });
  });

  return records.sort(compareTimelineRecordsDesc);
}

function normalizeClientDateForSheet(value) {
  if (!value) return '';
  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
  }
  const czechMatch = text.match(/^(\d{1,2})[.\/]\s*(\d{1,2})[.\/]\s*(\d{4})$/);
  if (czechMatch) {
    const [, day, month, year] = czechMatch;
    return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
  }
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return '';
}

function mapClientDraftToSheetClient(draft, klientId = '') {
  const caseManagementDisabled = handlesCaseManagementDirectly(draft.keyWorker);
  const caseManagementPotreba = caseManagementDisabled ? 'Ne' : draft.caseManagementPotreba || 'Ne';
  return {
    klient_id: klientId,
    expected_updated_at: klientId ? draft.expectedUpdatedAt || draft.updatedAt || '' : '',
    jmeno: String(draft.jmeno || '').trim(),
    prijmeni: String(draft.prijmeni || '').trim(),
    datum_narozeni: normalizeClientDateForSheet(draft.datumNarozeni),
    ulice: String(draft.ulice || '').trim(),
    cislo_popisne: String(draft.cisloPopisne || '').trim(),
    mesto: String(draft.mesto || '').trim(),
    psc: String(draft.psc || '').trim(),
    address_mode: draft.addressMode === 'municipalityOnly' ? 'municipalityOnly' : 'full',
    email: String(draft.email || '').trim(),
    datova_schranka: String(draft.datovaSchranka || '').trim(),
    telefon: String(draft.telefon || '').trim(),
    pohlavi: draft.pohlavi || '',
    postaveni_na_trhu_prace: draft.postaveniNaTrhu || '',
    dosazene_vzdelani: draft.vzdelani || '',
    znevyhodneni: draft.znevyhodneni || '',
    datum_vstupu_do_projektu: normalizeClientDateForSheet(draft.datumVstupu),
    datum_vystupu_z_projektu: normalizeClientDateForSheet(draft.datumVystupu),
    stav_klienta: draft.stavKlienta || 'Aktivn\u00ed',
    klicovy_pracovnik: draft.keyWorker || '',
    case_management_potreba: caseManagementPotreba,
    case_management_duvod: caseManagementPotreba === 'Ano' ? String(draft.caseManagementDuvod || '').trim() : '',
    case_management_od: caseManagementPotreba === 'Ano' ? normalizeClientDateForSheet(draft.caseManagementOd) : '',
    poznamka: String(draft.poznamka || '').trim(),
    rodina: draft.rodina ? 'Ano' : 'Ne',
    drive_folder_url: draft.driveFolderUrl || '',
    monitoring_list_url: draft.monitoringListUrl || ''
  };
}

const optionItems = (values, placeholder) => [
  { value: '', label: placeholder },
  ...values.map((value) => ({ value, label: value }))
];

const handlesCaseManagementDirectly = (value) => isCaseManagerWorker(value) || isGarantWorker(value);
const hasCaseManagementNeed = (client) => String(client?.caseManagementPotreba || '').trim().toLowerCase() === 'ano';

function ClientRegistrationFields({ draft, setDraft, compact = false }) {
  const caseManagementDisabled = handlesCaseManagementDirectly(draft.keyWorker);
  const caseManagementValue = caseManagementDisabled ? 'Ne' : draft.caseManagementPotreba;
  const update = (key, value) => setDraft((previous) => {
    if (key === 'keyWorker' && handlesCaseManagementDirectly(value)) {
      return {
        ...previous,
        keyWorker: value,
        caseManagementPotreba: 'Ne',
        caseManagementDuvod: '',
        caseManagementOd: ''
      };
    }
    return { ...previous, [key]: value };
  });

  if (compact) {
    const sectionTitle = 'text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500';
    const sectionBox = 'space-y-2 rounded-xl border border-indigo-100 bg-white/70 p-3';

    return (
      <div className="space-y-3">
        <div className={sectionBox}>
          <div className={sectionTitle}>Základní údaje</div>
          <InputField label="Jméno" value={draft.jmeno} onChange={(value) => update('jmeno', value)} required />
          <InputField label="Příjmení" value={draft.prijmeni} onChange={(value) => update('prijmeni', value)} required />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <InputField label="Datum narození" type="date" value={draft.datumNarozeni} onChange={(value) => update('datumNarozeni', value)} />
            <SelectField label="Pohlaví" value={draft.pohlavi} onChange={(value) => update('pohlavi', value)} options={optionItems(CLIENT_GENDER_OPTIONS, 'Vyberte pohlaví')} />
          </div>
        </div>

        <div className={sectionBox}>
          <div className={sectionTitle}>Adresa a kontakt</div>
          <RuianAddressFields draft={draft} setDraft={setDraft} compact />
          <InputField label="Telefon" type="tel" value={draft.telefon} onChange={(value) => update('telefon', value)} />
          <InputField label="E-mail" type="email" value={draft.email} onChange={(value) => update('email', value)} />
          <InputField label="Datová schránka" value={draft.datovaSchranka} onChange={(value) => update('datovaSchranka', value)} />
        </div>

        <div className={sectionBox}>
          <div className={sectionTitle}>Monitorovací údaje</div>
          <SelectField label="Postavení na trhu práce" help={HELP.clientsEmployment} value={draft.postaveniNaTrhu} onChange={(value) => update('postaveniNaTrhu', value)} options={optionItems(CLIENT_EMPLOYMENT_OPTIONS, 'Vyberte postavení')} />
          <SelectField label="Dosažené vzdělání" help={HELP.clientsEducation} value={draft.vzdelani} onChange={(value) => update('vzdelani', value)} options={optionItems(CLIENT_EDUCATION_OPTIONS, 'Vyberte vzdělání')} />
          <SelectField label="Typ znevýhodnění" help={HELP.clientsDisadvantage} value={draft.znevyhodneni} onChange={(value) => update('znevyhodneni', value)} options={optionItems(CLIENT_DISADVANTAGE_OPTIONS, 'Vyberte znevýhodnění')} />
        </div>

        <div className={sectionBox}>
          <div className={sectionTitle}>Zařazení v projektu</div>
          <SelectField label="Stav klienta" help={HELP.clientsStatus} value={draft.stavKlienta} onChange={(value) => update('stavKlienta', value)} options={optionItems(CLIENT_STATUS_OPTIONS, 'Vyberte stav')} />
          <SelectField label="Klíčový pracovník" value={draft.keyWorker} onChange={(value) => update('keyWorker', value)} options={optionItems(WORKERS, 'Vyberte pracovníka')} />
          <InputField label="Datum vstupu do projektu" help={HELP.clientsEntryDate} type="date" value={draft.datumVstupu} onChange={(value) => update('datumVstupu', value)} />
          <InputField label="Datum výstupu z projektu" help={HELP.clientsExitDate} type="date" value={draft.datumVystupu} onChange={(value) => update('datumVystupu', value)} />
          <SelectField label="Potřeba case managementu" help={HELP.clientsCaseNeed} value={caseManagementValue} disabled={caseManagementDisabled} onChange={(value) => update('caseManagementPotreba', value)} options={optionItems(YES_NO_OPTIONS, 'Vyberte odpověď')} />
          {caseManagementValue === 'Ano' && (
            <>
              <InputField label="Case management od" help={HELP.clientsCaseSince} type="date" value={draft.caseManagementOd} onChange={(value) => update('caseManagementOd', value)} />
              <TextAreaField label="Důvod case managementu" help={HELP.clientsCaseReason} value={draft.caseManagementDuvod} onChange={(value) => update('caseManagementDuvod', value)} rows={2} />
            </>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <TextAreaField label="Poznámka" help={HELP.clientsNote} value={draft.poznamka} onChange={(value) => update('poznamka', value)} rows={2} />
            <CheckboxField label="Rodina" checked={Boolean(draft.rodina)} onChange={(value) => update('rodina', value)} compact />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InputField label="Jméno" value={draft.jmeno} onChange={(value) => update('jmeno', value)} required />
        <InputField label="Příjmení" value={draft.prijmeni} onChange={(value) => update('prijmeni', value)} required />
        <InputField label="Datum narození" type="date" value={draft.datumNarozeni} onChange={(value) => update('datumNarozeni', value)} />
        <SelectField label="Pohlaví" value={draft.pohlavi} onChange={(value) => update('pohlavi', value)} options={optionItems(CLIENT_GENDER_OPTIONS, 'Vyberte pohlaví')} />
      </div>

      <RuianAddressFields draft={draft} setDraft={setDraft} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InputField label="Telefon" type="tel" value={draft.telefon} onChange={(value) => update('telefon', value)} />
        <InputField label="E-mail" type="email" value={draft.email} onChange={(value) => update('email', value)} />
        <InputField label="Datová schránka" value={draft.datovaSchranka} onChange={(value) => update('datovaSchranka', value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Postavení na trhu práce" help={HELP.clientsEmployment} value={draft.postaveniNaTrhu} onChange={(value) => update('postaveniNaTrhu', value)} options={optionItems(CLIENT_EMPLOYMENT_OPTIONS, 'Vyberte postavení')} />
        <SelectField label="Dosažené vzdělání" help={HELP.clientsEducation} value={draft.vzdelani} onChange={(value) => update('vzdelani', value)} options={optionItems(CLIENT_EDUCATION_OPTIONS, 'Vyberte vzdělání')} />
        <SelectField label="Typ znevýhodnění" help={HELP.clientsDisadvantage} value={draft.znevyhodneni} onChange={(value) => update('znevyhodneni', value)} options={optionItems(CLIENT_DISADVANTAGE_OPTIONS, 'Vyberte znevýhodnění')} />
        <SelectField label="Stav klienta" help={HELP.clientsStatus} value={draft.stavKlienta} onChange={(value) => update('stavKlienta', value)} options={optionItems(CLIENT_STATUS_OPTIONS, 'Vyberte stav')} />
        <SelectField label="Klíčový pracovník" value={draft.keyWorker} onChange={(value) => update('keyWorker', value)} options={optionItems(WORKERS, 'Vyberte pracovníka')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InputField label="Datum vstupu do projektu" help={HELP.clientsEntryDate} type="date" value={draft.datumVstupu} onChange={(value) => update('datumVstupu', value)} />
        <InputField label="Datum výstupu z projektu" help={HELP.clientsExitDate} type="date" value={draft.datumVystupu} onChange={(value) => update('datumVystupu', value)} />
        <SelectField label="Potřeba case managementu" help={HELP.clientsCaseNeed} value={caseManagementValue} disabled={caseManagementDisabled} onChange={(value) => update('caseManagementPotreba', value)} options={optionItems(YES_NO_OPTIONS, 'Vyberte odpověď')} />
        {caseManagementValue === 'Ano' && (
          <InputField label="Case management od" help={HELP.clientsCaseSince} type="date" value={draft.caseManagementOd} onChange={(value) => update('caseManagementOd', value)} />
        )}
      </div>

      {caseManagementValue === 'Ano' && (
        <TextAreaField label="Důvod case managementu" help={HELP.clientsCaseReason} value={draft.caseManagementDuvod} onChange={(value) => update('caseManagementDuvod', value)} rows={2} />
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <TextAreaField label="Poznámka" help={HELP.clientsNote} value={draft.poznamka} onChange={(value) => update('poznamka', value)} rows={2} />
        <CheckboxField label="Rodina" checked={Boolean(draft.rodina)} onChange={(value) => update('rodina', value)} compact />
      </div>
    </div>
  );
}

const createKa01Draft = () => ({
  date: todayIso(),
  tpmDate: todayIso(),
  employmentDate: todayIso(),
  worker: '',
  assessmentClientId: '',
  formalCriteriaMet: true,
  contentCriteriaCount: '1',
  motivationLevel: 'střední',
  decision: 'accepted',
  waitingList: false,
  rationale: '',
  networkType: 'koordinační setkání',
  networkParticipants: '',
  networkActorEntries: [buildEmptyKa01ActorEntry()],
  networkPlaceType: '',
  networkPlaceCustom: '',
  networkPlace: '',
  networkCount: '0',
  networkStartTime: '',
  networkEndTime: '',
  networkNotes: '',
  networkOutcome: '',
  networkNextSteps: '',
  networkDescription: ''
});

const createKa01ActorDraft = () => ({
  id: '',
  name: '',
  networkOrigin: '',
  actorType: 'obec / město',
  ico: '',
  municipality: '',
  web: '',
  contactTitle: '',
  contactFirstName: '',
  contactLastName: '',
  contactName: '',
  contactRole: '',
  phone: '',
  email: '',
  contacts: [createEmptyActorContact()],
  communicationNote: '',
  cooperationStatus: 'potenciální aktér',
  joinedNetworkDate: '',
  lastContactDate: '',
  inactivityReason: '',
  ownerWorker: WORKER_NAMES.guarantor,
  roleRecruitment: false,
  roleClientReferral: false,
  roleMaterialDistribution: false,
  roleInfoSharingWithConsent: false,
  roleCoordinationMeetings: false,
  roleJobOpportunities: false,
  roleTpm: false,
  roleHpp: false,
  roleWorkplaceAdaptation: false,
  roleFollowupService: false,
  roleDebtSocialSupport: false,
  roleOther: false,
  roleOtherText: '',
  plannedActor: false,
  priority: 'střední',
  plannedOutreachMonth: '',
  outreachDate: '',
  outreachResult: '',
  formalJoinDate: '',
  cooperationBarrierNote: ''
});

const createKa02Draft = () => ({
  date: todayIso(),
  worker: 'Pracovní poradce',
  selectedClientId: '',
  planVersion: '1',
  currentSituation: '',
  goals: '',
  barriers: '',
  plannedSteps: '',
  planDurationMinutes: '60',
  consultationType: 'Základní sociální poradenství',
  durationMinutes: '',
  topics: '',
  outcome: '',
  nextSteps: '',
  debtSummary: '',
  debtCauses: '',
  debtStage: 'Mapování',
  solutionPlan: '',
  hasRepaymentArrangement: false,
  educationTopic: '',
  therapyOrder: '1',
  therapyThemes: '',
  therapyMentalState: '',
  therapyRecommendations: '',
  targetJob: '',
  cvDurationMinutes: '',
  experience: '',
  skills: '',
  simulatorLabel: '',
  simulatorPosition: '',
  simulatorParticipants: '',
  simulatorCommittee: '',
  simulatorFeedback: ''
});

const createKa03Draft = () => ({
  date: todayIso(),
  worker: WORKER_NAMES.socialWorker,
  selectedClientId: '',
  tpmClientId: '',
  employmentClientId: '',
  tpmLinkedPlanGoalId: '',
  tpmLinkedPlanGoalLabel: '',
  employmentLinkedPlanGoalId: '',
  employmentLinkedPlanGoalLabel: '',
  employer: '',
  workplace: '',
  startDate: todayIso(),
  endDate: '',
  plannedMonths: '4',
  actualMonths: '0',
  progressSummary: '',
  barriers: '',
  nextSupportSteps: '',
  employmentType: '',
  employmentStartDate: todayIso(),
  employmentEndDate: '',
  employmentPlannedMonths: '12',
  employmentActualMonths: '0',
  employmentStatus: 'active',
  sustainabilitySupport: ''
});

const hasContentValue = (value) => {
  if (value == null || value === false) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (Array.isArray(value)) return value.some(hasContentValue);
  if (typeof value === 'object') return Object.values(value).some(hasContentValue);
  return Boolean(value);
};

const hasContentInFields = (draft, fields) => fields.some((field) => hasContentValue(draft?.[field]));

const CLIENT_DRAFT_CONTENT_FIELDS = [
  'jmeno', 'prijmeni', 'datumNarozeni', 'ulice', 'cisloPopisne', 'mesto', 'psc', 'spadoveMesto',
  'email', 'datovaSchranka', 'telefon', 'pohlavi', 'postaveniNaTrhu', 'vzdelani', 'znevyhodneni',
  'datumVystupu', 'caseManagementDuvod', 'caseManagementOd', 'poznamka', 'situacePoUkonceni'
];

const GENERATOR_DRAFT_CONTENT_FIELDS = [
  'bulletNotes', 'currentSituation', 'goals', 'barriers', 'plannedSteps', 'supportArea',
  'ka02StartTime', 'ka02EndTime', 'durationMinutes', 'topics', 'outcome', 'nextSteps',
  'debtSummary', 'debtCauses', 'solutionPlan', 'educationTopic', 'themes', 'mentalState',
  'recommendations', 'targetJob', 'cvDurationMinutes', 'experience', 'skills', 'position',
  'feedback', 'strengths', 'developmentAreas', 'workplace', 'progressSummary', 'aiStyleFeedback',
  'generatedText', 'selectedPartnerIds', 'registeredPartnerNames', 'manualPartnerNames', 'partnerNames',
  'supportSpecific'
];

const KA01_DRAFT_CONTENT_FIELDS = [
  'rationale', 'networkParticipants', 'networkActorEntries', 'networkPlaceType', 'networkPlaceCustom',
  'networkPlace', 'networkStartTime', 'networkEndTime', 'networkNotes', 'networkOutcome',
  'networkNextSteps', 'networkDescription'
];

const KA01_ACTOR_DRAFT_CONTENT_FIELDS = [
  'id', 'name', 'networkOrigin', 'ico', 'municipality', 'web', 'contactTitle', 'contactFirstName',
  'contactLastName', 'contactName', 'contactRole', 'phone', 'email', 'contacts', 'communicationNote',
  'joinedNetworkDate', 'lastContactDate', 'inactivityReason', 'roleOtherText', 'plannedOutreachMonth',
  'outreachDate', 'outreachResult', 'formalJoinDate', 'cooperationBarrierNote'
];

const KA02_DRAFT_CONTENT_FIELDS = [
  'currentSituation', 'goals', 'barriers', 'plannedSteps', 'durationMinutes', 'topics', 'outcome',
  'nextSteps', 'debtSummary', 'debtCauses', 'solutionPlan', 'educationTopic', 'therapyThemes',
  'therapyMentalState', 'therapyRecommendations', 'targetJob', 'cvDurationMinutes', 'experience',
  'skills', 'simulatorLabel', 'simulatorPosition', 'simulatorParticipants', 'simulatorCommittee',
  'simulatorFeedback'
];

const KA03_DRAFT_CONTENT_FIELDS = [
  'employer', 'workplace', 'endDate', 'progressSummary', 'barriers', 'nextSupportSteps',
  'employmentEndDate', 'sustainabilitySupport'
];

const hasUnsavedGeneratorDraftContent = (draft) =>
  hasContentInFields(draft, GENERATOR_DRAFT_CONTENT_FIELDS) ||
  (hasContentValue(draft?.ka02Place) && !(draft?.caseManagementMode && draft.ka02Place === 'ambulantní'));

function parseSheetVersion(value) {
  const text = asSheetText(value).trim();
  if (!text) return 0;
  const numeric = Number(text);
  if (Number.isFinite(numeric) && /^\d+$/.test(text)) return numeric;
  return Date.parse(text) || 0;
}

function withSheetVersion(record, row) {
  const expectedUpdatedAt = asSheetText(row?.updated_at).trim();
  const updatedAt = parseSheetVersion(expectedUpdatedAt);
  const { expectedUpdatedAt: _expectedUpdatedAt, ...cleanRecord } = record;
  return {
    ...cleanRecord,
    ...(updatedAt ? { updatedAt } : {}),
    ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
    ...(row?.document_pending === true ? { documentSyncPending: true } : {}),
    ...(row?.document_state ? { documentSyncState: String(row.document_state) } : {}),
    ...(row?.document_warning ? { documentSyncError: String(row.document_warning) } : {})
  };
}

function actorSheetRowMatchesPayload(row, partner) {
  if (!row || !partner) return false;
  const normalize = (value) => asSheetText(value).trim().replace(/\r\n/g, '\n');
  const expectedId = normalize(partner.partner_id);
  if (expectedId && normalize(row.partner_id) !== expectedId) return false;

  const textFields = ['nazev_subjektu', 'typ_aktera', 'puvod_site'];
  if (textFields.some((field) => normalize(row[field]) !== normalize(partner[field]))) return false;

  const expectedDate = asSheetDate(partner.datum_zapojeni);
  if (expectedDate && asSheetDate(row.datum_zapojeni) !== expectedDate) return false;

  const comparableContacts = (source) => normalizeActorContacts({
    kontaktni_osoby_json: source.kontaktni_osoby_json,
    contactName: source.kontaktni_osoba,
    contactRole: source.funkce,
    phone: source.telefon,
    email: source.email
  }).map(({ id, name, title, firstName, lastName, role, phone, email }) => ({
    id,
    name,
    title,
    firstName,
    lastName,
    role,
    phone,
    email
  }));

  return JSON.stringify(comparableContacts(row)) === JSON.stringify(comparableContacts(partner));
}

// Prohlizec musi cekat o neco dele nez Render proxy. Jinak ukonci pozadavek,
// ktery na serveru stale uspesne probiha, a uzivatel uvidi falesnou chybu.
const GOOGLE_SHEET_REQUEST_TIMEOUT_MS = 65000;
const IDEMPOTENT_GOOGLE_SHEET_ACTIONS = new Set([
  'saveClient', 'deleteClient', 'updateClientKeyWorker',
  'savePartner', 'deletePartner',
  'saveIndividualPlan', 'deleteIndividualPlan',
  'savePerformance', 'deletePerformance',
  'saveMeeting', 'deleteMeeting',
  'saveNetworkMeeting', 'deleteNetworkMeeting',
  'saveEducation', 'deleteEducation',
  'saveSupervision', 'deleteSupervision'
]);

function canonicalMutationPayload(value) {
  if (Array.isArray(value)) return value.map(canonicalMutationPayload);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (key === 'request_id' || key === 'token') return result;
    result[key] = canonicalMutationPayload(value[key]);
    return result;
  }, {});
}

function mutationPayloadSignature(payload) {
  const text = JSON.stringify(canonicalMutationPayload(payload || {}));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${String(payload?.action || 'mutation')}:${text.length.toString(36)}:${(hash >>> 0).toString(16)}`;
}

function createClientMutationRequestId(operation) {
  const prefix = String(operation || 'client').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'client';
  const randomPart = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

async function fetchGoogleSheetAction(action, maxAttempts = 2, timeoutMs = GOOGLE_SHEET_REQUEST_TIMEOUT_MS, queryParams = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = new URL(GOOGLE_SHEET_MACRO_URL, window.location.origin);
      url.searchParams.set('action', action);
      Object.entries(queryParams || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') url.searchParams.set(key, String(value));
      });
      const response = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        let detail = '';
        try {
          const errorPayload = await response.json();
          detail = errorPayload?.error || '';
        } catch {
          // Odpoved bez JSON tela - pouzije se obecna hlaska nize.
        }
        const requestError = new Error(detail || 'Google Sheet akce ' + action + ' selhala (HTTP ' + response.status + ').');
        requestError.httpStatus = response.status;
        requestError.sheetAction = action;
        throw requestError;
      }
      const json = await response.json();
      if (json?.ok === false) throw new Error(json.error || 'Google Sheet akce ' + action + ' selhala.');
      const revision = String(response.headers.get('x-data-revision') || json?.revision || '');
      if (json && typeof json === 'object') json.__dataRevision = revision;
      return json;
    } catch (error) {
      lastError = error?.name === 'AbortError'
        ? new Error('Načítání dat z Google Sheetu trvá příliš dlouho.')
        : error;
      if (attempt + 1 < maxAttempts) await new Promise((resolve) => window.setTimeout(resolve, 350));
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  throw lastError || new Error('Google Sheet akce ' + action + ' selhala.');
}

function haveSameClientSnapshot(currentClients, nextClients) {
  if (currentClients === nextClients) return true;
  if (!Array.isArray(currentClients) || !Array.isArray(nextClients) || currentClients.length !== nextClients.length) return false;
  return currentClients.every((client, index) => {
    const nextClient = nextClients[index];
    if (client?.id !== nextClient?.id) return false;
    if (Boolean(client?.isDirectoryOnly) !== Boolean(nextClient?.isDirectoryOnly)) return false;
    if (client?.updatedAt || nextClient?.updatedAt) return client.updatedAt === nextClient.updatedAt;
    return JSON.stringify(client) === JSON.stringify(nextClient);
  });
}

const LOCAL_ONLY_ENTITY_TYPES = new Set(['ai_style_memory', 'client_folder_bundle', 'mentor_report_document']);
const isLocalOnlyRecord = (record) => LOCAL_ONLY_ENTITY_TYPES.has(record?.entityType);
const VERIFIED_RECORD_SOURCE_ACTIONS = [
  'listPerformances',
  'listMeetings',
  'listIndividualPlans',
  'listNetworkMeetings',
  'listPartners',
  'listEducation',
  'listSupervision'
];
const CLIENT_REGISTRY_SCROLL_STORAGE_KEY = 'mb-vykaznictvi:client-registry-scroll:v1';
function recordSourceAction(record) {
  if (!record || isLocalOnlyRecord(record)) return '';
  if (record.entityType === 'plans') return 'listIndividualPlans';
  if (record.entityType === 'actor_registry') return 'listPartners';
  if (record.entityType === 'network_activities') return 'listNetworkMeetings';
  if (record.entityType === 'education_records') return 'listEducation';
  if (record.entityType === 'supervision_records') return 'listSupervision';
  if (record.entityType === 'consultations' && (record.ka === 'KA2' || record.payload?.caseManagementMode)) return 'listMeetings';
  if (record.clientId || (Array.isArray(record.clientIds) && record.clientIds.length)) return 'listPerformances';
  return '';
}

function extractClientRows(response) {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.clients)) return response.clients;
  if (response && Array.isArray(response.data)) return response.data;
  if (response && Array.isArray(response.items)) return response.items;
  return null;
}

function formatClientFolderFileSize(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function formatClientFolderFileDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function App() {
  const [mainView, setMainView] = useState('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllClients, setShowAllClients] = useState(true);
  const [records, setRecords] = useState(() => readSafeStartupRecords());
  const [clients, setClients] = useState([]);
  const [verifiedRecordActions, setVerifiedRecordActions] = useState(() => new Set());
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isClientRegistryAvailable, setIsClientRegistryAvailable] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientDraft, setClientDraft] = useState(emptyClientDraft);
  const [showClientEditForm, setShowClientEditForm] = useState(false);
  const [clientEditDraft, setClientEditDraft] = useState(emptyClientDraft);
  const [globalWorker, setGlobalWorker] = useState(WORKERS[0]);
  const [generatorDraft, setGeneratorDraft] = useState(() => ({ ...emptyGeneratorDraft, worker: WORKERS[0] }));
  const [generatedText, setGeneratedText] = useState('');
  const [lastGeneratedText, setLastGeneratedText] = useState('');
  const [generationNotice, setGenerationNotice] = useState('');
  const [aiGenerationStatus, setAiGenerationStatus] = useState('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [backupStatus, setBackupStatus] = useState({ state: 'idle', message: 'Záloha zatím nebyla vytvořena.' });
  const [isBackupActionRunning, setIsBackupActionRunning] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [saveButtonNotices, setSaveButtonNotices] = useState({});
  const [recordDeleteNotice, setRecordDeleteNotice] = useState(null);
  const pendingRecordSaveSignaturesRef = useRef(new Set());
  const pendingRecordMutationIdsRef = useRef(new Set());
  const pendingClientSaveSignaturesRef = useRef(new Set());
  const clientCreateMutationIdsRef = useRef(new Map());
  const clientDeleteMutationIdsRef = useRef(new Map());
  const genericMutationIdsRef = useRef(new Map());
  const clientRegistryScrollRef = useRef(null);
  const hasAuthoritativeClientSnapshotRef = useRef(false);
  const clientDriveProvisionAttemptsRef = useRef(new Set());
  const prefetchedSheetActionsRef = useRef(new Map());
  const currentDataRevisionRef = useRef(readSafeRecordIndex().revision);
  const ka01ActorEditVersionRef = useRef('');
  const generatedOutputSaveLockRef = useRef(false);
  const isEsfExportRequestRef = useRef(0);
  const isEsfSupportExportRequestRef = useRef(0);
  const [clientFolderViewer, setClientFolderViewer] = useState({
    open: false,
    clientId: '',
    clientName: '',
    folder: null,
    files: [],
    loading: false,
    error: '',
    selectedFileId: '',
    preview: null,
    previewLoading: false,
    previewError: ''
  });
  const clientFolderViewerRequestRef = useRef(0);
  const [isSummarizingCase, setIsSummarizingCase] = useState(false);
  const [isExportingClientCaseDocx, setIsExportingClientCaseDocx] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [installPrompt, setInstallPrompt] = useState(() => window.__MB_INSTALL_PROMPT__ || null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [installHelpVisible, setInstallHelpVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clientCaseSummary, setClientCaseSummary] = useState('');
  const [goalAlertsExpanded, setGoalAlertsExpanded] = useState(false);
  const [dismissedGoalAlertSignatures, setDismissedGoalAlertSignatures] = useState([]);
  const [dashboardFilters, setDashboardFilters] = useState({ period: 'all', ka: 'all', worker: 'all' });
  const [isEsfExportStatus, setIsEsfExportStatus] = useState({
    state: 'idle',
    message: 'Kontrola údajů a adres se spustí při stažení CSV.',
    addressFallbacks: [],
    addressAdjustments: [],
    educationFallbacks: [],
    dataIssues: []
  });
  const [isEsfSupportExportStatus, setIsEsfSupportExportStatus] = useState({
    state: 'idle',
    message: 'Nejprve nahrajte CSV podpořených osob vyexportované z IS ESF.',
    issues: []
  });
  const [isEsfPersonImport, setIsEsfPersonImport] = useState({
    fileName: '',
    rows: [],
    error: ''
  });
  const [statisticsRows, setStatisticsRows] = useState([]);
  const [statisticsFilters, setStatisticsFilters] = useState({ dateFrom: '', dateTo: '' });
  const [isExportingKuStatistics, setIsExportingKuStatistics] = useState(false);
  const [isExportingDetailedOutputs, setIsExportingDetailedOutputs] = useState(false);
  const [zorTexts, setZorTexts] = useState(null);
  const [isGeneratingZor, setIsGeneratingZor] = useState(false);
  const [expandedJourneyRecordIds, setExpandedJourneyRecordIds] = useState([]);
  const [selectedJourneyPrintIds, setSelectedJourneyPrintIds] = useState([]);
  const [journeyPlanDrafts, setJourneyPlanDrafts] = useState({});
  const [journeyPlanStructuredDrafts, setJourneyPlanStructuredDrafts] = useState({});
  const [generatingJourneyPlanId, setGeneratingJourneyPlanId] = useState('');
  const [editingKa01NetworkRecordId, setEditingKa01NetworkRecordId] = useState('');
  const [editingGeneratedRecordId, setEditingGeneratedRecordId] = useState('');
  const [editingKa03RecordId, setEditingKa03RecordId] = useState('');
  const [expandedKa01NetworkRecordIds, setExpandedKa01NetworkRecordIds] = useState([]);
  const [ka01NetworkTimeError, setKa01NetworkTimeError] = useState('');
  const [ka01AttendanceSelection, setKa01AttendanceSelection] = useState({});
  const ka01NetworkSaveLockRef = useRef(false);
  const ka01NetworkPendingIdRef = useRef('');

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const updateInstalledState = () => {
      setIsAppInstalled(standaloneQuery.matches || window.navigator.standalone === true);
    };
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      window.__MB_INSTALL_PROMPT__ = event;
      setInstallPrompt(event);
      setInstallHelpVisible(false);
    };
    const handleInstalled = () => {
      window.__MB_INSTALL_PROMPT__ = null;
      setInstallPrompt(null);
      setIsAppInstalled(true);
      setInstallHelpVisible(false);
    };

    updateInstalledState();
    if (window.__MB_INSTALL_PROMPT__) setInstallPrompt(window.__MB_INSTALL_PROMPT__);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    standaloneQuery.addEventListener?.('change', updateInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      standaloneQuery.removeEventListener?.('change', updateInstalledState);
    };
  }, []);

  useEffect(() => {
    const nextWorker = globalWorker || WORKERS[0];
    setGeneratorDraft((prev) => (prev.worker === nextWorker ? prev : { ...prev, worker: nextWorker }));
    setKa01Draft((prev) => (prev.worker === nextWorker ? prev : { ...prev, worker: nextWorker }));
    setKa02Draft((prev) => (prev.worker === nextWorker ? prev : { ...prev, worker: nextWorker }));
  }, [globalWorker]);

  const [ka01Draft, setKa01Draft] = useState({
    date: todayIso(),
    tpmDate: todayIso(),
    employmentDate: todayIso(),
    worker: '',
    assessmentClientId: '',
    formalCriteriaMet: true,
    contentCriteriaCount: '1',
    motivationLevel: 'střední',
    decision: 'accepted',
    waitingList: false,
    rationale: '',
    networkType: 'koordina\u010dn\u00ed setk\u00e1n\u00ed',
    networkParticipants: '',
    networkActorEntries: [buildEmptyKa01ActorEntry()],
    networkPlaceType: '',
    networkPlaceCustom: '',
    networkPlace: '',
    networkCount: '0',
    networkStartTime: '',
    networkEndTime: '',
    networkNotes: '',
    networkOutcome: '',
    networkNextSteps: '',
    networkDescription: ''
  });
  const [ka01ActorDraft, setKa01ActorDraft] = useState(createKa01ActorDraft);

  const [ka02Draft, setKa02Draft] = useState({
    date: todayIso(),
    worker: 'Pracovní poradce',
    selectedClientId: '',
    planVersion: '1',
    currentSituation: '',
    goals: '',
    barriers: '',
    plannedSteps: '',
    planDurationMinutes: '60',
    consultationType: 'Z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed',
    durationMinutes: '',
    topics: '',
    outcome: '',
    nextSteps: '',
    debtSummary: '',
    debtCauses: '',
    debtStage: 'Mapování',
    solutionPlan: '',
    hasRepaymentArrangement: false,
    educationTopic: '',
    therapyOrder: '1',
    therapyThemes: '',
    therapyMentalState: '',
    therapyRecommendations: '',
    targetJob: '',
    cvDurationMinutes: '',
    experience: '',
    skills: '',
    simulatorLabel: '',
    simulatorPosition: '',
    simulatorParticipants: '',
    simulatorCommittee: '',
    simulatorFeedback: ''
  });

  const [ka03Draft, setKa03Draft] = useState({
    date: todayIso(),
    worker: WORKER_NAMES.socialWorker,
    selectedClientId: '',
    tpmClientId: '',
    employmentClientId: '',
    tpmLinkedPlanGoalId: '',
    tpmLinkedPlanGoalLabel: '',
    employmentLinkedPlanGoalId: '',
    employmentLinkedPlanGoalLabel: '',
    employer: '',
    workplace: '',
    startDate: todayIso(),
    endDate: '',
    plannedMonths: '4',
    actualMonths: '0',
    progressSummary: '',
    barriers: '',
    nextSupportSteps: '',
    employmentType: '',
    employmentStartDate: todayIso(),
    employmentEndDate: '',
    employmentPlannedMonths: '12',
    employmentActualMonths: '0',
    employmentStatus: 'active',
    sustainabilitySupport: ''
  });
  const [educationDraft, setEducationDraft] = useState({
    date: todayIso(),
    hours: '',
    title: '',
    accreditationNumber: '',
    worker1: WORKERS[0],
    worker2: '',
    worker3: ''
  });
  const [supervisionDraft, setSupervisionDraft] = useState({
    date: todayIso(),
    hours: '',
    type: 'individuální',
    worker1: WORKERS[0],
    worker2: '',
    worker3: ''
  });
  const isIndividualSupervision = supervisionDraft.type === 'individuální';

  useEffect(() => {
    let cancelled = false;
    let retryTimeoutId = null;
    let consecutiveFailures = 0;

    // Klientsky registr musi byt pri studenem startu maly samostatny pozadavek.
    // Velky bootstrapFast drive blokoval celou aplikaci, kdyz studeny Apps Script
    // nestihl odpovedet v limitu proxy. Hned po klientech proto soubezne nacitame
    // dve prioritni oblasti (vykony a IP); ostatni data je uz nemohou zdrzet.
    const prefetchAction = (action, timeoutMs = GOOGLE_SHEET_REQUEST_TIMEOUT_MS) => fetchGoogleSheetAction(action, 1, timeoutMs)
      .then((result) => ({ action, result }))
      .catch((error) => ({ action, error }));
    const bundleActionPrefetch = (bundlePromise, action, responseKey) => bundlePromise.then((outcome) => {
      if (outcome?.error) return { action, error: outcome.error };
      const actionError = Array.isArray(outcome?.result?.errors)
        ? outcome.result.errors.find((item) => item?.action === action)
        : null;
      if (actionError) return { action, error: new Error(actionError.error || `${action} se nepodařilo načíst.`) };
      if (!Array.isArray(outcome?.result?.[responseKey])) {
        return { action, error: new Error(`${action} nevrátil úplná data.`) };
      }
      return {
        action,
        result: {
          ok: true,
          [responseKey]: outcome.result[responseKey],
          __dataRevision: outcome.result.__dataRevision || ''
        }
      };
    });
    let resolveStartupClientReady = () => {};
    let startupClientReadyResolved = false;
    const startupClientReady = new Promise((resolve) => {
      resolveStartupClientReady = () => {
        if (startupClientReadyResolved) return;
        startupClientReadyResolved = true;
        resolve();
      };
    });
    prefetchedSheetActionsRef.current.set('startupClientReady', startupClientReady);

    const clientsPrefetch = prefetchAction('listClients');
    const performancesPrefetch = startupClientReady.then(() => prefetchAction('listPerformances'));
    const individualPlansPrefetch = startupClientReady.then(() => prefetchAction('listIndividualPlans'));
    prefetchedSheetActionsRef.current.set('listPerformances', performancesPrefetch);
    prefetchedSheetActionsRef.current.set('listIndividualPlans', individualPlansPrefetch);
    const priorityReadsReady = Promise.all([performancesPrefetch, individualPlansPrefetch]);
    const meetingsPrefetch = priorityReadsReady.then(() => prefetchAction('listMeetings'));
    const partnersPrefetch = priorityReadsReady.then(() => prefetchAction('listPartners'));
    prefetchedSheetActionsRef.current.set('listMeetings', meetingsPrefetch);
    prefetchedSheetActionsRef.current.set('listPartners', partnersPrefetch);
    // Pomocna data (vcetne schuzek site) nemaji cekat na pomalejsi z dvojice
    // porady / akteri. Spustime je po prvnim dokoncenem pozadavku, cimz stale
    // udrzime nejvyse dva aktivni sekundarni requesty najednou.
    const firstSecondaryReadReady = Promise.race([meetingsPrefetch, partnersPrefetch]);
    const auxiliaryPrefetch = firstSecondaryReadReady.then(() => prefetchAction('bootstrapAuxiliary'));
    [
      ['listNetworkMeetings', 'networkMeetings'],
      ['listEducation', 'education'],
      ['listSupervision', 'supervision'],
      ['listStatistics', 'statistics']
    ].forEach(([action, responseKey]) => {
      prefetchedSheetActionsRef.current.set(
        action,
        bundleActionPrefetch(auxiliaryPrefetch, action, responseKey)
      );
    });

    let hasClientSnapshot = false;
    let startupClientPrefetchConsumed = false;
    const applyClientSnapshot = (parsed, authoritative) => {
      if (cancelled) return;
      if (authoritative) {
        hasAuthoritativeClientSnapshotRef.current = true;
        setIsClientRegistryAvailable(true);
      }
      hasClientSnapshot = true;
      setClients((current) => (haveSameClientSnapshot(current, parsed) ? current : parsed));
      const firstClientId = parsed[0]?.id || '';
      setSelectedClientId((current) => parsed.some((client) => client.id === current) ? current : firstClientId);
      setGeneratorDraft((previous) => ({
        ...previous,
        clientId: parsed.some((client) => client.id === previous.clientId) ? previous.clientId : firstClientId
      }));
      setKa01Draft((previous) => ({
        ...previous,
        assessmentClientId: parsed.some((client) => client.id === previous.assessmentClientId)
          ? previous.assessmentClientId
          : firstClientId
      }));
      setKa02Draft((previous) => ({
        ...previous,
        selectedClientId: parsed.some((client) => client.id === previous.selectedClientId)
          ? previous.selectedClientId
          : firstClientId
      }));
      setKa03Draft((previous) => ({
        ...previous,
        selectedClientId: parsed.some((client) => client.id === previous.selectedClientId)
          ? previous.selectedClientId
          : firstClientId,
        tpmClientId: parsed.some((client) => client.id === previous.tpmClientId)
          ? previous.tpmClientId
          : firstClientId,
        employmentClientId: parsed.some((client) => client.id === previous.employmentClientId)
          ? previous.employmentClientId
          : firstClientId,
        tpmDate: previous.tpmDate || todayIso(),
        employmentDate: previous.employmentDate || todayIso()
      }));
    };

    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        let json = null;
        if (!startupClientPrefetchConsumed) {
          startupClientPrefetchConsumed = true;
          const clientOutcome = await clientsPrefetch;
          if (clientOutcome?.result && Array.isArray(clientOutcome.result.clients)) {
            json = clientOutcome.result;
          } else if (clientOutcome?.error) {
            console.warn('Google Sheets startup client prefetch skipped:', clientOutcome.error);
          }
        }
        if (!json) json = await fetchGoogleSheetAction('listClients', 1, GOOGLE_SHEET_REQUEST_TIMEOUT_MS);
        if (cancelled) return;
        currentDataRevisionRef.current = json?.__dataRevision || currentDataRevisionRef.current;
        consecutiveFailures = 0;
        setSheetError('');
        const rows = extractClientRows(json);
        if (!Array.isArray(rows)) throw new Error('Google Sheet nevrátil úplný klientský registr.');

        const parsed = rows
          .map((row, index) => mapSheetRowToClient(row, index))
          .filter(Boolean);
        applyClientSnapshot(parsed, true);
        writeSafeClientIndex(parsed, currentDataRevisionRef.current);
        resolveStartupClientReady();
      } catch (error) {
        if (cancelled) return;
        consecutiveFailures += 1;
        console.warn('Google Sheets client load retry:', error);
        if (!hasAuthoritativeClientSnapshotRef.current || consecutiveFailures >= 2) {
          hasAuthoritativeClientSnapshotRef.current = false;
          setIsClientRegistryAvailable(false);
        }
        if (!hasClientSnapshot) {
          setClients([]);
          setSelectedClientId('');
          setGeneratorDraft((prev) => ({ ...prev, clientId: '' }));
          setKa01Draft((prev) => ({ ...prev, assessmentClientId: '' }));
          setKa02Draft((prev) => ({ ...prev, selectedClientId: '' }));
        }
        if (consecutiveFailures >= 3) {
          setSheetError('Načtení klientského registru se opakovaně nezdařilo. Aplikace připojení dál automaticky ověřuje; ukládání klientských dat zůstává do obnovení spojení zablokované.');
        }
        const retryDelayMs = consecutiveFailures === 1 ? 1000 : consecutiveFailures === 2 ? 2000 : 8000;
        retryTimeoutId = window.setTimeout(fetchClients, retryDelayMs);
      } finally {
        if (!cancelled) setIsLoadingClients(false);
      }
    };

    fetchClients();
    return () => {
      cancelled = true;
      if (retryTimeoutId) window.clearTimeout(retryTimeoutId);
    };
  }, []);

  const refreshClientRegistryForWrite = async () => {
    try {
      const response = await fetchGoogleSheetAction(
        'listClients',
        2,
        GOOGLE_SHEET_REQUEST_TIMEOUT_MS,
        { write_verification_nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
      );
      const rows = extractClientRows(response);
      if (!Array.isArray(rows)) throw new Error('Google Sheet nevrátil úplný klientský registr.');
      const parsed = rows
        .map((row, index) => mapSheetRowToClient(row, index))
        .filter(Boolean);
      currentDataRevisionRef.current = response?.__dataRevision || currentDataRevisionRef.current;
      hasAuthoritativeClientSnapshotRef.current = true;
      setIsClientRegistryAvailable(true);
      setSheetError('');
      setClients((current) => (haveSameClientSnapshot(current, parsed) ? current : parsed));
      writeSafeClientIndex(parsed, currentDataRevisionRef.current);
      return parsed;
    } catch (error) {
      console.warn('Client registry write verification failed:', error);
      hasAuthoritativeClientSnapshotRef.current = false;
      setIsClientRegistryAvailable(false);
      return null;
    }
  };

  const clientIndex = useMemo(() => {
    const map = {};
    clients.forEach((client) => {
      map[client.id] = client;
    });
    return map;
  }, [clients]);
  const canLoadSheetRecords = Boolean(GOOGLE_SHEET_MACRO_URL);

  useEffect(() => {
    if (!isClientRegistryAvailable || clients.length === 0 || records.length === 0) return;
    setRecords((previous) => {
      let changed = false;
      const enriched = previous.map((record) => {
        const client = record.clientId ?clientIndex[record.clientId] : null;
        if (!client?.fullName || record.clientName === client.fullName) return record;
        changed = true;
        const clientId = String(record.clientId || '');
        const title = clientId && String(record.title || '').endsWith(clientId)
          ? String(record.title).slice(0, -clientId.length) + client.fullName
          : record.title;
        return { ...record, clientName: client.fullName, title };
      });
      return changed ? enriched : previous;
    });
  }, [clientIndex, clients.length, isClientRegistryAvailable, records.length]);

  useEffect(() => {
    // Rewriting a cache-only snapshot would extend its lifetime indefinitely.
    // Persist only after at least one authoritative record reached memory.
    if (!records.some((record) => !record?.isSafeCachedIndex)) return;
    writeSafeRecordIndex(records, currentDataRevisionRef.current);
  }, [records]);


  useEffect(() => {
    if (!canLoadSheetRecords || !GOOGLE_SHEET_MACRO_URL) return undefined;
    let cancelled = false;

    const fetchSheetRecords = async () => {
      setVerifiedRecordActions(new Set());
      const failedActions = new Set();
      const loadedActions = new Set();
      const acceptLoadedAction = (action, result) => {
        if (result?.__dataRevision) currentDataRevisionRef.current = result.__dataRevision;
        loadedActions.add(action);
        failedActions.delete(action);
        if (!cancelled && VERIFIED_RECORD_SOURCE_ACTIONS.includes(action)) {
          setVerifiedRecordActions((previous) => new Set([...previous, action]));
        }
        return result;
      };
      const loadAction = async (action, fallback, options = {}) => {
        const {
          initialAttempts = 1,
          retry = true,
          timeoutMs = GOOGLE_SHEET_REQUEST_TIMEOUT_MS
        } = options;
        try {
          const prefetched = prefetchedSheetActionsRef.current.get(action);
          if (prefetched) prefetchedSheetActionsRef.current.delete(action);
          const outcome = prefetched ? await prefetched : null;
          if (outcome?.error) throw outcome.error;
          const result = outcome?.result || await fetchGoogleSheetAction(action, initialAttempts, timeoutMs);
          return acceptLoadedAction(action, result);
        } catch (firstError) {
          console.warn('Google Sheets action load retry:', action, firstError);
          if (cancelled || !retry) {
            failedActions.add(action);
            return fallback;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 750));
          try {
            const result = await fetchGoogleSheetAction(action, 1, timeoutMs);
            return acceptLoadedAction(action, result);
          } catch (retryError) {
            console.warn('Google Sheets action load skipped:', action, retryError);
            failedActions.add(action);
            return fallback;
          }
        }
      };

      const applyLoadedResults = ({
        performances = { performances: [] },
        meetings = { meetings: [] },
        plans = { individualPlans: [] },
        networkMeetings = { networkMeetings: [] },
        partners = { partners: [] },
        education = { education: [] },
        supervision = { supervision: [] }
      }, actionsForMerge) => {
        if (cancelled) return;
        const remoteRecords = canonicalizeWorkerReferences(mapSheetRecordsToAppRecords({
          individualPlans: plans.individualPlans || [],
          performances: performances.performances || [],
          meetings: meetings.meetings || [],
          networkMeetings: networkMeetings.networkMeetings || [],
          partners: partners.partners || [],
          education: education.education || education.educations || education.vzdelavani || [],
          supervision: supervision.supervision || supervision.supervisions || supervision.supervize || []
        }, clientIndex));
        setRecords((prev) => {
          const remoteIds = new Set(remoteRecords.map((record) => record.id));
          const sourceLoadedForRecord = (record) => {
            if (record.entityType === 'plans') return actionsForMerge.has('listIndividualPlans');
            if (record.entityType === 'consultations' && record.ka === 'KA1') return actionsForMerge.has('listPerformances');
            if (record.entityType === 'consultations' && record.ka === 'KA2') return actionsForMerge.has('listMeetings');
            if (record.entityType === 'network_activities') return actionsForMerge.has('listNetworkMeetings');
            if (record.entityType === 'actor_registry') return actionsForMerge.has('listPartners');
            if (record.entityType === 'education_records') return actionsForMerge.has('listEducation');
            if (record.entityType === 'supervision_records') return actionsForMerge.has('listSupervision');
            return true;
          };
          const preservedPendingRemote = prev.filter((record) =>
            !isLocalOnlyRecord(record) && !remoteIds.has(record.id) && !sourceLoadedForRecord(record)
          );
          const localOnly = prev.filter((record) => isLocalOnlyRecord(record) && !remoteIds.has(record.id));
          const merged = [...remoteRecords, ...preservedPendingRemote, ...localOnly].sort(compareTimelineRecordsDesc);
          return merged;
        });
      };

      const recoveryActionLabels = {
        listPerformances: 'v\u00fdkony KA1',
        listMeetings: 'z\u00e1pisy case managementu',
        listIndividualPlans: 'individu\u00e1ln\u00ed pl\u00e1ny',
        listNetworkMeetings: 'sch\u016fzky s\u00edt\u011b',
        listPartners: 'akt\u00e9\u0159i s\u00edt\u011b',
        listEducation: 'vzd\u011bl\u00e1v\u00e1n\u00ed',
        listSupervision: 'supervize',
        listStatistics: 'statistiky K\u00da'
      };
      const mapSourcesWithConcurrency = async (sources, concurrency, mapper) => {
        const results = new Array(sources.length);
        let nextIndex = 0;
        const workerCount = Math.min(Math.max(1, concurrency), sources.length);
        const workers = Array.from({ length: workerCount }, async () => {
          while (!cancelled) {
            const sourceIndex = nextIndex;
            nextIndex += 1;
            if (sourceIndex >= sources.length) return;
            results[sourceIndex] = await mapper(sources[sourceIndex], sourceIndex);
          }
        });
        await Promise.all(workers);
        return results;
      };
      const scheduleFailedActionRecovery = (sources, bundle) => {
        if (!failedActions.size) return;
        void (async () => {
          let delayMs = 8000;
          while (!cancelled && failedActions.size) {
            await new Promise((resolve) => window.setTimeout(resolve, delayMs));
            if (cancelled) return;
            const pendingSources = sources.filter(([action]) => failedActions.has(action));
            if (!pendingSources.length) return;
            const recovered = await mapSourcesWithConcurrency(
              pendingSources,
              1,
              async ([action, bundleKey, fallback]) => {
                return {
                  action,
                  bundleKey,
                  result: await loadAction(action, fallback, {
                    retry: false,
                    timeoutMs: GOOGLE_SHEET_REQUEST_TIMEOUT_MS
                  })
                };
              }
            );
            recovered.forEach(({ bundleKey, result }) => {
              bundle[bundleKey] = result;
            });
            if (cancelled) return;
            if (loadedActions.has('listStatistics')) setStatisticsRows(bundle.statistics?.statistics || []);
            applyLoadedResults(bundle, new Set(loadedActions));
            setSheetError(failedActions.size
              ? 'Nepoda\u0159ilo se na\u010d\u00edst: ' + [...failedActions].map((action) => recoveryActionLabels[action] || action).join(', ') + '. Ostatn\u00ed data jsou dostupn\u00e1; ov\u011b\u0159en\u00ed se automaticky opakuje.'
              : '');
            delayMs = Math.min(delayMs * 2, 60000);
          }
        })();
      };

      const progressiveSources = [
        ['listPerformances', 'performances', { performances: [] }],
        ['listIndividualPlans', 'plans', { individualPlans: [] }],
        ['listMeetings', 'meetings', { meetings: [] }],
        ['listPartners', 'partners', { partners: [] }],
        ['listNetworkMeetings', 'networkMeetings', { networkMeetings: [] }],
        ['listEducation', 'education', { education: [], educations: [], vzdelavani: [] }],
        ['listSupervision', 'supervision', { supervision: [], supervisions: [], supervize: [] }],
        ['listStatistics', 'statistics', { statistics: [] }]
      ];
      const progressiveBundle = {
        performances: { performances: [] },
        meetings: { meetings: [] },
        plans: { individualPlans: [] },
        networkMeetings: { networkMeetings: [] },
        partners: { partners: [] },
        education: { education: [] },
        supervision: { supervision: [] },
        statistics: { statistics: [] }
      };
      const applySingleProgressiveSource = (action, bundleKey, result) => {
        progressiveBundle[bundleKey] = result;
        if (action === 'listStatistics') setStatisticsRows(result.statistics || []);
        applyLoadedResults(progressiveBundle, new Set([action]));
      };
      const loadSingleProgressiveSource = async ([action, bundleKey, fallback]) => {
        const result = await loadAction(action, fallback, {
          retry: action === 'listPerformances' || action === 'listIndividualPlans',
          timeoutMs: GOOGLE_SHEET_REQUEST_TIMEOUT_MS
        });
        if (!cancelled && loadedActions.has(action)) {
          applySingleProgressiveSource(action, bundleKey, result);
        }
      };
      // Po autoritativnim registru zpracovavame vysledky nejvyse po dvou.
      // Sitove, vzdelavaci, supervizni a statisticke hodnoty pritom sdileji
      // jediny auxiliary pozadavek, takze nejde o ctyri otevreni tabulky.
      const startupClientReady = prefetchedSheetActionsRef.current.get('startupClientReady');
      if (startupClientReady) {
        prefetchedSheetActionsRef.current.delete('startupClientReady');
        await startupClientReady;
      }
      if (cancelled) return;
      await mapSourcesWithConcurrency(progressiveSources, 2, loadSingleProgressiveSource);
      if (cancelled) return;
      // Prvni prechodne selhani jeste nehlasime. Automaticka obnova probehne
      // za osm sekund a zprava se zobrazi jen tehdy, pokud selze i ona.
      setSheetError('');
      scheduleFailedActionRecovery(progressiveSources, progressiveBundle);
      return;

    };

    fetchSheetRecords();
    return () => {
      cancelled = true;
    };
  }, [canLoadSheetRecords]);

  const currentWorker = globalWorker || WORKERS[0];
  const recordWriteBlockMessage = (record) => {
    const sourceAction = recordSourceAction(record);
    if (!sourceAction || verifiedRecordActions.has(sourceAction)) return '';
    return 'Aktuální data této oblasti se ještě ověřují. Do dokončení aktualizace je ukládání a mazání zablokováno.';
  };
  const canSeeAllClients = isGarantWorker(currentWorker);
  const accessibleClients = useMemo(() => {
    if (canSeeAllClients) return clients;
    return clients.filter((client) =>
      canonicalizeWorkerName(client.keyWorker) === currentWorker ||
      (isCaseManagerWorker(currentWorker) && hasCaseManagementNeed(client))
    );
  }, [clients, currentWorker, canSeeAllClients]);

  const clientSelectionPool = useMemo(
    () => buildClientSelectionPool({
      clients,
      accessibleClients,
      selectedClientId,
      mainView,
      showAllClients
    }),
    [mainView, showAllClients, clients, accessibleClients, selectedClientId]
  );

  const selectedClient = selectedClientId ?clientIndex[selectedClientId] : null;

  useEffect(() => {
    if (mainView !== 'clients') return undefined;
    const frameId = window.requestAnimationFrame(() => {
      const scrollContainer = clientRegistryScrollRef.current;
      if (!scrollContainer) return;
      try {
        const savedPosition = Number(window.sessionStorage.getItem(CLIENT_REGISTRY_SCROLL_STORAGE_KEY));
        if (Number.isFinite(savedPosition) && savedPosition >= 0) scrollContainer.scrollTop = savedPosition;
      } catch {
        // Nedostupne sessionStorage nema branit pouziti registru.
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [mainView, clients.length]);

  const rememberClientRegistryScroll = (event) => {
    try {
      window.sessionStorage.setItem(CLIENT_REGISTRY_SCROLL_STORAGE_KEY, String(Math.round(event.currentTarget.scrollTop)));
    } catch {
      // Pozice je pouze komfortni nastaveni; pri blokovanem ulozisti ji ignorujeme.
    }
  };

  const goalDeadlineAlerts = useMemo(
    () => buildGoalDeadlineAlerts({ clients: accessibleClients, records, warningDays: GOAL_DEADLINE_WARNING_DAYS }),
    [accessibleClients, records]
  );

  const goalAlertPreviewItems = useMemo(
    () => [...goalDeadlineAlerts.overdue, ...goalDeadlineAlerts.approaching].slice(0, 3),
    [goalDeadlineAlerts]
  );

  const goalAlertSignature = useMemo(
    () => buildGoalAlertSignature(goalDeadlineAlerts),
    [goalDeadlineAlerts]
  );

  const goalAlertsVisible = goalDeadlineAlerts.total > 0 && !dismissedGoalAlertSignatures.includes(goalAlertSignature);

  useEffect(() => {
    setGoalAlertsExpanded(false);
  }, [goalAlertSignature]);

  const dismissGoalAlerts = () => {
    const nextSignatures = rememberDismissedGoalAlertSignature(dismissedGoalAlertSignatures, goalAlertSignature);
    setDismissedGoalAlertSignatures(nextSignatures);
    setGoalAlertsExpanded(false);
  };

  const hasUnsavedFormContent = () =>
    (showClientForm && hasContentInFields(clientDraft, CLIENT_DRAFT_CONTENT_FIELDS)) ||
    (showClientEditForm && hasContentInFields(clientEditDraft, CLIENT_DRAFT_CONTENT_FIELDS)) ||
    hasUnsavedGeneratorDraftContent(generatorDraft) ||
    hasContentValue(generatedText) ||
    hasContentInFields(ka01Draft, KA01_DRAFT_CONTENT_FIELDS) ||
    hasContentInFields(ka01ActorDraft, KA01_ACTOR_DRAFT_CONTENT_FIELDS) ||
    hasContentInFields(ka02Draft, KA02_DRAFT_CONTENT_FIELDS) ||
    hasContentInFields(ka03Draft, KA03_DRAFT_CONTENT_FIELDS);

  const resetFormDrafts = () => {
    const nextClientId = selectedClientId || clientSelectionPool[0]?.id || '';
    const nextWorker = currentWorker || WORKERS[0];

    setShowClientForm(false);
    setClientDraft({ ...emptyClientDraft, datumVstupu: todayIso(), keyWorker: isGarantWorker(nextWorker) ? '' : nextWorker });
    setShowClientEditForm(false);
    setClientEditDraft(emptyClientDraft);
    setGeneratorDraft({
      ...emptyGeneratorDraft,
      worker: nextWorker,
      clientId: nextClientId
    });
    setGeneratedText('');
    setLastGeneratedText('');
    setGenerationNotice('');
    setAiGenerationStatus('idle');
    setCopied(false);
    setClientCaseSummary('');
    setJourneyPlanDrafts({});
    setJourneyPlanStructuredDrafts({});
    setGeneratingJourneyPlanId('');
    setEditingKa01NetworkRecordId('');
    setEditingGeneratedRecordId('');
    setEditingKa03RecordId('');
    setExpandedKa01NetworkRecordIds([]);
    setKa01NetworkTimeError('');
    setKa01AttendanceSelection({});
    setKa01Draft({
      ...createKa01Draft(),
      worker: nextWorker,
      assessmentClientId: nextClientId
    });
    setKa01ActorDraft(createKa01ActorDraft());
    setKa02Draft({
      ...createKa02Draft(),
      worker: nextWorker,
      selectedClientId: nextClientId
    });
    setKa03Draft({
      ...createKa03Draft(),
      selectedClientId: nextClientId,
      tpmClientId: nextClientId,
      employmentClientId: nextClientId
    });
  };

  const confirmAndResetBeforeViewChange = () => {
    if (hasUnsavedFormContent()) {
      const confirmed = window.confirm('Ve formulářích jsou neuložené údaje. Při přechodu na jiný list se rozepsané formuláře vymažou. Pokračovat?');
      if (!confirmed) return false;
    }
    resetFormDrafts();
    return true;
  };

  const switchMainView = (nextView) => {
    if (!nextView || nextView === mainView) return true;
    if (!confirmAndResetBeforeViewChange()) return false;
    setMainView(nextView);
    return true;
  };


  useEffect(() => {
    if (mainView === 'clients' && showClientForm) {
      if (selectedClientId) setSelectedClientId('');
      return;
    }
    if (clientSelectionPool.length === 0) {
      setSelectedClientId('');
      setGeneratorDraft((prev) => ({ ...prev, clientId: '' }));
      setKa01Draft((prev) => ({ ...prev, assessmentClientId: '' }));
      setKa02Draft((prev) => ({ ...prev, selectedClientId: '' }));
      setKa03Draft((prev) => ({ ...prev, selectedClientId: '', tpmClientId: '', employmentClientId: '' }));
      return;
    }
    if (!selectedClientId || !clientSelectionPool.some((client) => client.id === selectedClientId)) {
      const nextClientId = clientSelectionPool[0].id;
      setSelectedClientId(nextClientId);
      setGeneratorDraft((prev) => ({ ...prev, clientId: nextClientId }));
      setKa01Draft((prev) => ({ ...prev, assessmentClientId: nextClientId }));
      setKa02Draft((prev) => ({ ...prev, selectedClientId: nextClientId }));
      setKa03Draft((prev) => ({ ...prev, selectedClientId: nextClientId, tpmClientId: nextClientId, employmentClientId: nextClientId }));
    }
  }, [clientSelectionPool, selectedClientId, mainView, showClientForm]);

  useEffect(() => {
    if (!selectedClientId) return;
    setGeneratorDraft((prev) => ({
      ...prev,
      clientId: selectedClientId,
      linkedPlanGoalId: '',
      linkedPlanGoalLabel: ''
    }));
    setKa01Draft((prev) => ({ ...prev, assessmentClientId: selectedClientId }));
    setKa02Draft((prev) => ({ ...prev, selectedClientId }));
    setKa03Draft((prev) => ({
      ...prev,
      selectedClientId,
      tpmClientId: selectedClientId,
      employmentClientId: selectedClientId
    }));
  }, [selectedClientId]);

  useEffect(() => {
    setSelectedJourneyPrintIds([]);
  }, [selectedClientId]);

  useEffect(() => {
    if (!clientFolderViewer.open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      clientFolderViewerRequestRef.current += 1;
      setClientFolderViewer((current) => ({ ...current, open: false }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [clientFolderViewer.open]);

  const recordsByType = useMemo(() => groupRecordsByType(records), [records]);

  const isReportingViewActive = mainView === 'dashboard';
  const shouldComputeIndicators = isReportingViewActive || ['ka2case', 'ka01', 'ka02'].includes(mainView);

  const selectedReportingPeriod = useMemo(
    () => REPORTING_PERIODS.find((item) => item.value === dashboardFilters.period) || REPORTING_PERIODS[0],
    [dashboardFilters.period]
  );

  const storedActivityRecords = useMemo(
    () => shouldComputeIndicators
      ? records.filter((record) => CURRENT_ACTIVITY_ENTITY_TYPES.has(record.entityType))
      : [],
    [records, shouldComputeIndicators]
  );

  const filteredRecords = useMemo(() => {
    if (!shouldComputeIndicators) return [];
    return storedActivityRecords.filter((record) => {
      const matchesPeriod = isDateWithinPeriod(record.activityDate || '', selectedReportingPeriod);
      const matchesKa = dashboardFilters.ka === 'all' || getEffectiveRecordKa(record) === dashboardFilters.ka;
      const matchesWorker = dashboardFilters.worker === 'all' || record.worker === dashboardFilters.worker;
      return matchesPeriod && matchesKa && matchesWorker;
    });
  }, [dashboardFilters, selectedReportingPeriod, shouldComputeIndicators, storedActivityRecords]);

  const isEsfSupportRecords = useMemo(
    () => isReportingViewActive
      ? getUniqueKa1ClientSupportRecords(
        records.filter((record) => isDateWithinPeriod(record.activityDate || '', selectedReportingPeriod))
      )
      : [],
    [isReportingViewActive, records, selectedReportingPeriod]
  );

  const isEsfSupportedClients = useMemo(() => {
    if (!isReportingViewActive) return [];
    const supportedClientIds = new Set(isEsfSupportRecords.flatMap(getRecordClientIds));
    return accessibleClients.filter((client) => supportedClientIds.has(client.id));
  }, [accessibleClients, isEsfSupportRecords, isReportingViewActive]);

  const isEsfPersonImportMatch = useMemo(
    () => isReportingViewActive
      ? matchClientsToIsEsfPersonRows(isEsfSupportedClients, isEsfPersonImport.rows)
      : { matchedClients: [], matchedPersonRows: [], unmatchedClients: [], ambiguousClients: [] },
    [isEsfPersonImport.rows, isEsfSupportedClients, isReportingViewActive]
  );

  useEffect(() => {
    isEsfExportRequestRef.current += 1;
    isEsfSupportExportRequestRef.current += 1;
    setIsEsfExportStatus({
      state: 'idle',
      message: 'Kontrola údajů a adres se spustí při stažení CSV.',
      addressFallbacks: [],
      addressAdjustments: [],
      educationFallbacks: [],
      dataIssues: []
    });
    setIsEsfSupportExportStatus({
      state: 'idle',
      message: isEsfPersonImport.rows.length
        ? 'Nahrané CSV z IS ESF je připravené pro vytvoření podpor ve zvoleném období.'
        : 'Nejprve nahrajte CSV podpořených osob vyexportované z IS ESF.',
      issues: []
    });
  }, [dashboardFilters.period, isEsfPersonImport.rows.length]);

  const filteredClientList = useMemo(() => {
    const normalizeSearchValue = (value) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const baseClients = showAllClients ? clients : accessibleClients;
    const term = normalizeSearchValue(searchQuery);
    if (!term) return baseClients;
    return baseClients.filter((client) => normalizeSearchValue(client.prijmeni).includes(term));
  }, [clients, accessibleClients, searchQuery, showAllClients]);

  const computedIndicators = useMemo(() => {
    if (!shouldComputeIndicators) return {};
    return buildIndicators({
      clients: accessibleClients,
      records: filteredRecords
    });
  }, [accessibleClients, filteredRecords, shouldComputeIndicators]);

  const professionalDevelopmentRecords = useMemo(() => {
    if (!isReportingViewActive) return [];
    const normalize = (value) =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    return records.filter((record) => {
      if (!['education_records', 'supervision_records'].includes(record.entityType)) return false;

      const payload = record.payload || {};
      const activityDate = record.activityDate || payload.date || '';
      if (!isDateWithinPeriod(activityDate, selectedReportingPeriod)) return false;
      if (dashboardFilters.worker === 'all') return true;

      const workers = Array.isArray(payload.workers)
        ? payload.workers
        : [
          record.worker,
          payload.worker,
          payload.workerName,
          payload.jmeno_pracovnika,
          payload.jmenoPracovnika
        ].filter(Boolean);

      return workers.some((worker) => normalize(worker) === normalize(dashboardFilters.worker));
    });
  }, [dashboardFilters.worker, isReportingViewActive, records, selectedReportingPeriod]);

  const dashboardOverview = useMemo(() => {
    if (!isReportingViewActive) return null;
    const normalize = (value) =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const contextRecordsByClient = new Map(clients.map((client) => [client.id, []]));
    records.forEach((record) => {
      const clientIds = Array.isArray(record.clientIds) ? record.clientIds : record.clientId ? [record.clientId] : [];
      clientIds.forEach((clientId) => {
        if (!contextRecordsByClient.has(clientId)) contextRecordsByClient.set(clientId, []);
        contextRecordsByClient.get(clientId).push(record);
      });
    });

    const filteredRecordsByClient = new Map(clients.map((client) => [client.id, []]));
    const supportMinutesByClient = new Map();
    filteredRecords.forEach((record) => {
      const clientIds = Array.isArray(record.clientIds) ? record.clientIds : record.clientId ? [record.clientId] : [];
      const minutes = Number(record.payload?.durationMinutes || 0);
      clientIds.forEach((clientId) => {
        if (!filteredRecordsByClient.has(clientId)) filteredRecordsByClient.set(clientId, []);
        filteredRecordsByClient.get(clientId).push(record);
        if (minutes > 0) supportMinutesByClient.set(clientId, (supportMinutesByClient.get(clientId) || 0) + minutes);
      });
    });

    const hoursFor = (clientId) => (supportMinutesByClient.get(clientId) || 0) / 60;
    const supportedClients = clients.filter((client) => hoursFor(client.id) > 0);
    const longTermClients = supportedClients.filter((client) => hoursFor(client.id) >= 40);
    const shortTermClients = supportedClients.filter((client) => hoursFor(client.id) < 40);

    const hasMinimumData = (client) =>
      Boolean(client.id && client.fullName && client.datumNarozeni && client.datumVstupu);
    const hasCompleteMonitoringData = (client) =>
      Boolean(
        client.monitoringListUrl && client.datumNarozeni && client.pohlavi && client.postaveniNaTrhu &&
        client.vzdelani && client.znevyhodneni && client.datumVstupu && client.mesto && client.psc
      );

    const longEligible = longTermClients.filter(hasCompleteMonitoringData);
    const shortEligible = shortTermClients.filter(hasMinimumData);
    const areaMatches = (record, aliases) => {
      const area = normalize(record.payload?.supportArea);
      return aliases.some((alias) => area.includes(normalize(alias)));
    };
    const clientIndex = new Map(clients.map((client) => [client.id, client]));
    const clientNamesForRecord = (record, fallbackClient = null) => {
      if (fallbackClient?.fullName) return fallbackClient.fullName;
      const clientIds = Array.isArray(record.clientIds) ? record.clientIds : record.clientId ? [record.clientId] : [];
      const names = clientIds
        .map((clientId) => clientIndex.get(clientId)?.fullName)
        .filter(Boolean);
      return names.length > 0 ? names.join(', ') : record.clientName || 'Bez přiřazeného klienta';
    };
    const goalEvidenceFromRecord = (record, client = null, detail = '') => ({
      key: `${client?.id || 'record'}-${record.id || record._id || `${record.entityType || 'record'}-${record.activityDate || ''}-${record.title || ''}`}`,
      clientName: clientNamesForRecord(record, client),
      date: record.activityDate || record.date || '',
      performance: record.payload?.consultationType || record.payload?.type || record.title || record.entityType || 'Výkon',
      area: record.payload?.supportArea || '',
      detail
    });
    const isCompletedGoal = (goal) => isGoalCompleted(goal);
    const evaluatedLongGoalEvidence = (client, aliases) => {
      const plans = (contextRecordsByClient.get(client.id) || []).filter((record) => record.entityType === 'plans');
      const activities = (filteredRecordsByClient.get(client.id) || []).filter(
        (record) => isLongTermProjectGoalEvidenceRecord(record) && areaMatches(record, aliases)
      );
      for (const activity of activities) {
        const goalId = String(activity.linkedPlanGoalId || activity.payload?.linkedPlanGoalId || '');
        if (!goalId || goalId === 'one-time-order') continue;
        for (const plan of plans) {
          const finalEvaluation = String(plan.finalEvaluation || plan.payload?.finalEvaluation || '').trim();
          const goal = getPlanGoals(plan).find(
            (item, index) => String(item.goalId || item.id || ('goal-' + (index + 1))) === goalId
          );
          if (goal && isCompletedGoal(goal) && (String(goal.goalEvaluation || '').trim() || finalEvaluation)) {
            const goalLabel = activity.linkedPlanGoalLabel || activity.payload?.linkedPlanGoalLabel || goal.goalText || goal.text || '';
            return goalEvidenceFromRecord(activity, client, goalLabel ? `Cíl individuálního plánu: ${goalLabel}` : 'Vyhodnocený cíl individuálního plánu');
          }
        }
      }
      return null;
    };
    const completedShortOrderEvidence = (client, aliases) => {
      const record = (filteredRecordsByClient.get(client.id) || []).find((item) => {
        if (!isShortTermProjectGoalEvidenceRecord(item) || !areaMatches(item, aliases)) return false;
        const outcome = String(item.payload?.outcome || item.documentText || '').trim();
        const goalId = String(item.linkedPlanGoalId || item.payload?.linkedPlanGoalId || '');
        return Boolean(outcome && (!goalId || goalId === 'one-time-order'));
      });
      return record ? goalEvidenceFromRecord(record, client, 'Dokončená jednorázová zakázka') : null;
    };
    const longGoalEvidence = (aliases) => longTermClients
      .map((client) => evaluatedLongGoalEvidence(client, aliases))
      .filter(Boolean);
    const shortGoalEvidence = (aliases) => shortTermClients
      .map((client) => completedShortOrderEvidence(client, aliases))
      .filter(Boolean);
    const socialInclusionEvidence = shortTermClients.map((client) => {
      const areas = new Map();
      (filteredRecordsByClient.get(client.id) || []).forEach((record) => {
        const ka = normalize(record.ka).replace(/\s/g, '');
        if (!isShortTermProjectGoalEvidenceRecord(record) || !['ka1', 'ka01', 'ka2', 'ka02'].includes(ka)) return;
        const normalizedArea = normalize(record.payload?.supportArea);
        if (!normalizedArea || normalizedArea === normalize('soci\u00e1ln\u00ed za\u010dlen\u011bn\u00ed') || areas.has(normalizedArea)) return;
        areas.set(normalizedArea, record);
      });
      if (areas.size < 3) return null;
      const areaRecords = Array.from(areas.values());
      const areaLabels = areaRecords.map((record) => record.payload?.supportArea).filter(Boolean);
      const performances = Array.from(new Set(areaRecords.map(
        (record) => record.payload?.consultationType || record.payload?.type || record.title || record.entityType
      ).filter(Boolean)));
      return {
        key: `inclusion-${client.id}`,
        clientName: client.fullName || client.id,
        date: '',
        performance: performances.join(', '),
        area: areaLabels.join(', '),
        detail: `${areas.size} různé oblasti podpory v KA1/KA2`
      };
    }).filter(Boolean);

    const caseMeetingRecords = filteredRecords.filter(isCaseMeetingDashboardRecord);
    const outreachRecords = filteredRecords.filter(isDepistageRecord);
    const caseMeetingEvidence = caseMeetingRecords.map((record) => goalEvidenceFromRecord(record));
    const outreachEvidence = outreachRecords.map((record) => goalEvidenceFromRecord(record));
    const goalEvidenceByKey = {
      'parenting-long': longGoalEvidence(['rodina']),
      'housing-long': longGoalEvidence(['bydlení']),
      'work-long': longGoalEvidence(['zaměstnání']),
      'finance-long': longGoalEvidence(['finance/dluhy', 'dluhy']),
      'security-short': shortGoalEvidence(['bydlení', 'finance/dluhy', 'zaměstnání', 'práva/povinnosti']),
      'services-short': shortGoalEvidence(['zdraví', 'bezpečí', 'vzdělání', 'služby']),
      'parenting-short': shortGoalEvidence(['rodina']),
      'inclusion-short': socialInclusionEvidence,
      outreach: outreachEvidence,
      'case-meetings': caseMeetingEvidence
    };
    const hoursValue = (value) => {
      const minutes = hoursToMinutes(value);
      return minutes > 0 ? minutes / 60 : 0;
    };
    const roundHours = (value) => Math.round(Number(value || 0) * 100) / 100;
    const professionalDevelopmentStats = WORKERS.map((worker) => {
      const normalizedWorker = normalize(worker);
      const stats = {
        key: normalizedWorker || worker,
        worker,
        individualSupervisionHours: 0,
        groupSupervisionHours: 0,
        education2026Hours: 0,
        education2027Hours: 0,
        education2028Hours: 0,
        educationTotalHours: 0,
        supervisionTotalHours: 0
      };

      professionalDevelopmentRecords
        .filter((record) => record.entityType === 'education_records')
        .forEach((record) => {
          const payload = record.payload || {};
          const workers = Array.isArray(payload.workers)
            ? payload.workers
            : [record.worker, payload.worker, payload.workerName, payload.jmeno_pracovnika, payload.jmenoPracovnika].filter(Boolean);
          if (!workers.some((item) => normalize(item) === normalizedWorker)) return;
          const hours = hoursValue(payload.hours);
          const year = String(payload.date || record.activityDate || '').slice(0, 4);
          if (year === '2026') stats.education2026Hours += hours;
          if (year === '2027') stats.education2027Hours += hours;
          if (year === '2028') stats.education2028Hours += hours;
          stats.educationTotalHours += hours;
        });

      professionalDevelopmentRecords
        .filter((record) => record.entityType === 'supervision_records')
        .forEach((record) => {
          const payload = record.payload || {};
          const workers = Array.isArray(payload.workers)
            ? payload.workers
            : [record.worker, payload.worker, payload.workerName, payload.jmeno_pracovnika, payload.jmenoPracovnika].filter(Boolean);
          if (!workers.some((item) => normalize(item) === normalizedWorker)) return;
          const hours = hoursValue(payload.hours);
          const supervisionType = normalize(payload.type || record.title);
          if (supervisionType.includes('skupin')) stats.groupSupervisionHours += hours;
          else stats.individualSupervisionHours += hours;
          stats.supervisionTotalHours += hours;
        });

      return {
        ...stats,
        individualSupervisionHours: roundHours(stats.individualSupervisionHours),
        groupSupervisionHours: roundHours(stats.groupSupervisionHours),
        education2026Hours: roundHours(stats.education2026Hours),
        education2027Hours: roundHours(stats.education2027Hours),
        education2028Hours: roundHours(stats.education2028Hours),
        educationTotalHours: roundHours(stats.educationTotalHours),
        supervisionTotalHours: roundHours(stats.supervisionTotalHours)
      };
    });
    const missingPlanCount = longTermClients.filter(
      (client) => !(contextRecordsByClient.get(client.id) || []).some((record) => record.entityType === 'plans')
    ).length;
    const missingGoalEvaluationCount = supportedClients.filter((client) =>
      (contextRecordsByClient.get(client.id) || [])
        .filter((record) => record.entityType === 'plans')
        .some((plan) => getPlanGoals(plan).some((goal) => isGoalTerminal(goal) && !String(goal.goalEvaluation || '').trim()))
    ).length;
    const completeMonitoringCount = longTermClients.filter(hasCompleteMonitoringData).length;
    const partnerStats = buildPartnerStats({
      records: filteredRecords,
      partners: records.filter((record) => record.entityType === 'actor_registry'),
      projectStartDate: PROJECT_START_DATE,
      referenceDate: selectedReportingPeriod?.end || todayIso()
    });
    const activePartners = partnerStats.filter((partner) => partner.isActiveInProject);

    return {
      indicators: [
        { key: '600000', code: '600 000', label: 'Celkov\u00fd po\u010det \u00fa\u010dastn\u00edk\u016f', current: longEligible.length, target: 29 },
        { key: '670102', code: '670 102', label: 'Vyu\u017e\u00edv\u00e1n\u00ed podpo\u0159en\u00fdch slu\u017eeb', current: shortEligible.length, target: 100 }
      ],
      longGoals: [
        { key: 'parenting-long', label: 'Rodi\u010dovsk\u00e9 kompetence', current: goalEvidenceByKey['parenting-long'].length, target: 11, evidence: goalEvidenceByKey['parenting-long'] },
        { key: 'housing-long', label: 'Bydlen\u00ed', current: goalEvidenceByKey['housing-long'].length, target: 5, evidence: goalEvidenceByKey['housing-long'] },
        { key: 'work-long', label: 'Pracovn\u00ed kompetence', current: goalEvidenceByKey['work-long'].length, target: 5, evidence: goalEvidenceByKey['work-long'] },
        { key: 'finance-long', label: 'Finan\u010dn\u00ed situace', current: goalEvidenceByKey['finance-long'].length, target: 5, evidence: goalEvidenceByKey['finance-long'] }
      ],
      shortGoals: [
        {
          key: 'security-short',
          label: 'Soci\u00e1ln\u00ed zabezpe\u010den\u00ed',
          current: goalEvidenceByKey['security-short'].length,
          target: 50,
          evidence: goalEvidenceByKey['security-short']
        },
        {
          key: 'services-short',
          label: 'P\u0159\u00edstup ke slu\u017eb\u00e1m',
          current: goalEvidenceByKey['services-short'].length,
          target: 25,
          evidence: goalEvidenceByKey['services-short']
        },
        { key: 'parenting-short', label: 'Rodi\u010dovsk\u00e9 kompetence', current: goalEvidenceByKey['parenting-short'].length, target: 20, evidence: goalEvidenceByKey['parenting-short'] },
        { key: 'inclusion-short', label: 'Soci\u00e1ln\u00ed za\u010dlen\u011bn\u00ed (min. 3 oblasti v KA1/KA2)', current: goalEvidenceByKey['inclusion-short'].length, target: 5, evidence: goalEvidenceByKey['inclusion-short'] }
      ],
      activityGoals: [
        { key: 'outreach', label: 'Depist\u00e1\u017en\u00ed z\u00e1znamy', current: goalEvidenceByKey.outreach.length, target: 100, evidence: goalEvidenceByKey.outreach, evidenceLabel: 'Započtené záznamy' },
        {
          key: 'case-meetings',
          label: 'P\u0159\u00edpadov\u00e1 / multioborov\u00e1 setk\u00e1n\u00ed',
          current: goalEvidenceByKey['case-meetings'].length,
          target: 15,
          note: CASE_MEETING_DASHBOARD_NOTE,
          evidence: goalEvidenceByKey['case-meetings'],
          evidenceLabel: 'Započtené záznamy'
        }
      ],
      professionalDevelopmentStats,
      partnerMetrics: [
        { key: 'partners-active', label: 'Spolupracující partneři', current: activePartners.length, detail: 'Alespoň jedna doložená aktivita' },
        { key: 'partners-new', label: 'Nově zapojení partneři', current: partnerStats.filter((partner) => partner.isNewInProject).length, detail: 'Podle registru od zahájení projektu' },
        { key: 'partners-once', label: 'Jednorázově zapojení partneři', current: activePartners.filter((partner) => partner.totalActivityCount === 1).length, detail: 'Právě jedna doložená aktivita' },
        { key: 'partners-90-days', label: 'Aktivní partneři za 90 dní', current: activePartners.filter((partner) => partner.isActiveLast90Days).length, detail: 'Aktivita v posledních 90 dnech období' }
      ],
      risks: [
        { key: 'near-40', label: 'Klienti bl\u00edzko 40 hodin', count: supportedClients.filter((client) => hoursFor(client.id) >= 30 && hoursFor(client.id) < 40).length, detail: '30\u201339,99 hodiny podpory' },
        { key: 'long-not-counted', label: 'Nad 40 hodin, ale nezapo\u010dteno do 600 000', count: longTermClients.length - longEligible.length, detail: 'Chyb\u00ed povinn\u00e9 monitorovac\u00ed \u00fadaje' },
        { key: 'short-not-counted', label: 'Pod 40 hodin, ale nezapo\u010dteno do 670 102', count: shortTermClients.length - shortEligible.length, detail: 'Chyb\u00ed minim\u00e1ln\u00ed registra\u010dn\u00ed \u00fadaje' },
        { key: 'missing-plan', label: 'Chyb\u00ed individu\u00e1ln\u00ed pl\u00e1n u 40+', count: missingPlanCount, detail: 'Riziko pro dolo\u017een\u00ed dlouhodob\u00e9 podpory' },
        { key: 'missing-evaluation', label: 'Chyb\u00ed vyhodnocen\u00ed c\u00edle', count: missingGoalEvaluationCount, detail: 'Uzav\u0159en\u00fd c\u00edl nem\u00e1 slovn\u00ed vyhodnocen\u00ed' }
      ]
    };
  }, [clients, filteredRecords, isReportingViewActive, professionalDevelopmentRecords, records, selectedReportingPeriod]);

  const periodRecordsForZor = useMemo(
    () => isReportingViewActive
      ? records.filter(
        (record) => ZOR_ACTIVITY_ENTITY_TYPES.has(record.entityType)
          && isDateWithinPeriod(record.activityDate || '', selectedReportingPeriod)
      )
      : [],
    [isReportingViewActive, records, selectedReportingPeriod]
  );

  const clientTimeline = useMemo(() => {
    if (!selectedClientId) return [];
    return records
      .filter((record) => {
        const clientIds = Array.isArray(record.clientIds) ?record.clientIds : record.clientId ?[record.clientId] : [];
        return clientIds.includes(selectedClientId);
      })
      .sort((a, b) => (b.activityDate || '').localeCompare(a.activityDate || ''));
  }, [records, selectedClientId]);

  const clientJourneyTimeline = useMemo(() => {
    if (!selectedClient) return [];

    const timelineRecords = records
      .filter((record) => {
        const clientIds = Array.isArray(record.clientIds) ?record.clientIds : record.clientId ?[record.clientId] : [];
        return clientIds.includes(selectedClient.id) && CLIENT_JOURNEY_ENTITY_TYPES.has(record.entityType);
      })
      .sort(compareTimelineRecordsDesc)
      .map((record) => ({
        ...record,
        isSynthetic: false
      }));

    const entryDate = selectedClient.datumVstupu || selectedClient.datumZarazeni || '';
    const syntheticEntry = entryDate
      ? [{
          id: `entry-${selectedClient.id}`,
          entityType: 'project_entry',
          activityDate: entryDate,
          worker: '',
          ka: '',
          title: 'Zařazení klienta do projektu',
          clientId: selectedClient.id,
          clientIds: [selectedClient.id],
          clientName: selectedClient.fullName,
          summary: `Status klienta: ${selectedClient.projectStatusLabel || 'Neuvedeno'}`,
          isSynthetic: true
        }]
      : [];

    return [...syntheticEntry, ...timelineRecords].sort(compareTimelineRecordsDesc);
  }, [records, selectedClient]);

  const selectedClientSupportBreakdown = useMemo(() => {
    if (!selectedClient) return { totalCount: 0, totalDocuments: 0, totalHours: 0, totalMinutes: 0, byType: [] };
    return getClientSupportBreakdown(selectedClient.id, records);
  }, [records, selectedClient]);

  const selectedClientDriveBundle = useMemo(() => {
    if (!selectedClient) return null;
    const storedBundle = records.find(
      (record) => record.entityType === 'client_folder_bundle' && record.clientId === selectedClient.id
    );
    if (storedBundle) return storedBundle;
    if (!selectedClient.driveFolderUrl && !selectedClient.monitoringListUrl) return null;
    return {
      id: 'sheet-drive-bundle-' + selectedClient.id,
      entityType: 'client_folder_bundle',
      clientId: selectedClient.id,
      payload: {
        clientFolderUrl: selectedClient.driveFolderUrl || '',
        clientFolderName: selectedClient.fullName || selectedClient.id,
        monListFileUrl: selectedClient.monitoringListUrl || '',
        monListFileName: 'Monitorovac\u00ed list - ' + (selectedClient.fullName || selectedClient.id)
      }
    };
  }, [records, selectedClient]);

  const hasCompleteSelectedClientDriveBundle = Boolean(
    selectedClientDriveBundle?.payload?.clientFolderUrl
    && selectedClientDriveBundle?.payload?.monListFileUrl
  );

  const closeClientFolderViewer = () => {
    clientFolderViewerRequestRef.current += 1;
    setClientFolderViewer((current) => ({ ...current, open: false }));
  };

  const loadClientFolderFilePreview = async (clientId, file) => {
    if (!clientId || !file?.id) return;
    const requestId = ++clientFolderViewerRequestRef.current;
    setClientFolderViewer((current) => ({
      ...current,
      selectedFileId: file.id,
      preview: null,
      previewLoading: true,
      previewError: ''
    }));
    try {
      const result = await fetchGoogleSheetAction(
        'getClientFolderFilePreview',
        1,
        45000,
        { klient_id: clientId, file_id: file.id }
      );
      if (clientFolderViewerRequestRef.current !== requestId) return;
      setClientFolderViewer((current) => ({
        ...current,
        preview: result?.preview || null,
        previewLoading: false,
        previewError: result?.preview ? '' : 'Náhled dokumentu není dostupný.'
      }));
    } catch (error) {
      if (clientFolderViewerRequestRef.current !== requestId) return;
      setClientFolderViewer((current) => ({
        ...current,
        preview: null,
        previewLoading: false,
        previewError: error.message || 'Náhled dokumentu se nepodařilo načíst.'
      }));
    }
  };

  const openClientFolderViewer = async () => {
    if (!selectedClient?.id) return;
    const clientId = selectedClient.id;
    const requestId = ++clientFolderViewerRequestRef.current;
    setClientFolderViewer({
      open: true,
      clientId,
      clientName: selectedClient.fullName || selectedClient.id,
      folder: null,
      files: [],
      loading: true,
      error: '',
      selectedFileId: '',
      preview: null,
      previewLoading: false,
      previewError: ''
    });
    try {
      const result = await fetchGoogleSheetAction(
        'listClientFolderFiles',
        1,
        30000,
        { klient_id: clientId }
      );
      if (clientFolderViewerRequestRef.current !== requestId) return;
      const folder = result?.folder || null;
      const files = Array.isArray(folder?.files) ? folder.files : [];
      setClientFolderViewer((current) => ({
        ...current,
        folder,
        files,
        loading: false,
        error: ''
      }));
      if (files[0]) await loadClientFolderFilePreview(clientId, files[0]);
    } catch (error) {
      if (clientFolderViewerRequestRef.current !== requestId) return;
      setClientFolderViewer((current) => ({
        ...current,
        loading: false,
        error: error.message || 'Obsah složky se nepodařilo načíst.'
      }));
    }
  };

  const selectedClientFolderFile = clientFolderViewer.files.find(
    (file) => file.id === clientFolderViewer.selectedFileId
  ) || null;

  const tpmRecords = useMemo(
    () =>
      records
        .filter((record) => record.entityType === 'tpm_records')
        .sort((a, b) => (b.payload?.startDate || b.activityDate || '').localeCompare(a.payload?.startDate || a.activityDate || '')),
    [records]
  );

  const employmentRecords = useMemo(
    () =>
      records
        .filter((record) => record.entityType === 'employment_records')
        .sort((a, b) => (b.payload?.employmentStartDate || b.activityDate || '').localeCompare(a.payload?.employmentStartDate || a.activityDate || '')),
    [records]
  );
  const ka01NetworkRecords = useMemo(
    () =>
      records
        .filter((record) => record.entityType === 'network_activities')
        .sort((a, b) => (b.activityDate || '').localeCompare(a.activityDate || '')),
    [records]
  );
  const ka01ActorRegistryRecords = useMemo(
    () => {
      const existing = records.filter((record) => record.entityType === 'actor_registry');
      const suppressedSeedIds = new Set(
        existing
          .map((record) => String(record.payload?.seedSourceId || '').trim())
          .filter(Boolean)
      );
      const normalizeKeyPart = (value) =>
        String(value || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ');
      const normalizeIco = (value) =>
        String(value || '')
          .replace(/[^\d]/g, '');
      const existingIdentityKeys = new Set(
        existing.map((record) => {
          const payload = record.payload || {};
          const icoKey = normalizeIco(payload.ico);
          return [
            normalizeKeyPart(payload.actorType),
            normalizeKeyPart(payload.municipality),
            icoKey
          ].join('|');
        })
      );
      const normalizedNames = new Set(existing.map((record) => String(record.payload?.name || '').trim().toLowerCase()));
      const seeded = KA01_DEFAULT_ACTOR_REGISTRY.filter(
        (item, index) => {
          const seedId = `seed-ka01-actor-${index + 1}`;
          if (suppressedSeedIds.has(seedId)) return false;
          const seedIdentityKey = [
            normalizeKeyPart(item.actorType),
            normalizeKeyPart(item.municipality),
            normalizeIco(item.ico)
          ].join('|');
          if (existingIdentityKeys.has(seedIdentityKey)) return false;
          return !normalizedNames.has(String(item.name || '').trim().toLowerCase());
        }
      ).map((item, index) => ({
        id: `seed-ka01-actor-${index + 1}`,
        ka: 'KA01',
        entityType: 'actor_registry',
        title: `Registr aktéra - ${item.name}`,
        activityDate: '',
        createdAt: 0,
        updatedAt: 0,
        worker: WORKER_NAMES.guarantor,
        payload: {
          id: '',
          ownerWorker: WORKER_NAMES.guarantor,
          ...item,
          networkOrigin: item.networkOrigin || 'výchozí síť'
        }
      }));
      return [...existing, ...seeded].sort((a, b) => (b.activityDate || '').localeCompare(a.activityDate || ''));
    },
    [records]
  );
  const educationRecords = useMemo(
    () => records.filter((record) => record.entityType === 'education_records').sort(compareTimelineRecordsDesc),
    [records]
  );
  const supervisionRecords = useMemo(
    () => records.filter((record) => record.entityType === 'supervision_records').sort(compareTimelineRecordsDesc),
    [records]
  );
  const ka01ActorOptions = useMemo(() => {
    const names = ka01ActorRegistryRecords
      .map((record) => String(record.payload?.name || '').trim())
      .filter(Boolean);
    const uniqueNames = Array.from(new Set(names));
    return [
      ...uniqueNames.map((name) => ({ value: name, label: name })),
      { value: KA01_ACTOR_CUSTOM, label: 'Jiná osoba (ručně)' }
    ];
  }, [ka01ActorRegistryRecords]);
  useEffect(() => {
    setKa01AttendanceSelection((prev) => {
      const next = { ...prev };
      ka01ActorRegistryRecords.forEach((record) => {
        const contacts = normalizeActorContacts(record.payload || {});
        if (Array.isArray(next[record.id])) {
          next[record.id] = selectedContactIds(next[record.id], contacts)
            .filter((contactId) => contacts.some((contact) => contact.id === contactId && isAttendanceReadyContact(contact)));
          return;
        }
        const defaultValue = Boolean(record.payload?.includeInAttendance);
        next[record.id] = defaultValue
          ? contacts.filter(isAttendanceReadyContact).map((contact) => contact.id)
          : [];
      });
      return next;
    });
  }, [ka01ActorRegistryRecords]);
  const ka01NetworkDuration = useMemo(
    () => formatDurationFromTimes(ka01Draft.networkStartTime, ka01Draft.networkEndTime),
    [ka01Draft.networkStartTime, ka01Draft.networkEndTime]
  );
  const ka01StartTimeSuggestions = useMemo(
    () => getKa01TimeSuggestions(ka01Draft.networkStartTime),
    [ka01Draft.networkStartTime]
  );
  const ka01EndTimeSuggestions = useMemo(
    () => getKa01TimeSuggestions(ka01Draft.networkEndTime),
    [ka01Draft.networkEndTime]
  );

  const generatorClient = generatorDraft.clientId ?clientIndex[generatorDraft.clientId] : null;
  const generatorConfig = REPORT_PROMPTS[generatorDraft.selectedKey];
  const getPlanGoalOptions = React.useCallback(
    (clientId) => {
      if (!clientId) return [];
      const planRecord = records
        .filter((record) => record.entityType === 'plans' && record.clientId === clientId)
        .sort((a, b) => {
          const aGoals = Array.isArray(a.goals) ? a.goals : a.payload?.goals || [];
          const bGoals = Array.isArray(b.goals) ? b.goals : b.payload?.goals || [];
          const aHasGoals = Number(aGoals.some((goal) => goal.goalDescription));
          const bHasGoals = Number(bGoals.some((goal) => goal.goalDescription));
          if (aHasGoals !== bHasGoals) return bHasGoals - aHasGoals;
          return (b.createdAt || 0) - (a.createdAt || 0);
        })[0];
      const goals = getPlanGoals(planRecord);

      return goals
        .map((goal, index) => {
          const label = goal.goalDescription || goal.description || goal.title || `Cíl ${index + 1}`;
          return {
            value: goal.goalId || goal.id || `goal-${index + 1}`,
            label: `${index + 1}. ${truncate(label, 90)}`
          };
        })
        .filter((goal) => goal.value);
    },
    [records]
  );
  const generatorPlanGoalOptions = useMemo(
    () => getPlanGoalOptions(generatorDraft.clientId),
    [generatorDraft.clientId, getPlanGoalOptions]
  );
  const previousGeneratorRecords = useMemo(() => {
    if (!generatorClient || !generatorConfig) return [];
    return records
      .filter((record) => {
        const clientIds = Array.isArray(record.clientIds) ?record.clientIds : record.clientId ?[record.clientId] : [];
        return clientIds.includes(generatorClient.id) && record.entityType === generatorConfig.entityType;
      })
      .sort((a, b) => {
        const left = `${b.activityDate || ''}-${b.createdAt || 0}`;
        const right = `${a.activityDate || ''}-${a.createdAt || 0}`;
        return left.localeCompare(right);
      })
      .slice(0, 3);
  }, [generatorClient, generatorConfig, records]);
  const nextTherapySessionOrder = useMemo(() => {
    if (!generatorDraft.clientId) return '1';
    const therapyRecords = records.filter((record) => record.entityType === 'therapy_sessions' && record.clientId === generatorDraft.clientId);
    const highestOrder = therapyRecords.reduce((maxOrder, record) => {
      const order = Number(record.payload?.sessionOrder || 0);
      return Number.isFinite(order) ? Math.max(maxOrder, order) : maxOrder;
    }, 0);
    return String(Math.max(highestOrder, therapyRecords.length) + 1);
  }, [generatorDraft.clientId, records]);

  useEffect(() => {
    if (mainView === 'ka02') {
      setGeneratorDraft((prev) => ({
        ...prev,
        selectedKey: KA02_STRUCTURED_FORM_KEYS.includes(prev.selectedKey) ?prev.selectedKey : 'consultation',
        clientId: ka02Draft.selectedClientId || prev.clientId
      }));
    }
    if (mainView === 'ka03') {
      const preferredTpm =
        tpmRecords.find((record) => record.clientId === (ka03Draft.tpmClientId || ka03Draft.selectedClientId)) ||
        tpmRecords[0] ||
        null;
      setGeneratorDraft((prev) => ({
        ...prev,
        selectedKey: 'consultation',
        tpmRecordId: prev.tpmRecordId || preferredTpm?.id || '',
        clientId: prev.clientId || preferredTpm?.clientId || ka03Draft.tpmClientId || ka03Draft.employmentClientId || ka03Draft.selectedClientId,
        worker: currentWorker || WORKER_NAMES.socialWorker
      }));
    }
  }, [currentWorker, mainView, ka02Draft.selectedClientId, ka03Draft.selectedClientId, ka03Draft.tpmClientId, ka03Draft.employmentClientId, tpmRecords]);

  useEffect(() => {
    if (generatorDraft.selectedKey !== 'therapy' || editingGeneratedRecordId) return;
    setGeneratorDraft((prev) => {
      if (prev.sessionOrder === nextTherapySessionOrder) return prev;
      return {
        ...prev,
        sessionOrder: nextTherapySessionOrder
      };
    });
  }, [editingGeneratedRecordId, generatorDraft.selectedKey, nextTherapySessionOrder]);

  useEffect(() => {
    if (!KA02_STRUCTURED_FORM_KEYS.includes(generatorDraft.selectedKey) || editingGeneratedRecordId) return;
    // Globální pracovník se nesmí měnit automaticky podle zvoleného formuláře.
    // Zůstává navolený v horní liště i při přepínání listů a typů dokumentů.
  }, [editingGeneratedRecordId, generatorDraft.selectedKey]);

  useEffect(() => {
    setZorTexts(null);
  }, [dashboardFilters.period]);

  const setFlash = (message) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 3000);
  };

  const installApplication = async () => {
    const availablePrompt = installPrompt || window.__MB_INSTALL_PROMPT__;
    if (!availablePrompt) {
      setInstallHelpVisible(true);
      setFlash('Chrome zatím instalační okno nepřipravil. Postup instalace je zobrazen pod tlačítkem.');
      return;
    }
    await availablePrompt.prompt();
    const choice = await availablePrompt.userChoice;
    window.__MB_INSTALL_PROMPT__ = null;
    setInstallPrompt(null);
    if (choice?.outcome === 'accepted') {
      setInstallHelpVisible(false);
      setFlash('Instalace aplikace byla potvrzena.');
    } else {
      setInstallHelpVisible(true);
      setFlash('Instalace byla zavřena. Můžeš ji později spustit znovu přes nabídku Chrome.');
    }
  };

  const setSaveButtonNotice = (key, tone, text) => {
    setSaveButtonNotices((previous) => ({
      ...previous,
      [key]: { tone, text }
    }));
  };

  const clearSaveButtonNotice = (key) => {
    setSaveButtonNotices((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const saveErrorMessage = (fallback, error) => {
    if (error?.code === 'CONFLICT') {
      return `${fallback}: záznam mezitím změnil jiný uživatel. Obnovte data a změnu proveďte znovu.`;
    }
    const detail = String(error?.message || '').trim();
    if (/unknown action|nezn[aá]m[aá] akce/i.test(detail)) {
      return `${fallback}: nasazená verze Google Apps Scriptu tuto operaci ještě nepodporuje. V Apps Scriptu vytvořte novou verzi nasazení webové aplikace.`;
    }
    return detail ? `${fallback}: ${detail}` : fallback;
  };

  const normalizeDuplicateText = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();

  const normalizeRecordValue = (value) => {
    if (Array.isArray(value)) return value.map(normalizeRecordValue);
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = normalizeRecordValue(value[key]);
          return acc;
        }, {});
    }
    return value ?? '';
  };

  const buildDuplicateSignature = (record) =>
    JSON.stringify(
      normalizeRecordValue({
        entityType: record.entityType || '',
        ka: record.ka || '',
        activityDate: record.activityDate || '',
        worker: record.worker || '',
        clientId: record.clientId || '',
        clientIds: Array.isArray(record.clientIds) ? record.clientIds : [],
        clientName: record.clientName || '',
        title: record.title || '',
        documentText: cleanGeneratedText(record.documentText || ''),
        payload: record.payload || {},
        indicatorFlags: record.indicatorFlags || {}
      })
    );

  const buildClientDuplicateSignature = (draft = {}) =>
    JSON.stringify({
      jmeno: normalizeDuplicateText(draft.jmeno),
      prijmeni: normalizeDuplicateText(draft.prijmeni),
      datumNarozeni: String(draft.datumNarozeni || '').trim(),
      email: normalizeDuplicateText(draft.email),
      telefon: normalizeDuplicateText(draft.telefon).replace(/\s+/g, ''),
      datumVstupu: String(draft.datumVstupu || '').trim()
    });

  const isSameClientIdentity = (left = {}, right = {}) => {
    const leftFirstName = normalizeDuplicateText(left.jmeno);
    const rightFirstName = normalizeDuplicateText(right.jmeno);
    const leftLastName = normalizeDuplicateText(left.prijmeni);
    const rightLastName = normalizeDuplicateText(right.prijmeni);
    if (!leftFirstName || !leftLastName || leftFirstName !== rightFirstName || leftLastName !== rightLastName) return false;

    const leftBirthDate = String(left.datumNarozeni || '').trim();
    const rightBirthDate = String(right.datumNarozeni || '').trim();
    if (leftBirthDate && rightBirthDate) return leftBirthDate === rightBirthDate;

    // Neúplný nový záznam se stejným jménem nesmí obejít ochranu jen tím,
    // že v něm chybí datum narození, kontakt nebo datum vstupu.
    return true;
  };

  const findDuplicateClient = (draft = {}, excludedClientId = '', sourceClients = clients) =>
    sourceClients.find((client) => client.id !== excludedClientId && isSameClientIdentity(draft, client));

  const getDuplicateSaveMessage = (payload) => {
    if (payload.entityType === 'plans' && payload.clientId) {
      const existingPlan = records.find((record) => record.entityType === 'plans' && record.clientId === payload.clientId);
      if (existingPlan) {
        return `Klient už má založený individuální plán rozvoje: "${existingPlan.title || 'Plán rozvoje'}".`;
      }
    }

    const signature = buildDuplicateSignature(payload);
    const duplicate = records.find((record) => buildDuplicateSignature(record) === signature);
    if (duplicate) {
      return `Shodný zápis už v evidenci existuje: "${duplicate.title || 'Bez názvu'}".`;
    }

    return '';
  };

  const syncRecordToGoogleDrive = async (record) => {
    if (!GOOGLE_DRIVE_UPLOAD_URL || !record?.clientId) return { skipped: true };

    const client = clientIndex[record.clientId] || {
      id: record.clientId,
      fullName: record.clientName || 'Bez klienta'
    };

    try {
      const response = await fetch(GOOGLE_DRIVE_UPLOAD_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(buildDriveUploadPayload(record, client))
      });
      if (response.type === 'opaque') {
        return { ok: true, opaque: true };
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || `Google Drive upload selhal se stavem ${response.status}.`);
      }
      return { ok: true, result };
    } catch (error) {
      console.error('Google Drive sync error:', error);
      return { ok: false, error };
    }
  };

  const persistClientDriveBundleRecord = (client, bundleResult) => {
    const payload = {
      entityType: 'client_folder_bundle',
      ka: '',
      title: 'Klientská složka na Google Drive',
      activityDate: todayIso(),
      worker: '',
      clientId: client.id,
      clientIds: [client.id],
      clientName: client.fullName,
      documentText: `Klientská složka byla připravena na Google Drive. Složka: ${bundleResult.clientFolderName || client.fullName}.`,
      payload: {
        ...bundleResult,
        generatedAt: new Date().toISOString()
      },
      indicatorFlags: {}
    };

    setRecords((previousRecords) => {
      const existingRecord = previousRecords.find(
        (record) => record.entityType === 'client_folder_bundle' && record.clientId === client.id
      );
      const nextRecord = existingRecord
        ? { ...existingRecord, ...payload, createdAt: existingRecord.createdAt || Date.now() }
        : { ...payload, id: `local-drive-bundle-${client.id}`, createdAt: Date.now() };
      return existingRecord
        ? previousRecords.map((record) => (record.id === existingRecord.id ? nextRecord : record))
        : [nextRecord, ...previousRecords];
    });
  };

  const provisionClientDriveFolder = async (client, { silent = false, registryVerified = false } = {}) => {
    const applyProvisionedClientFolder = (provisionedClient) => {
      const bundleResult = {
        clientFolderUrl: provisionedClient.drive_folder_url || provisionedClient.driveFolderUrl || '',
        clientFolderName: client.fullName || client.id,
        monListFileUrl: provisionedClient.monitoring_list_url || provisionedClient.monitoringListUrl || '',
        monListFileName: 'Monitorovací list - ' + (client.fullName || client.id)
      };
      if (!bundleResult.clientFolderUrl || !bundleResult.monListFileUrl) return false;

      setClients((previousClients) => previousClients.map((item) => (
        item.id === client.id
          ? {
            ...item,
            driveFolderUrl: bundleResult.clientFolderUrl || item.driveFolderUrl || '',
            monitoringListUrl: bundleResult.monListFileUrl || item.monitoringListUrl || ''
          }
          : item
      )));
      persistClientDriveBundleRecord(client, bundleResult);
      if (!silent) setFlash('Složka klienta a monitorovací list byly připraveny.');
      return true;
    };

    if (!isClientRegistryAvailable) {
      if (!silent) setFlash('Klientský registr není dostupný. Vytvoření složky bylo zablokováno.');
      return false;
    }
    if (!GOOGLE_SHEET_MACRO_URL) {
      if (!silent) setFlash('Propojen\u00ed s Google Diskem nen\u00ed nastaven\u00e9.');
      return false;
    }

    try {
      const response = await fetch(GOOGLE_SHEET_MACRO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ensureClientFolder',
          klient_id: client.id
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false || !result.client) {
        throw new Error(result.error || ('Vytvo\u0159en\u00ed slo\u017eky klienta selhalo se stavem ' + response.status + '.'));
      }

      const provisionedClient = result.client;
      const bundleResult = {
        clientFolderUrl: provisionedClient.drive_folder_url || '',
        clientFolderName: client.fullName || client.id,
        monListFileUrl: provisionedClient.monitoring_list_url || '',
        monListFileName: 'Monitorovac\u00ed list - ' + (client.fullName || client.id)
      };
      if (!bundleResult.clientFolderUrl || !bundleResult.monListFileUrl) {
        throw new Error('Apps Script nevr\u00e1til \u00fapln\u00fd odkaz na slo\u017eku a monitorovac\u00ed list klienta.');
      }

      setClients((previousClients) => previousClients.map((item) => (
        item.id === client.id
          ? {
            ...item,
            driveFolderUrl: bundleResult.clientFolderUrl || item.driveFolderUrl || '',
            monitoringListUrl: bundleResult.monListFileUrl || item.monitoringListUrl || ''
          }
          : item
      )));
      persistClientDriveBundleRecord(client, bundleResult);
      if (!silent) setFlash('Slo\u017eka klienta a monitorovac\u00ed list byly p\u0159ipraveny.');
      return true;
    } catch (error) {
      console.error('Client Drive folder provisioning error:', error);
      const verificationDelays = [0, 1500];
      for (const delayMs of verificationDelays) {
        if (delayMs) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
        try {
          const refreshedRegistry = await fetchGoogleSheetAction(
            'listClients',
            1,
            GOOGLE_SHEET_REQUEST_TIMEOUT_MS,
            { folder_verification_nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
          );
          const refreshedRows = Array.isArray(refreshedRegistry)
            ? refreshedRegistry
            : (Array.isArray(refreshedRegistry?.clients) ? refreshedRegistry.clients : []);
          const refreshedClient = refreshedRows.find((row) => (
            String(row?.klient_id || row?.id || '').trim() === client.id
          ));
          if (refreshedClient && applyProvisionedClientFolder(refreshedClient)) return true;
        } catch (verificationError) {
          console.warn('Client Drive folder confirmation failed:', verificationError);
        }
      }
      if (!silent) setFlash(error.message || 'Slo\u017eku klienta se nepoda\u0159ilo vytvo\u0159it.');
      return false;
    }
  };

  useEffect(() => {
    if (
      !selectedClient?.id
      || hasCompleteSelectedClientDriveBundle
      || !isClientRegistryAvailable
      || !GOOGLE_SHEET_MACRO_URL
      || clientDriveProvisionAttemptsRef.current.has(selectedClient.id)
    ) return;

    clientDriveProvisionAttemptsRef.current.add(selectedClient.id);
    void provisionClientDriveFolder(selectedClient, { silent: true }).then((folderReady) => {
      if (!folderReady) {
        setFlash('Automatická příprava složky a monitorovacího listu se nezdařila. Znovu se spustí při prvním uloženém výkonu.');
      }
    });
  }, [hasCompleteSelectedClientDriveBundle, isClientRegistryAvailable, selectedClient?.id]);


  const postGoogleSheetAction = async (payload) => {
    const shouldTrackMutation = IDEMPOTENT_GOOGLE_SHEET_ACTIONS.has(payload?.action);
    const mutationSignature = shouldTrackMutation ? mutationPayloadSignature(payload) : '';
    let mutationRequestId = String(payload?.request_id || '').trim();
    if (shouldTrackMutation && !mutationRequestId) {
      mutationRequestId = genericMutationIdsRef.current.get(mutationSignature)
        || createClientMutationRequestId(payload.action);
      genericMutationIdsRef.current.set(mutationSignature, mutationRequestId);
      while (genericMutationIdsRef.current.size > 100) {
        const oldestKey = genericMutationIdsRef.current.keys().next().value;
        if (!oldestKey) break;
        genericMutationIdsRef.current.delete(oldestKey);
      }
    }
    const requestPayload = mutationRequestId && !payload.request_id
      ? { ...payload, request_id: mutationRequestId }
      : payload;
    if (!GOOGLE_SHEET_MACRO_URL) throw new Error('Propojení s Google Sheetem není nastavené.');
    const response = await fetch(GOOGLE_SHEET_MACRO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(requestPayload)
    });
    const result = await parseGoogleSheetResponse(response);
    currentDataRevisionRef.current = String(
      response.headers.get('x-data-revision') || currentDataRevisionRef.current
    );
    if (mutationSignature) genericMutationIdsRef.current.delete(mutationSignature);
    return result;
  };

  const recordDocumentDescriptor = (record) => {
    if (!record?.documentSyncPending || record?.entityType !== 'consultations' || !record?.clientId || !record?.documentText) return null;
    const isCaseManagement = record.ka === 'KA2' || record.payload?.caseManagementMode;
    return {
      recordType: isCaseManagement ? 'meeting' : 'performance',
      recordId: String(record.id || '')
    };
  };

  const fetchRecordDocumentStatus = async ({ recordType, recordId }) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    try {
      const url = new URL(GOOGLE_SHEET_MACRO_URL, window.location.origin);
      url.searchParams.set('action', 'getRecordDocumentStatus');
      url.searchParams.set('record_type', recordType);
      url.searchParams.set('record_id', recordId);
      const response = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`Stav dokumentu nelze načíst (HTTP ${response.status}).`);
      const result = await response.json().catch(() => ({}));
      if (result?.ok !== true) throw new Error(result?.error || 'Stav dokumentu nelze načíst.');
      return result.document || null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const applyRecordDocumentStatus = (recordId, status) => {
    setRecords((previousRecords) => previousRecords.map((record) => (
      record.id === recordId
        ? {
          ...record,
          documentUrl: status?.documentUrl || record.documentUrl || '',
          documentSyncPending: status?.state === 'queued' || status?.state === 'processing',
          documentSyncState: status?.state || '',
          documentSyncError: status?.error || ''
        }
        : record
    )));
  };

  const applyClientFolderState = (status) => {
    const clientId = String(status?.clientId || '').trim();
    const clientFolderUrl = String(status?.clientFolderUrl || '').trim();
    const monitoringListUrl = String(status?.monitoringListUrl || '').trim();
    if (!clientId || (!clientFolderUrl && !monitoringListUrl)) return;
    setClients((previousClients) => previousClients.map((client) => (
      client.id === clientId
        ? {
          ...client,
          driveFolderUrl: clientFolderUrl || client.driveFolderUrl || '',
          monitoringListUrl: monitoringListUrl || client.monitoringListUrl || ''
        }
        : client
    )));
  };

  const monitorRecordDocument = async (record, descriptor, { noticeKey = '', successText = 'Uloženo' } = {}) => {
    const showStatus = (tone, text) => {
      if (noticeKey) setSaveButtonNotice(noticeKey, tone, text);
      else setFlash(text);
    };
    applyRecordDocumentStatus(record.id, { state: 'queued' });
    showStatus('progress', `${successText}. Dokument se připravuje na pozadí…`);

    if (record?.documentSyncState === 'queue_error') {
      try {
        await postGoogleSheetAction({
          action: 'retryRecordDocument',
          record_type: descriptor.recordType,
          record_id: descriptor.recordId
        });
      } catch (error) {
        console.warn('Document queue retry remains pending:', error);
        showStatus('error', `${successText}. Data v Sheetu jsou bezpečně uložená; dokument se zatím nepodařilo zařadit do fronty.`);
        return;
      }
    }

    const delays = [1200, 1800, 2500, 3500, 5000, 7000, 9000, 12000, 15000, 15000, 15000, 15000];
    for (const delay of delays) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
      let status;
      try {
        status = await fetchRecordDocumentStatus(descriptor);
      } catch (error) {
        // Starší Apps Script nemusí stavovou akci ještě znát. Samotný zápis je potvrzený.
        console.warn('Document status check skipped:', error);
        continue;
      }
      if (!status) continue;
      applyRecordDocumentStatus(record.id, status);
      if (status.state === 'ready') {
        applyClientFolderState(status);
        showStatus('success', `${successText}. Dokument je připraven.`);
        return;
      }
      if (status.state === 'error') {
        showStatus('error', `${successText}, ale dokument se nepodařilo připravit ani po opakování. Data v Sheetu jsou bezpečně uložená.`);
        return;
      }
      if (status.state === 'queued' && /oprávněn|opravnen/i.test(String(status.error || ''))) {
        showStatus('error', `${successText}. Data v Sheetu jsou bezpečně uložená, ale frontu dokumentů je nutné jednou autorizovat v Apps Scriptu.`);
        return;
      }
      if (status.state === 'cancelled') return;
    }
    showStatus('progress', `${successText}. Složka, monitorovací list a dokument se stále připravují na pozadí.`);
  };

  const continueRecordSyncInBackground = (record, options = {}) => {
    const descriptor = recordDocumentDescriptor(record);
    if (descriptor?.recordId) {
      window.setTimeout(() => {
        void monitorRecordDocument(record, descriptor, options);
      }, 0);
    }
    if (record?.entityType !== 'ai_style_memory') {
      void syncRecordToGoogleDrive(record).then((result) => {
        if (result?.ok === false) console.warn('Legacy Drive sync remains pending:', result.error);
      });
    }
  };

  const loadBackupStatus = async () => {
    if (!GOOGLE_SHEET_MACRO_URL || !canSeeAllClients) return null;
    try {
      const url = new URL(GOOGLE_SHEET_MACRO_URL, window.location.origin);
      url.searchParams.set('action', 'getBackupStatus');
      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('Načtení stavu zálohy selhalo.');
      const result = await response.json().catch(() => ({}));
      if (result.ok === false) throw new Error(result.error || 'Načtení stavu zálohy selhalo.');
      const nextStatus = result.backup || { state: 'idle', message: 'Záloha zatím nebyla vytvořena.' };
      setBackupStatus(nextStatus);
      return nextStatus;
    } catch (error) {
      console.warn('Backup status refresh failed:', error);
      setBackupStatus((previous) => ({ ...previous, statusError: error.message || 'Stav zálohy nelze načíst.' }));
      return null;
    }
  };

  useEffect(() => {
    if (mainView !== 'dashboard' || !canSeeAllClients) return undefined;
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await loadBackupStatus();
    };
    void refresh();
    if (!isBackupStatusActive(backupStatus)) {
      return () => {
        active = false;
      };
    }
    const interval = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [mainView, canSeeAllClients, backupStatus.state]);

  const handleStartFullBackup = async () => {
    if (!canSeeAllClients || isBackupActionRunning) return;
    setIsBackupActionRunning(true);
    try {
      const result = await postGoogleSheetAction({ action: 'startFullBackup', requested_by: 'Odborný garant', requested_by_name: currentWorker });
      setBackupStatus(result?.backup || { state: 'queued', message: 'Záloha čeká na spuštění.' });
      setFlash('Kompletní záloha byla zařazena ke zpracování. Týdenní zálohování je aktivní.');
    } catch (error) {
      setBackupStatus({ state: 'error', message: error.message || 'Zálohu se nepodařilo spustit.' });
      setFlash(error.message || 'Zálohu se nepodařilo spustit.');
    } finally {
      setIsBackupActionRunning(false);
    }
  };

  const handleInstallWeeklyBackup = async () => {
    if (!canSeeAllClients || isBackupActionRunning) return;
    setIsBackupActionRunning(true);
    try {
      const result = await postGoogleSheetAction({ action: 'installWeeklyBackup', requested_by: 'Odborný garant', requested_by_name: currentWorker });
      setBackupStatus(result?.backup || backupStatus);
      setFlash('Týdenní automatická záloha byla zapnuta.');
    } catch (error) {
      setFlash(error.message || 'Týdenní zálohu se nepodařilo zapnout.');
    } finally {
      setIsBackupActionRunning(false);
    }
  };

  const refreshStatisticsRows = async () => {
    try {
      const url = new URL(GOOGLE_SHEET_MACRO_URL, window.location.origin);
      url.searchParams.set('action', 'listStatistics');
      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('Obnovení statistik selhalo.');
      const result = await response.json().catch(() => ({}));
      if (result.ok === false) throw new Error(result.error || 'Obnovení statistik selhalo.');
      setStatisticsRows(result.statistics || []);
      return true;
    } catch (error) {
      console.warn('Statistics refresh failed:', error);
      return false;
    }
  };

  useEffect(() => {
    if (mainView === 'dashboard') {
      void refreshStatisticsRows().then((ok) => {
        if (!ok) setFlash('Statistiky se nepodařilo obnovit z Google Sheetu.');
      });
    }
  }, [mainView]);

  const syncRecordToGoogleSheet = async (record) => {
    if (!GOOGLE_SHEET_MACRO_URL || record.entityType === 'ai_style_memory') return record;
    const payload = record.payload || {};
    const hasExplicitExpectedVersion = Object.prototype.hasOwnProperty.call(record, 'expectedUpdatedAt');
    const expectedUpdatedAt = hasExplicitExpectedVersion ? record.expectedUpdatedAt : record.updatedAt || '';
    const persistedSheetId = hasExplicitExpectedVersion ? record.id || '' : '';

    if (record.entityType === 'actor_registry') {
      const contactSheetFields = actorContactsToSheetFields(payload);
      const partnerToSave = {
        partner_id: persistedSheetId,
        nazev_subjektu: payload.name || record.title || '',
        typ_aktera: payload.actorType || '',
        puvod_site: payload.networkOrigin || 'st\u00e1vaj\u00edc\u00ed',
        datum_zapojeni: payload.joinedNetworkDate || record.activityDate || '',
        ...contactSheetFields,
        expected_updated_at: expectedUpdatedAt,
        status: 'Platn\u00fd',
        updated_by: record.worker || currentWorker || ''
      };
      let result;
      try {
        result = await postGoogleSheetAction({
          action: 'savePartner',
          partner: partnerToSave
        });
      } catch (error) {
        if (error?.code !== 'INVALID_JSON_RESPONSE') throw error;
        const verification = await fetchGoogleSheetAction('listPartners').catch(() => null);
        const verifiedPartners = (verification?.partners || []).filter((row) => {
          if (String(row.status || '').toLowerCase().includes('smaz')) return false;
          if (partnerToSave.partner_id && asSheetText(row.partner_id) !== partnerToSave.partner_id) return false;
          return actorSheetRowMatchesPayload(row, partnerToSave);
        });
        if (verifiedPartners.length !== 1) throw error;
        const [verifiedPartner] = verifiedPartners;
        result = { ok: true, partner: verifiedPartner, recoveredConfirmation: true };
      }
      const savedPartner = requireSavedGoogleSheetRecord(result, 'partner', 'partner_id', 'aktéra');
      return withSheetVersion({ ...record, id: savedPartner.partner_id }, savedPartner);
    }

    if (record.entityType === 'network_activities') {
      const result = await postGoogleSheetAction({
        action: 'saveNetworkMeeting',
        networkMeeting: {
          schuzka_site_id: persistedSheetId,
          datum: record.activityDate || '',
          cas_od: payload.startTime || '',
          cas_do: payload.endTime || '',
          typ_schuzky: payload.type || record.title || '',
          misto: payload.place || '',
          pracovnik: record.worker || '',
          partner_ids: Array.isArray(payload.partnerIds) ? payload.partnerIds.join(', ') : payload.partnerIds || '',
          rt_clenove: Array.isArray(payload.rtMembers) ? payload.rtMembers.join(', ') : payload.rtMembers || '',
          dalsi_osoby: Array.isArray(payload.otherPeople) ? payload.otherPeople.join(', ') : payload.otherPeople || '',
          partneri: Array.isArray(payload.partnerNames) ? payload.partnerNames.join(', ') : payload.partnerNames || '',
          obsah_jednani: payload.notes || '',
          vystup: payload.outcome || payload.description || '',
          dalsi_kroky: payload.nextSteps || '',
          dokument_text: record.documentText || payload.description || '',
          expected_updated_at: expectedUpdatedAt,
          status: 'Platn\u00fd'
        }
      });
      const savedMeeting = requireSavedGoogleSheetRecord(result, 'networkMeeting', 'schuzka_site_id', 'síťové aktivity');
      return withSheetVersion({ ...record, id: savedMeeting.schuzka_site_id }, savedMeeting);
    }

    if (record.entityType === 'education_records') {
      const workers = Array.isArray(payload.workers) ? payload.workers : [record.worker || payload.worker].filter(Boolean);
      const result = await postGoogleSheetAction({
        action: 'saveEducation',
        education: {
          vzdelavani_id: persistedSheetId,
          datum: record.activityDate || payload.date || '',
          pocet_hodin: payload.hours || '',
          nazev_vzdelavani: payload.title || record.title || '',
          cislo_akreditace: payload.accreditationNumber || '',
          jmeno_pracovnika: workers[0] || '',
          jmeno_pracovnika1: workers[0] || '',
          jmeno_pracovnika2: workers[1] || '',
          jmeno_pracovnika3: workers[2] || '',
          expected_updated_at: expectedUpdatedAt,
          status: 'Platný'
        }
      });
      const savedEducation = requireSavedGoogleSheetRecord(result, ['education', 'vzdelavani'], 'vzdelavani_id', 'vzdělávání');
      return withSheetVersion({ ...record, id: savedEducation.vzdelavani_id }, savedEducation);
    }

    if (record.entityType === 'supervision_records') {
      const workers = Array.isArray(payload.workers) ? payload.workers : [];
      const result = await postGoogleSheetAction({
        action: 'saveSupervision',
        supervision: {
          sepervize_id: persistedSheetId,
          datum: record.activityDate || payload.date || '',
          pocet_hodin: payload.hours || '',
          typ_supervize: payload.type || '',
          jmeno_pracovnika1: workers[0] || '',
          jmeno_pracovnika2: workers[1] || '',
          jmeno_pracovnika3: workers[2] || '',
          expected_updated_at: expectedUpdatedAt,
          status: 'Platn\u00fd'
        }
      });
      const savedSupervision = requireSavedGoogleSheetRecord(result, ['supervision', 'supervize'], 'sepervize_id', 'supervize');
      return withSheetVersion({ ...record, id: savedSupervision.sepervize_id }, savedSupervision);
    }

    if (record.entityType === 'plans') {
      const sourceGoals = Array.isArray(record.goals)
        ? record.goals
        : Array.isArray(payload.goals)
          ? payload.goals
          : Array.isArray(payload.structuredGoals)
            ? payload.structuredGoals
            : [];
      const normalizedGoals = sourceGoals.length
        ? sourceGoals.map((goal, index) => {
            const goalStatus = normalizeGoalStatus(goal);
            return {
              goalId: goal.goalId || goal.id || ('goal-' + (index + 1)),
              goalDescription: goal.goalDescription || goal.description || '',
              actionSteps: Array.isArray(goal.actionSteps) ? goal.actionSteps.join('\n') : goal.actionSteps || '',
              targetDate: goal.targetDate && typeof goal.targetDate.toDate === 'function'
                ? goal.targetDate.toDate().toISOString().slice(0, 10)
                : String(goal.targetDate || goal.deadline || '').slice(0, 10),
              goalStatus,
              isCompleted: goalStatus === GOAL_STATUS.COMPLETED,
              goalEvaluation: goalStatus === GOAL_STATUS.OPEN ? '' : goal.goalEvaluation || ''
            };
          })
        : [{
            goalId: 'goal-1',
            goalDescription: typeof payload.goals === 'string' ? payload.goals : '',
            actionSteps: payload.plannedSteps || '',
            targetDate: '',
            goalStatus: GOAL_STATUS.OPEN,
            isCompleted: false,
            goalEvaluation: ''
          }];
      const result = await postGoogleSheetAction({
        action: 'saveIndividualPlan',
        individualPlan: {
          plan_id: persistedSheetId,
          klient_id: record.clientId || '',
          popis_situace: payload.situationDescription || payload.currentSituation || '',
          cile_json: JSON.stringify(normalizedGoals),
          zaverecne_vyhodnoceni: payload.finalEvaluation || '',
          accepted_plan_text: payload.acceptedPlanText || record.documentText || '',
          pocet_minut: String(payload.durationMinutes ?? '').trim() && Number.isFinite(Number(payload.durationMinutes)) ? Number(payload.durationMinutes) : 60,
          expected_updated_at: expectedUpdatedAt,
          status: 'Platn\u00fd'
        }
      });
      const savedPlan = requireSavedGoogleSheetRecord(result, 'individualPlan', 'plan_id', 'individuálního plánu');
      return withSheetVersion({
        ...record,
        id: savedPlan.plan_id,
        goals: normalizedGoals,
        payload: { ...payload, structuredGoals: normalizedGoals }
      }, savedPlan);
    }

    if (record.clientId && payload.caseManagementMode) {
      const manualPartnerNames = Array.isArray(payload.manualPartnerNames) ? payload.manualPartnerNames.map((name) => String(name || '').trim()).filter(Boolean) : [];
      const participantNames = Array.isArray(payload.partnerNames) ? payload.partnerNames.map((name) => String(name || '').trim()).filter(Boolean) : [];
      const registeredPartnerNames = Array.isArray(payload.registeredPartnerNames) && payload.registeredPartnerNames.length ? payload.registeredPartnerNames : participantNames.filter((name) => !manualPartnerNames.includes(name));

      const result = await postGoogleSheetAction({
        action: 'saveMeeting',
        meeting: {
          meeting_id: persistedSheetId,
          klient_id: record.clientId || '',
          case_management_id: '',
          datum: record.activityDate || '',
          cas_od: payload.startTime || payload.ka02StartTime || '',
          cas_do: payload.endTime || payload.ka02EndTime || '',
          pocet_hodin: payload.durationMinutes ? Math.round((Number(payload.durationMinutes) / 60) * 100) / 100 : '',
          pracovnik: record.worker || '',
          typ_podpory: payload.consultationType || 'koordinace podpory klienta',
          tema_podpory: payload.supportArea || '',
          forma_poskytovani: 'ambulantn\u00ed',
          cil_ip_id: payload.linkedPlanGoalId || '',
          cil_ip: payload.linkedPlanGoalLabel || '',
          partner_ids: Array.isArray(payload.selectedPartnerIds) ? payload.selectedPartnerIds.join(';') : payload.selectedPartnerIds || '',
          partneri: registeredPartnerNames.join('; '),
          ucastnici: participantNames.join('; '),
          pocet_akteru: Number(payload.participantCount || 0),
          popis: payload.topics || '',
          vysledek: payload.outcome || '',
          dalsi_krok: payload.nextSteps || '',
          dokument_text: record.documentText || '',
          expected_updated_at: expectedUpdatedAt,
          status: 'Platn\u00fd'
        }
      });
      const savedMeeting = requireSavedGoogleSheetRecord(result, 'meeting', 'meeting_id', 'výkonu case managementu');
      return withSheetVersion({ ...record, id: savedMeeting.meeting_id }, savedMeeting);
    }

    if (record.clientId) {
      const result = await postGoogleSheetAction({
        action: 'savePerformance',
        performance: {
          vykon_id: persistedSheetId,
          klient_id: record.clientId || '',
          datum: record.activityDate || '',
          cas_od: payload.startTime || payload.ka02StartTime || '',
          cas_do: payload.endTime || payload.ka02EndTime || '',
          pocet_hodin: payload.durationMinutes ? Math.round((Number(payload.durationMinutes) / 60) * 100) / 100 : '',
          pracovnik: record.worker || '',
          typ_podpory: payload.consultationType || record.title || record.entityType || '',
          tema_podpory: payload.supportArea || payload.topics || payload.debtStage || payload.targetJob || payload.position || '',
          specificka_pole_json: JSON.stringify(payload || {}),
          ...mapKA1SupportSpecificToSheetColumns(payload.supportSpecific || {}),
          forma_poskytovani: payload.place || '',
          cil_ip_id: payload.linkedPlanGoalId || '',
          cil_ip: payload.linkedPlanGoalLabel || '',
          popis: payload.topics || payload.debtSummary || payload.themes || payload.feedback || payload.experience || '',
          vysledek: payload.outcome || payload.solutionPlan || payload.recommendations || payload.developmentAreas || '',
          dalsi_krok: payload.nextSteps || payload.plannedSteps || '',
          dokument_text: record.documentText || '',
          expected_updated_at: expectedUpdatedAt,
          status: 'Platn\u00fd'
        }
      });
      const savedPerformance = requireSavedGoogleSheetRecord(result, 'performance', 'vykon_id', 'výkonu');
      void refreshStatisticsRows();
      return withSheetVersion({ ...record, id: savedPerformance.vykon_id }, savedPerformance);
    }

    return record;
  };
  const saveRecord = async (payload, options = {}) => {
    const { noticeKey = '', progressText = 'Ukládám…', successText = 'Uloženo' } = options;
    const failSave = (message) => {
      if (noticeKey) setSaveButtonNotice(noticeKey, 'error', message);
      setFlash(message);
      return false;
    };
    const completeSave = () => {
      if (noticeKey) setSaveButtonNotice(noticeKey, 'success', successText);
      return true;
    };
    const writeBlockMessage = recordWriteBlockMessage(payload);
    if (writeBlockMessage) return failSave(writeBlockMessage);
    const hasClientBinding = Boolean(payload.clientId || (Array.isArray(payload.clientIds) && payload.clientIds.length));
    if (hasClientBinding && !isClientRegistryAvailable) {
      if (noticeKey) setSaveButtonNotice(noticeKey, 'error', 'Klientský registr není dostupný. Uložení bylo zablokováno.');
      setFlash('Klientský registr není dostupný. Uložení bylo zablokováno, aby záznam nebyl přiřazen nesprávnému klientovi.');
      return false;
    }
    const duplicateMessage = getDuplicateSaveMessage(payload);
    if (duplicateMessage) {
      return failSave(duplicateMessage);
    }
    const pendingSignature = buildDuplicateSignature(payload);
    if (pendingRecordSaveSignaturesRef.current.has(pendingSignature)) {
      if (noticeKey) setSaveButtonNotice(noticeKey, 'error', 'Tento záznam se už ukládá. Vyčkejte na dokončení.');
      setFlash('Tento záznam se už ukládá. Vyčkej na dokončení ukládání.');
      return false;
    }
    pendingRecordSaveSignaturesRef.current.add(pendingSignature);
    setIsSaving(true);
    if (noticeKey) setSaveButtonNotice(noticeKey, 'progress', progressText);
    try {
      const localRecord = {
        ...payload,
        id: payload.id || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now()
      };
      const syncedRecord = await syncRecordToGoogleSheet(localRecord);
      setRecords((previousRecords) => {
        const nextRecords = [
          syncedRecord,
          ...previousRecords.filter((record) => record.id !== syncedRecord.id)
        ];
        return nextRecords;
      });
      completeSave();
      continueRecordSyncInBackground(syncedRecord, { noticeKey, successText });
      return true;
    } catch (error) {
      console.error('Error saving record:', error);
      return failSave(saveErrorMessage('Záznam nebyl uložen', error));
    } finally {
      pendingRecordSaveSignaturesRef.current.delete(pendingSignature);
      setIsSaving(false);
    }
  };

  const updateExistingRecord = async (recordId, payload, options = {}) => {
    const { noticeKey = '', progressText = 'Ukládám…', successText = 'Uloženo' } = options;
    const failSave = (message) => {
      if (noticeKey) setSaveButtonNotice(noticeKey, 'error', message);
      setFlash(message);
      return false;
    };
    const completeSave = () => {
      if (noticeKey) setSaveButtonNotice(noticeKey, 'success', successText);
      return true;
    };
    const existingRecord = records.find((record) => record.id === recordId);
    if (!existingRecord) {
      if (noticeKey) setSaveButtonNotice(noticeKey, 'error', 'Upravovaný záznam už v evidenci není.');
      setFlash('Upravovaný záznam už v evidenci není.');
      return false;
    }
    const writeBlockMessage = recordWriteBlockMessage(existingRecord);
    if (writeBlockMessage) return failSave(writeBlockMessage);

    const mutationKey = `record:${recordId}`;
    if (pendingRecordMutationIdsRef.current.has(mutationKey)) {
      return failSave('Tento záznam se už ukládá. Vyčkejte na dokončení.');
    }
    pendingRecordMutationIdsRef.current.add(mutationKey);

    setIsSaving(true);
    if (noticeKey) setSaveButtonNotice(noticeKey, 'progress', progressText);
    try {
      const expectedUpdatedAt = Object.prototype.hasOwnProperty.call(payload, 'expectedUpdatedAt')
        ? payload.expectedUpdatedAt
        : existingRecord.expectedUpdatedAt || existingRecord.updatedAt || '';
      const updatedRecord = {
        ...existingRecord,
        ...payload,
        id: existingRecord.id,
        createdAt: existingRecord.createdAt || Date.now(),
        expectedUpdatedAt,
        updatedAt: Date.now()
      };

      const syncedRecord = await syncRecordToGoogleSheet(updatedRecord);
      setRecords((previousRecords) => {
        const nextRecords = previousRecords.map((record) => (record.id === recordId ? syncedRecord : record));
        return nextRecords;
      });
      completeSave();
      continueRecordSyncInBackground(syncedRecord, { noticeKey, successText });
      return true;
    } catch (error) {
      console.error('Update record error:', error);
      return failSave(saveErrorMessage('Záznam nebyl uložen', error));
    } finally {
      pendingRecordMutationIdsRef.current.delete(mutationKey);
      setIsSaving(false);
    }
  };


  const deleteGoogleSheetRecord = async (record) => {
    if (!GOOGLE_SHEET_MACRO_URL || !record?.id || String(record.id).startsWith('local-')) return;
    let action = '';
    if (record.entityType === 'consultations') {
      action = record.ka === 'KA2' || record.payload?.caseManagementMode ? 'deleteMeeting' : 'deletePerformance';
    } else if (record.entityType === 'plans') {
      action = 'deleteIndividualPlan';
    } else if (record.entityType === 'actor_registry') {
      action = 'deletePartner';
    } else if (record.entityType === 'network_activities') {
      action = 'deleteNetworkMeeting';
    } else if (record.entityType === 'education_records') {
      action = 'deleteEducation';
    } else if (record.entityType === 'supervision_records') {
      action = 'deleteSupervision';
    }
    if (action) {
      await postGoogleSheetAction({
        action,
        id: record.id,
        expected_updated_at: record.expectedUpdatedAt || record.updatedAt || '',
        updated_by: currentWorker || ''
      });
      if (action === 'deletePerformance') void refreshStatisticsRows();
    }
  };

  const deleteRecord = async (record) => {
    if (!record?.id) return;
    const showDeleteNotice = (tone, text) => setRecordDeleteNotice({
      tone,
      text,
      recordId: record.id,
      entityType: record.entityType || '',
      clientId: record.clientId || ''
    });
    const writeBlockMessage = recordWriteBlockMessage(record);
    if (writeBlockMessage) {
      showDeleteNotice('error', writeBlockMessage);
      return;
    }
    const confirmed = window.confirm(`Opravdu smazat záznam "${record.title || 'bez názvu'}"?`);
    if (!confirmed) return;

    const mutationKey = `record:${record.id}`;
    if (pendingRecordMutationIdsRef.current.has(mutationKey)) {
      showDeleteNotice('progress', 'Tento záznam se právě mění. Vyčkejte na dokončení.');
      return;
    }
    pendingRecordMutationIdsRef.current.add(mutationKey);
    showDeleteNotice('progress', `Mažu záznam „${record.title || 'bez názvu'}“…`);
    setIsSaving(true);
    try {
      await deleteGoogleSheetRecord(record);
      setRecords((previousRecords) => previousRecords.filter((item) => item.id !== record.id));
      showDeleteNotice('success', `Záznam „${record.title || 'bez názvu'}“ byl smazán.`);
    } catch (error) {
      console.error('Delete record error:', error);
      showDeleteNotice('error', saveErrorMessage('Záznam nebyl smazán', error));
    } finally {
      pendingRecordMutationIdsRef.current.delete(mutationKey);
      setIsSaving(false);
    }
  };

  const handleClientCreate = async () => {
    clearSaveButtonNotice('client-create');
    if (!clientDraft.jmeno.trim() || !clientDraft.prijmeni.trim()) {
      const message = 'Vyplň alespoň jméno a příjmení klienta.';
      setSaveButtonNotice('client-create', 'error', message);
      setFlash(message);
      return;
    }

    setSaveButtonNotice('client-create', 'progress', 'Ověřuji adresu v RÚIAN…');
    let addressValidation;
    try {
      addressValidation = await validateClientAddress(clientDraft);
    } catch (error) {
      const message = saveErrorMessage('Adresu se nepodařilo ověřit', error);
      setSaveButtonNotice('client-create', 'error', message);
      setFlash(message);
      return;
    }
    if (!addressValidation.valid) {
      const message = `Klient nebyl uložen: ${addressValidation.reason}`;
      setSaveButtonNotice('client-create', 'error', message);
      setFlash(message);
      return;
    }

    const clientToSave = {
      ...clientDraft,
      ...addressValidation.normalizedAddress,
      keyWorker: clientDraft.keyWorker || currentWorker
    };

    let clientsForWrite = clients;
    if (!isClientRegistryAvailable) {
      setSaveButtonNotice('client-create', 'progress', 'Ověřuji aktuální klientský registr…');
      const refreshedClients = await refreshClientRegistryForWrite();
      if (!Array.isArray(refreshedClients)) {
        const message = 'Klientský registr se nyní nepodařilo ověřit. Uložení zůstalo bezpečně zablokované; při dalším kliknutí se ověření zopakuje.';
        setSaveButtonNotice('client-create', 'error', message);
        setFlash(message);
        return;
      }
      clientsForWrite = refreshedClients;
    }

    const duplicateClient = findDuplicateClient(clientToSave, '', clientsForWrite);
    if (duplicateClient) {
      setSelectedClientId(duplicateClient.id);
      const message = `Klient už v registru existuje: ${duplicateClient.fullName || 'bez jména'}.`;
      setSaveButtonNotice('client-create', 'error', message);
      setFlash(message);
      return;
    }

    const pendingSignature = buildClientDuplicateSignature(clientToSave);
    if (pendingClientSaveSignaturesRef.current.has(pendingSignature)) {
      const message = 'Tento klient se už ukládá. Vyčkej na dokončení ukládání.';
      setSaveButtonNotice('client-create', 'progress', message);
      setFlash(message);
      return;
    }

    pendingClientSaveSignaturesRef.current.add(pendingSignature);
    const mutationRequestId = clientCreateMutationIdsRef.current.get(pendingSignature)
      || createClientMutationRequestId('create-client');
    clientCreateMutationIdsRef.current.set(pendingSignature, mutationRequestId);
    setIsSaving(true);
    const applyRecoveredClientCreate = (savedClient) => {
      clientCreateMutationIdsRef.current.delete(pendingSignature);
      setClients((prev) => [savedClient, ...prev.filter((client) => client.id !== savedClient.id)]);
      setShowClientForm(false);
      setSelectedClientId(savedClient.id);
      setClientDraft({ ...emptyClientDraft, datumVstupu: todayIso(), keyWorker: isGarantWorker(currentWorker) ? '' : currentWorker });
      setSheetError('');
      setSaveButtonNotice('client-create', 'progress', 'Klient byl v registru dohledán jako uložený. Připravuji složku a monitorovací list…');
      setFlash('Klient byl uložen. Připravuji složku a monitorovací list…');
      clientDriveProvisionAttemptsRef.current.add(savedClient.id);
      void provisionClientDriveFolder(savedClient, { silent: true, registryVerified: true }).then((folderReady) => {
        const message = folderReady
          ? 'Klient uložen. Složka a monitorovací list jsou připravené.'
          : 'Klient byl uložen, ale složku a monitorovací list se nepodařilo připravit. Příprava se zopakuje při prvním uloženém výkonu.';
        setSaveButtonNotice('client-create', folderReady ? 'success' : 'error', message);
        setFlash(message);
      });
    };
    setSaveButtonNotice('client-create', 'progress', 'Ukládám klienta…');
    try {
      const result = await postGoogleSheetAction({
        action: 'saveClient',
        request_id: mutationRequestId,
        client: mapClientDraftToSheetClient(clientToSave)
      });
      if (!result?.client?.klient_id) throw new Error('Google Sheet nevr\u00e1til ID klienta.');
      const savedClient = mapSheetRowToClient(result.client, clientsForWrite.length);
      if (!savedClient) throw new Error('Ulo\u017een\u00e9ho klienta se nepoda\u0159ilo na\u010d\u00edst.');
      clientCreateMutationIdsRef.current.delete(pendingSignature);

      setClients((prev) => [savedClient, ...prev.filter((client) => client.id !== savedClient.id)]);
      setShowClientForm(false);
      setSelectedClientId(savedClient.id);
      setClientDraft({ ...emptyClientDraft, datumVstupu: todayIso(), keyWorker: isGarantWorker(currentWorker) ? '' : currentWorker });
      setSheetError('');
      setSaveButtonNotice('client-create', 'progress', 'Klient uložen. Připravuji složku a monitorovací list…');
      setFlash('Klient uložen. Připravuji složku a monitorovací list…');
      clientDriveProvisionAttemptsRef.current.add(savedClient.id);
      void provisionClientDriveFolder(savedClient, { silent: true, registryVerified: true }).then((folderReady) => {
        const message = folderReady
          ? 'Klient uložen. Složka a monitorovací list jsou připravené.'
          : 'Klient byl uložen, ale složku a monitorovací list se nepodařilo připravit. Příprava se zopakuje při prvním uloženém výkonu.';
        setSaveButtonNotice('client-create', folderReady ? 'success' : 'error', message);
        setFlash(message);
      });
    } catch (error) {
      console.error('Google Sheets client save error:', error);
      const normalizedSaveError = normalizeDuplicateText(error?.message || '');
      const saveMayAlreadyExist = error?.code === 'MUTATION_PENDING' || [
        'prekrocilo casovy limit',
        'trva prilis dlouho',
        'nevratil platnou json odpoved',
        'ulozeni nelze potvrdit',
        'uz v registru existuje'
      ].some((fragment) => normalizedSaveError.includes(fragment));
      if (saveMayAlreadyExist) {
        setSaveButtonNotice('client-create', 'progress', 'Ověřuji, zda už byl klient uložen…');
        const verificationDelays = [0, 1200];
        for (const delayMs of verificationDelays) {
          if (delayMs) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
          try {
            const refreshedRegistry = await fetchGoogleSheetAction(
              'listClients',
              1,
              GOOGLE_SHEET_REQUEST_TIMEOUT_MS,
              { verification_nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
            );
            const refreshedRows = Array.isArray(refreshedRegistry)
              ? refreshedRegistry
              : (Array.isArray(refreshedRegistry?.clients)
                ? refreshedRegistry.clients
                : (Array.isArray(refreshedRegistry?.data)
                  ? refreshedRegistry.data
                  : (Array.isArray(refreshedRegistry?.items) ? refreshedRegistry.items : null)));
            if (!Array.isArray(refreshedRows)) continue;
            const matchingClients = refreshedRows
              .map((row, index) => mapSheetRowToClient(row, index))
              .filter((candidate) => candidate?.id && isSameClientIdentity(clientToSave, candidate));
            if (matchingClients.length === 1) {
              applyRecoveredClientCreate(matchingClients[0]);
              return;
            }
          } catch (verificationError) {
            console.warn('Client create verification failed:', verificationError);
          }
        }
      }
      if (!saveMayAlreadyExist) clientCreateMutationIdsRef.current.delete(pendingSignature);
      const message = saveErrorMessage('Klient nebyl uložen', error);
      setSaveButtonNotice('client-create', 'error', message);
      setFlash(message);
    } finally {
      pendingClientSaveSignaturesRef.current.delete(pendingSignature);
      setIsSaving(false);
    }
  };

  const openClientEditForm = () => {
    if (!selectedClient) return;
    const mutationKey = `client:${selectedClient.id}`;
    if (pendingRecordMutationIdsRef.current.has(mutationKey)) {
      setSaveButtonNotice('client-update', 'progress', 'Tento klient se právě ukládá. Vyčkejte na dokončení.');
      return;
    }
    clearSaveButtonNotice('client-update');
    setClientEditDraft({
      ...emptyClientDraft,
      ...selectedClient
    });
    setShowClientEditForm(true);
  };

  const handleClientKeyWorkerQuickChange = async (client, nextKeyWorker) => {
    if (!client) return;
    const noticeKey = `client-worker:${client.id}`;
    if (showClientEditForm && selectedClientId === client.id) {
      setSaveButtonNotice(noticeKey, 'error', 'Změnu proveďte v otevřeném detailu klienta.');
      return;
    }
    if (!isClientRegistryAvailable && !registryVerified) {
      setSaveButtonNotice(noticeKey, 'error', 'Klientský registr není dostupný. Změna byla zablokována.');
      return;
    }
    const normalizedNextKeyWorker = String(nextKeyWorker || '').trim();
    if ((client.keyWorker || '') === normalizedNextKeyWorker) return;

    const mutationKey = `client:${client.id}`;
    if (pendingRecordMutationIdsRef.current.has(mutationKey)) {
      setSaveButtonNotice(noticeKey, 'progress', 'Tento klient se právě ukládá.');
      return;
    }
    pendingRecordMutationIdsRef.current.add(mutationKey);
    setSaveButtonNotice(noticeKey, 'progress', 'Ukládám pracovníka…');
    setIsSaving(true);
    try {
      const saveKeyWorker = async (baseClient) => {
        const quickPayload = {
          klient_id: client.id,
          klicovy_pracovnik: normalizedNextKeyWorker,
          expected_updated_at: baseClient.expectedUpdatedAt || baseClient.updatedAt || '',
          updated_by: currentWorker || ''
        };
        let result;
        try {
          result = await postGoogleSheetAction({
            action: 'updateClientKeyWorker',
            client: quickPayload
          });
        } catch (quickError) {
          // Kompatibilita pro krátké přechodné období mezi nasazením frontendu a Apps Scriptu.
          if (!/unknown action|nezn[aá]m[aá] akce/i.test(String(quickError?.message || ''))) throw quickError;
          result = await postGoogleSheetAction({
            action: 'saveClient',
            client: mapClientDraftToSheetClient({
              ...emptyClientDraft,
              ...baseClient,
              keyWorker: normalizedNextKeyWorker
            }, client.id)
          });
        }
        if (!result?.client?.klient_id) throw new Error('Google Sheet nevrátil ID klienta.');
        return mapSheetRowToClient(result.client, clients.findIndex((item) => item.id === client.id));
      };

      let savedClient;
      try {
        savedClient = await saveKeyWorker(client);
      } catch (error) {
        if (error?.code !== 'CONFLICT') throw error;
        setSaveButtonNotice(noticeKey, 'progress', 'Ověřuji aktuální údaje klienta…');
        const refreshedResult = await fetchGoogleSheetAction('listClients', 1);
        const refreshedClients = (refreshedResult?.clients || [])
          .map((row, index) => mapSheetRowToClient(row, index))
          .filter(Boolean);
        const refreshedClient = refreshedClients.find((item) => item.id === client.id);
        if (!refreshedClient) throw error;

        const originalWorker = String(client.keyWorker || '').trim();
        const refreshedWorker = String(refreshedClient.keyWorker || '').trim();
        if (refreshedWorker === normalizedNextKeyWorker) {
          savedClient = refreshedClient;
        } else if (refreshedWorker === originalWorker) {
          savedClient = await saveKeyWorker(refreshedClient);
        } else {
          throw error;
        }
      }
      if (!savedClient) throw new Error('Upraveného klienta se nepodařilo načíst.');

      setClients((prev) => prev.map((item) => (item.id === client.id ? savedClient : item)));
      if (selectedClientId === client.id) {
        setClientEditDraft((prev) => ({ ...prev, keyWorker: savedClient.keyWorker || '' }));
      }
      setSheetError('');
      setSaveButtonNotice(noticeKey, 'success', 'Pracovník uložen');
    } catch (error) {
      console.error('Google Sheets client key worker update error:', error);
      setSaveButtonNotice(noticeKey, 'error', saveErrorMessage('Pracovník nebyl uložen', error));
    } finally {
      pendingRecordMutationIdsRef.current.delete(mutationKey);
      setIsSaving(false);
    }
  };

  const handleClientUpdate = async () => {
    if (!isClientRegistryAvailable) {
      const message = 'Klientský registr není dostupný. Úprava klienta byla zablokována.';
      setSaveButtonNotice('client-update', 'error', message);
      setFlash(message);
      return;
    }
    if (!selectedClient) return;
    clearSaveButtonNotice('client-update');
    if (!clientEditDraft.jmeno.trim() || !clientEditDraft.prijmeni.trim()) {
      const message = 'Vyplň alespoň jméno a příjmení klienta.';
      setSaveButtonNotice('client-update', 'error', message);
      setFlash(message);
      return;
    }

    setSaveButtonNotice('client-update', 'progress', 'Ověřuji adresu v RÚIAN…');
    let addressValidation;
    try {
      addressValidation = await validateClientAddress(clientEditDraft);
    } catch (error) {
      const message = saveErrorMessage('Adresu se nepodařilo ověřit', error);
      setSaveButtonNotice('client-update', 'error', message);
      setFlash(message);
      return;
    }
    if (!addressValidation.valid) {
      const message = `Klient nebyl uložen: ${addressValidation.reason}`;
      setSaveButtonNotice('client-update', 'error', message);
      setFlash(message);
      return;
    }

    const normalizedClientEditDraft = {
      ...clientEditDraft,
      ...addressValidation.normalizedAddress
    };
    const targetClientId = clientEditDraft.id || selectedClient.id;
    const duplicateClient = findDuplicateClient(normalizedClientEditDraft, targetClientId);
    if (duplicateClient) {
      const message = `Klient s t\u011bmito \u00fadaji u\u017e v registru existuje: ${duplicateClient.fullName || 'bez jm\u00e9na'}.`;
      setSaveButtonNotice('client-update', 'error', message);
      setFlash(message);
      return;
    }

    const mutationKey = `client:${targetClientId}`;
    if (pendingRecordMutationIdsRef.current.has(mutationKey)) {
      const message = 'Tento klient se právě ukládá. Vyčkejte na dokončení.';
      setSaveButtonNotice('client-update', 'progress', message);
      setFlash(message);
      return;
    }
    pendingRecordMutationIdsRef.current.add(mutationKey);
    setIsSaving(true);
    setSaveButtonNotice('client-update', 'progress', 'Ukládám úpravy…');
    try {
      const result = await postGoogleSheetAction({
        action: 'saveClient',
        client: mapClientDraftToSheetClient(normalizedClientEditDraft, targetClientId)
      });
      if (!result?.client?.klient_id) throw new Error('Google Sheet nevr\u00e1til ID klienta.');
      const savedClient = mapSheetRowToClient(result.client, clients.findIndex((client) => client.id === targetClientId));
      if (!savedClient) throw new Error('Upraven\u00e9ho klienta se nepoda\u0159ilo na\u010d\u00edst.');

      setClients((prev) => prev.map((client) => (client.id === targetClientId ? savedClient : client)));
      setSelectedClientId(savedClient.id);
      setSheetError('');
      setSaveButtonNotice('client-update', 'progress', 'Klient uložen. Aktualizuji monitorovací list…');
      setFlash('Klient uložen. Aktualizuji monitorovací list…');
      void provisionClientDriveFolder(savedClient, { silent: true }).then((monitoringUpdated) => {
        const message = monitoringUpdated
          ? 'Klient uložen. Monitorovací list byl aktualizován.'
          : 'Klient byl uložen, ale monitorovací list se nepodařilo aktualizovat.';
        setSaveButtonNotice('client-update', monitoringUpdated ? 'success' : 'error', message);
        setFlash(message);
      });
    } catch (error) {
      console.error('Google Sheets client update error:', error);
      const message = saveErrorMessage('Klient nebyl uložen', error);
      setSaveButtonNotice('client-update', 'error', message);
      setFlash(message);
    } finally {
      pendingRecordMutationIdsRef.current.delete(mutationKey);
      setIsSaving(false);
    }
  };

  const handleClientDelete = async (client, event) => {
    event?.stopPropagation?.();
    const noticeKey = `client-delete:${client?.id || ''}`;
    if (!client?.id) return;
    if (!isGarantWorker(currentWorker)) {
      setSaveButtonNotice(noticeKey, 'error', 'Celého klienta může smazat pouze Mgr. Radka Vysloužilová.');
      return;
    }
    if (!isClientRegistryAvailable) {
      setSaveButtonNotice(noticeKey, 'progress', 'Ověřuji aktuální klientský registr…');
      const refreshedClients = await refreshClientRegistryForWrite();
      const refreshedClient = refreshedClients?.find((item) => item.id === client.id);
      if (!refreshedClient) {
        setSaveButtonNotice(noticeKey, 'error', Array.isArray(refreshedClients)
          ? 'Klient už není v aktuálním aktivním registru. Smazání nebylo odesláno.'
          : 'Klientský registr se nyní nepodařilo ověřit. Smazání zůstalo bezpečně zablokované; při dalším kliknutí se ověření zopakuje.');
        return;
      }
      client = refreshedClient;
    }

    const confirmed = window.confirm(
      `Opravdu smazat celého klienta „${client.fullName}“?\n\n` +
      'Z aplikace budou vyřazeny také jeho výkony, case management a individuální plány. Dokumenty se zachovají v archivu.'
    );
    if (!confirmed) return;
    const typedId = window.prompt(`Pro potvrzení napište ID klienta: ${client.id}`, '');
    if (String(typedId || '').trim() !== client.id) {
      setSaveButtonNotice(noticeKey, 'error', 'Smazání zrušeno: ID klienta nebylo zadáno přesně.');
      return;
    }

    const mutationKey = `client:${client.id}`;
    if (pendingRecordMutationIdsRef.current.has(mutationKey)) {
      setSaveButtonNotice(noticeKey, 'progress', 'Tento klient se právě mění. Vyčkejte na dokončení.');
      return;
    }
    pendingRecordMutationIdsRef.current.add(mutationKey);
    setIsSaving(true);
    setSaveButtonNotice(noticeKey, 'progress', 'Mažu klienta a navázané záznamy…');
    setSaveButtonNotice('client-delete', 'progress', `Mažu klienta ${client.fullName}…`);
    let mutationRequestId = '';
    const applyConfirmedDeletion = (deletion, verifiedAfterResponseFailure = false) => {
      clientDeleteMutationIdsRef.current.delete(client.id);
      setClients((previous) => previous.filter((item) => item.id !== client.id));
      setRecords((previous) => previous.filter((record) => (
        record.clientId !== client.id && !(Array.isArray(record.clientIds) && record.clientIds.includes(client.id))
      )));
      if (selectedClientId === client.id) {
        setSelectedClientId('');
        setShowClientEditForm(false);
        setClientEditDraft(emptyClientDraft);
      }
      const summary = verifiedAfterResponseFailure
        ? 'Klient a jeho navázané záznamy byly úspěšně smazány. Výsledek potvrdila následná kontrola v Google Sheetu.'
        : `Klient smazán. Vyřazeno: ${deletion.performances || 0} výkonů, ${deletion.meetings || 0} záznamů case managementu a ${deletion.individual_plans || 0} individuálních plánů.`;
      setSaveButtonNotice('client-delete', deletion.archive_warning ? 'error' : 'success', deletion.archive_warning || summary);
      setFlash(deletion.archive_warning ? `${summary} ${deletion.archive_warning}` : summary);
    };
    try {
      // Mazani je povoleno jen proti aktualnimu Apps Scriptu, ktery umi
      // necachovanou kontrolu radku. Stare nasazeni se tak zastavi jeste pred
      // jakymkoli zapisem a nemuze znovu vytvorit castecne smazany stav.
      const preflight = await fetchGoogleSheetAction(
        'verifyClientDeletion',
        1,
        GOOGLE_SHEET_REQUEST_TIMEOUT_MS,
        { klient_id: client.id }
      );
      const currentDeletionState = preflight?.deletion;
      if (!currentDeletionState?.found || currentDeletionState?.duplicate) {
        throw new Error('Klienta nelze jednoznačně ověřit přímo v Google Sheetu. Mazání bylo zablokováno.');
      }
      if (currentDeletionState.deleted) {
        applyConfirmedDeletion({ deleted: true, archive_warning: '' }, true);
        return;
      }
      if (currentDeletionState.inactive) {
        throw new Error('Klient je v neúplném stavu po předchozím mazání. Nejprve jej obnovte a načtěte znovu.');
      }
      mutationRequestId = clientDeleteMutationIdsRef.current.get(client.id)
        || createClientMutationRequestId('delete-client');
      clientDeleteMutationIdsRef.current.set(client.id, mutationRequestId);
      const result = await postGoogleSheetAction({
        action: 'deleteClient',
        request_id: mutationRequestId,
        client: {
          klient_id: client.id,
          expected_updated_at: client.expectedUpdatedAt || client.updatedAt || ''
        },
        requested_by_name: currentWorker
      });
      if (!result?.deletion?.deleted) throw new Error('Google Sheet nepotvrdil smazání klienta.');
      applyConfirmedDeletion(result.deletion, result.verified_after_response_failure === true);
    } catch (error) {
      console.error('Google Sheets client delete error:', error);
      const ambiguousResponse = error?.code === 'MUTATION_PENDING'
        || /platnou JSON odpověď|uložení nelze potvrdit|časový limit|trvá příliš dlouho/i.test(String(error?.message || ''));
      if (ambiguousResponse) {
        // Odpoved ContentService muze selhat i tesne pred dorucenim platneho JSON.
        // Overeni proto kratce opakujeme; okamzita jednorazova kontrola mohla
        // predbehnout dokonceni zapisu v Apps Scriptu.
        const verificationDelays = [0, 800, 1800, 3200];
        let deletionVerificationUnavailable = false;
        for (const delayMs of verificationDelays) {
          if (delayMs) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
          try {
            const verification = await fetchGoogleSheetAction(
              'verifyClientDeletion',
              1,
              GOOGLE_SHEET_REQUEST_TIMEOUT_MS,
              { klient_id: client.id }
            );
            const deletionConfirmed = verification?.deletion?.found === true && verification?.deletion?.deleted === true;
            if (deletionConfirmed) {
              applyConfirmedDeletion({ deleted: true, archive_warning: '' }, true);
              return;
            }
          } catch (verificationError) {
            console.warn('Client deletion verification failed:', verificationError);
            if (verificationError?.httpStatus === 404) {
              deletionVerificationUnavailable = true;
              break;
            }
          }
        }

        // Nektera nasazeni Apps Scriptu mohou po uspesnem zapisu docasne vratit
        // 404 pro specialni kontrolni akci. Pred zapisem jsme klienta jednoznacne
        // overili, proto je jeho absence v cerstvem uplnem registru spolehlivym
        // potvrzenim, ze mazani probehlo. Nonce obchazi cteci cache Render proxy.
        try {
          const refreshedRegistry = await fetchGoogleSheetAction(
            'listClients',
            deletionVerificationUnavailable ? 2 : 1,
            GOOGLE_SHEET_REQUEST_TIMEOUT_MS,
            { verification_nonce: `${Date.now()}-${client.id}` }
          );
          const refreshedRows = Array.isArray(refreshedRegistry)
            ? refreshedRegistry
            : (Array.isArray(refreshedRegistry?.clients)
              ? refreshedRegistry.clients
              : (Array.isArray(refreshedRegistry?.data)
                ? refreshedRegistry.data
                : (Array.isArray(refreshedRegistry?.items) ? refreshedRegistry.items : null)));
          const registryIsComplete = Array.isArray(refreshedRows);
          const clientStillActive = registryIsComplete && refreshedRows.some((row) => (
            String(row?.klient_id || row?.id || '').trim() === client.id
          ));
          if (registryIsComplete && !clientStillActive) {
            applyConfirmedDeletion({ deleted: true, archive_warning: '' }, true);
            return;
          }
        } catch (registryVerificationError) {
          console.warn('Client deletion registry verification failed:', registryVerificationError);
        }
      }
      if (!ambiguousResponse) clientDeleteMutationIdsRef.current.delete(client.id);
      const message = saveErrorMessage('Klient nebyl smazán', error);
      setSaveButtonNotice(noticeKey, 'error', message);
      setSaveButtonNotice('client-delete', 'error', message);
      setFlash(message);
    } finally {
      pendingRecordMutationIdsRef.current.delete(mutationKey);
      setIsSaving(false);
    }
  };

  const handleGenerateText = async () => {
    if (!generatorClient) {
      setFlash('Vyber klienta, pro kterého chceš výstup připravit.');
      return;
    }
    if (isPhysicalSignedFiledOutreach(generatorDraft)) {
      const physicalText = buildPhysicalSignedFiledOutreachText(generatorDraft.supportSpecific?.physicalRecordComment);
      setGeneratedText(physicalText);
      setLastGeneratedText(physicalText);
      setGeneratorDraft((prev) => ({ ...prev, topics: '', outcome: '', nextSteps: '', generatedText: physicalText }));
      setGenerationNotice('Zápis je fyzicky podepsán a založen. Elektronický text obsahuje potvrzení o fyzickém uložení a případný doplňující komentář.');
      setFlash('Zápis pro fyzicky založenou depistáž byl připraven.');
      setAiGenerationStatus('success');
      return;
    }

    setIsGenerating(true);
    setAiGenerationStatus('loading');
    setGeneratedText('');
    const aiModel = DEFAULT_AI_MODEL;
    const sensitiveTerms = buildSensitiveTerms(generatorClient, [
      ...(generatorDraft.registeredPartnerNames || []),
      ...(generatorDraft.manualPartnerNames || []),
      ...(generatorDraft.partnerNames || [])
    ]);
    setGenerationNotice(`Generuji text přes ${aiModel}...`);
    const maxOutputTokens = generatorDraft.selectedKey === 'therapy' ? 8192 : 4096;

    const previousRecordContext = redactClientIdentifiers(buildPreviousRecordsContext(previousGeneratorRecords), generatorClient);
    const styleMemoryContext = redactClientIdentifiers(buildStyleMemoryContext(records, {
      selectedKey: generatorDraft.selectedKey,
      worker: generatorDraft.worker,
      maxItems: 3
    }), generatorClient);
    const isPersonalDevelopmentPlan = generatorDraft.selectedKey === 'plan';
    const effectiveGeneratorKa = getEffectiveGeneratorKa(generatorConfig, generatorDraft);
    const kaActivityContext = effectiveGeneratorKa === 'KA2' || effectiveGeneratorKa === 'KA02'
      ? KA02_ACTIVITY_AI_CONTEXT
      : '';
    const kaContextInstruction = kaActivityContext
      ? `Metodický kontext ${generatorConfig.ka} pro pochopení podpory:\n${kaActivityContext}\n\nTento kontext použij k věcnému zaměření výstupu, ale neopisuj jej mechanicky do zápisu.`
      : '';
    const outputModeInstruction = isPersonalDevelopmentPlan
      ? 'Lehká výjimka: u Plánu osobního rozvoje může být výstup plánovým projektovým dokumentem s cíli, bariérami a navazujícími kroky podpory. I zde ale vycházej pouze ze zadaných údajů a z role zvoleného pracovníka.'
      : `Zásadní pravidlo: výstup musí být vždy zápis o poskytnuté projektové podpoře v ${effectiveGeneratorKa || 'příslušné KA'}, ne hotový dokument pro klienta k přímému použití. Zohledni zaměření zvolené podpory "${generatorConfig.label}" a roli zvoleného pracovníka "${generatorDraft.worker || 'Neuvedeno'}".`;
    const exactGeneratorFacts = buildExactGeneratorFacts(generatorConfig, generatorDraft);
    const promptParts = [
      {
        text: exactGeneratorFacts
      },
      {
        text: buildSafeGeneratorUserPrompt(generatorConfig, generatorClient, generatorDraft)
      },
      {
        text: 'Zásadní pravidlo pro práci s fakty: výsledný zápis smí obsahovat pouze skutečnosti uvedené v části AKTUÁLNÍ AKTIVITA a v aktuálních poznámkách pracovníka. Kontext z předchozích záznamů a stylovou paměť použij jen pro návaznost, tón a strukturu. Nepřebírej z nich konkrétní úkony, služby, instituce, výsledky, dohody, termíny ani navazující kroky, pokud nejsou výslovně uvedeny v aktuální aktivitě. Pokud Popis, Výsledek nebo Navazující krok nejsou vyplněné, nesmíš si je domyslet.'
      },
      {
        text: outputModeInstruction
      },
      ...(kaContextInstruction ?[{ text: kaContextInstruction }] : []),
      {
        text: 'Vstup je před odesláním anonymizovaný. Nikdy nepožaduj, nedoplňuj ani nevypisuj jméno, datum narození, kontakt, adresu nebo jiný identifikátor klienta či zapojených osob. Registrační charakteristiky použij jen tehdy, jsou-li nezbytné pro význam konkrétní podpory; jinak je zcela vynech.'
      },
      {
        text: 'Při zpracování vstupu oprav překlepy, pravopis a drobné jazykové chyby do spisovné češtiny, ale neměň význam, nedoplňuj fakta a nic si nevymýšlej.'
      }
    ];
    if (generatorDraft.bulletNotes.trim()) {
      promptParts.push({
        text: `Poznámky pracovníka v bodech nebo heslech:\n${redactClientIdentifiers(generatorDraft.bulletNotes.trim(), generatorClient)}\n\nZ těchto bodů vytvoř souvislý, čistý a věcný zápis.`
      });
    }
    if (previousRecordContext) {
      promptParts.push({
        text: previousRecordContext
      });
    }
    if (styleMemoryContext) {
      promptParts.push({
        text: styleMemoryContext
      });
    }
    const payload = {
      contents: [
        {
          role: 'user',
          parts: promptParts /*
            {
              text: generatorConfig.buildUserPrompt({
                client: generatorClient,
                fields: generatorDraft
              })
            },
            {
              text: 'Při zpracování vstupu oprav překlepy, pravopis a drobné jazykové chyby do spisovné češtiny, ale neměň význam, nedoplňuj fakta a nic si nevymýšlej.'
            }
          */,
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: `Závazná data z formuláře: KA je "${effectiveGeneratorKa}", datum aktivity je "${generatorDraft.date || todayIso()}" a délka podpory je "${formatSupportDuration(getGeneratorSupportMinutes(generatorDraft))}". Tyto hodnoty ve výstupu použij přesně, neměň je a nedoplňuj jiné datum ani jiný rozsah podpory.`
          },
          {
            text: `${generatorConfig.buildSystemPrompt({ fields: sanitizeAiInput(generatorDraft) })}${kaContextInstruction ?`\n\n${kaContextInstruction}` : ''}\n\nNadřazené pravidlo pro typ výstupu: ${
              isPersonalDevelopmentPlan
                ? 'u Plánu osobního rozvoje vytváříš plánový projektový dokument; nejde o běžný zápis z konzultace, ale pořád musí odpovídat zadaným údajům, zaměření podpory a zvolenému pracovníkovi.'
                : 'vytváříš zápis o poskytnuté podpoře a pracovní aktivitě v projektu. Nevytvářej finální externí dokument pro klienta, pokud by to odporovalo zápisu do klientské složky.'
            } Text musí odpovídat zaměření podpory "${generatorConfig.label}" a zvolenému pracovníkovi "${generatorDraft.worker || 'Neuvedeno'}".\n\nNikdy nevytvářej identifikační část klienta a nevypisuj jméno, datum narození, kontakt, adresu ani jiné identifikátory. Vstup považuj za anonymizovaný pracovní podklad.\n\nFormát výstupu: používej pouze čistý prostý text bez Markdownu. Nepoužívej hvězdičky, tučné zvýraznění, markdown nadpisy, odrážky s pomlčkou ani kódové bloky. Nadpisy piš jako běžné řádky bez speciálních znaků.`
          }
        ]
      },
      generationConfig: {
        temperature: 0.18,
        topP: 0.9,
        maxOutputTokens: generatorDraft.selectedKey === 'consultation' ? 1200 : Math.min(maxOutputTokens, 2500),
        ...(generatorDraft.selectedKey === 'consultation' ? {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              recordText: { type: 'STRING' },
              warnings: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['recordText']
          }
        } : {})
      }
    };

    try {
      const response = await fetchGemini(aiModel, payload, sensitiveTerms);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || `AI požadavek selhal se stavem ${response.status}.`);
      }
      let finalResult = result;
      let finishReason = finalResult?.candidates?.[0]?.finishReason || '';
      let usedRetry = false;
      if (finishReason === 'MAX_TOKENS') {
        const retryPayload = {
          ...payload,
          systemInstruction: {
            parts: [
              ...(payload.systemInstruction?.parts || []),
              {
                text: 'Predchozi vystup byl useknuty limitem tokenu. Vrat cely kompletni vystup v jednom celku, bez opakovani, bez markdownu, vecne a strukturovane.'
              }
            ]
          },
          generationConfig: {
            ...payload.generationConfig,
            temperature: 0.25,
            maxOutputTokens: Math.max(maxOutputTokens, 8192)
          }
        };
        const retryResponse = await fetchGemini(aiModel, retryPayload, sensitiveTerms);
        const retryResult = await retryResponse.json();
        if (!retryResponse.ok) {
          throw new Error(retryResult?.error?.message || `AI opakovany pozadavek selhal se stavem ${retryResponse.status}.`);
        }
        finalResult = retryResult;
        finishReason = finalResult?.candidates?.[0]?.finishReason || '';
        usedRetry = true;
      }
      let cleanText;
      let outputCheck;
      if (generatorDraft.selectedKey === 'consultation') {
        const rawOutput = extractGeminiText(finalResult);
        let parsedOutput;
        try {
          parsedOutput = parseAiJson(rawOutput);
        } catch (parseError) {
          const repairPayload = {
            ...payload,
            contents: [{ role: 'user', parts: [{ text: `Oprav následující odpověď na validní JSON podle zadaného schématu. Nic věcně nepřidávej:
${rawOutput}` }] }],
            generationConfig: { ...payload.generationConfig, temperature: 0 }
          };
          const repairResponse = await fetchGemini(aiModel, repairPayload, sensitiveTerms);
          const repairResult = await repairResponse.json();
          if (!repairResponse.ok) throw new Error(repairResult?.error?.message || 'Oprava JSON výstupu selhala.');
          parsedOutput = parseAiJson(extractGeminiText(repairResult));
        }
        const validated = validateRecordOutput(parsedOutput, { consultationType: generatorDraft.consultationType, client: generatorClient });
        cleanText = cleanGeneratedText(validated.recordText);
        outputCheck = { isSuspicious: false, reasons: [] };
      } else {
        cleanText = cleanGeneratedText(extractGeminiText(finalResult));
        outputCheck = inspectAiOutputCompleteness(cleanText, { finishReason });
      }
      let continuationCount = 0;

      while (outputCheck.isSuspicious && continuationCount < 3) {
        const continuationPayload = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Původní zadání dokumentu:\n${exactGeneratorFacts}\n\n${buildSafeGeneratorUserPrompt(generatorConfig, generatorClient, generatorDraft)}`
                },
                {
                  text: `Dosavadní text je pravděpodobně nedokončený. Navazuj přesně tam, kde skončil, neopakuj předchozí věty a vrať pouze pokračování textu.\n\nDosavadní text:\n${cleanText}`
                }
              ]
            }
          ],
          systemInstruction: {
            parts: [
              {
                text: `${generatorConfig.buildSystemPrompt({ fields: sanitizeAiInput(generatorDraft) })}\n\nVrať pouze pokračování již rozepsaného dokumentu. Neopakuj začátek, nepřidávej omluvu ani technické vysvětlení. Zachovej prostý text bez Markdownu a dokonči rozpracovanou myšlenku přirozeně česky.`
              }
            ]
          },
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: generatorDraft.selectedKey === 'therapy' ? 4096 : 2048
          }
        };

        const continuationResponse = await fetchGemini(aiModel, continuationPayload, sensitiveTerms);
        const continuationResult = await continuationResponse.json();
        if (!continuationResponse.ok) {
          throw new Error(continuationResult?.error?.message || `Doplnění pokračování selhalo se stavem ${continuationResponse.status}.`);
        }

        const continuationText = cleanGeneratedText(extractGeminiText(continuationResult));
        if (!continuationText) break;
        cleanText = cleanGeneratedText(`${cleanText}\n\n${continuationText}`);
        finishReason = continuationResult?.candidates?.[0]?.finishReason || '';
        outputCheck = inspectAiOutputCompleteness(cleanText, { finishReason });
        continuationCount += 1;
      }

      setGeneratedText(cleanText);
      setLastGeneratedText(cleanText);
      setGeneratorDraft((prev) => ({ ...prev, generatedText: cleanText }));
      setGenerationNotice(`AI text byl vygenerován (${cleanText.length} znaků). Výsledek je v poli "Výstup dokumentu" níže.`);
      setFlash(`AI text byl vygenerován (${cleanText.length} znaků).`);
      setAiGenerationStatus('success');
    } catch (error) {
      console.error('Generate error:', error);
      const fallback = buildFallbackGeneratedText(generatorConfig.label, generatorClient, generatorDraft);
      setGeneratedText(fallback);
      setLastGeneratedText(fallback);
      setGeneratorDraft((prev) => ({ ...prev, generatedText: fallback }));
      setGenerationNotice(`${error.message || 'Generování selhalo.'} Zobrazuji pracovní návrh z formuláře.`);
      setFlash(error.message || 'Generování selhalo. Používám pracovní text vytvořený z vyplněných polí.');
      setAiGenerationStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const getGeneratedOutputMissingFields = () => {
    const missing = [];
    if (!generatorClient) missing.push('klient');
    if (!String(generatorDraft.date || '').trim()) missing.push('datum aktivity');
    if (!String(generatorDraft.worker || '').trim()) missing.push('pracovník');
    if (generatorDraft.selectedKey !== 'plan' && !String(generatorDraft.linkedPlanGoalId || '').trim()) missing.push('cíl IP');
    if (generatorDraft.selectedKey === 'plan' && (!Number.isFinite(Number(generatorDraft.planDurationMinutes)) || Number(generatorDraft.planDurationMinutes) <= 0)) {
      missing.push('kladný čas podpory v minutách');
    }
    if (generatorDraft.selectedKey === 'consultation') {
      if (!String(generatorDraft.ka02StartTime || '').trim()) missing.push('čas OD');
      if (!String(generatorDraft.ka02EndTime || '').trim()) missing.push('čas DO');
      const startMinutes = timeToMinutesForSupport(generatorDraft.ka02StartTime);
      const endMinutes = timeToMinutesForSupport(generatorDraft.ka02EndTime);
      if (generatorDraft.ka02StartTime && generatorDraft.ka02EndTime && startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) missing.push('platný čas OD–DO');
      if (!String(generatorDraft.consultationType || '').trim()) missing.push('typ podpory');
      if (!String(generatorDraft.supportArea || '').trim()) missing.push('oblast podpory');
      if (!generatorDraft.caseManagementMode && !String(generatorDraft.ka02Place || '').trim()) missing.push('forma poskytování');
    }
    if (!String(generatedText || '').trim()) missing.push('výstup dokumentu');
    return [...new Set(missing)];
  };

  const resetGeneratedDocumentFormAfterSave = () => {
    const nextClientId = selectedClientId || generatorDraft.clientId || accessibleClients[0]?.id || '';
    const nextWorker = currentWorker || generatorDraft.worker || WORKERS[0];
    const nextSelectedKey = generatorDraft.selectedKey || emptyGeneratorDraft.selectedKey;
    const keepCaseManagementMode = Boolean(generatorDraft.caseManagementMode);

    setGeneratedText('');
    setLastGeneratedText('');
    setGeneratorDraft({
      ...emptyGeneratorDraft,
      selectedKey: nextSelectedKey,
      clientId: nextClientId,
      worker: nextWorker,
      date: todayIso(),
      caseManagementMode: keepCaseManagementMode,
      ka02Place: keepCaseManagementMode ? 'ambulantní' : ''
    });
    setGenerationNotice('');
    setAiGenerationStatus('idle');
    setCopied(false);
  };

  const handleSaveGeneratedOutput = async () => {
    const missingFields = getGeneratedOutputMissingFields();
    if (missingFields.length) {
      const message = 'Dokument nelze uložit. Doplňte: ' + missingFields.join(', ') + '.';
      setSaveNotice({ tone: 'error', text: message });
      setFlash(message);
      return false;
    }
    if (!generatorClient) {
      const message = 'Vyber klienta.';
      setSaveNotice({ tone: 'error', text: message });
      setFlash(message);
      return;
    }
    const isOneTimeOrder = generatorDraft.linkedPlanGoalId === 'one-time-order';
    if (
      generatorDraft.selectedKey !== 'plan' &&
      (!generatorDraft.linkedPlanGoalId || (!isOneTimeOrder && !generatorPlanGoalOptions.some((goal) => goal.value === generatorDraft.linkedPlanGoalId)))
    ) {
      const message = generatorPlanGoalOptions.length
        ? 'Vyber cíl z plánu osobního rozvoje.'
        : 'Nejdřív doplň cíl v plánu osobního rozvoje klienta.';
      setSaveNotice({ tone: 'error', text: message });
      setFlash(message);
      return;
    }
    if (!generatedText.trim()) {
      const message = 'Nejprve vygeneruj nebo doplň text výstupu.';
      setSaveNotice({ tone: 'error', text: message });
      setFlash(message);
      return;
    }

    const isPerformanceSave = generatorDraft.selectedKey === 'consultation';
    const savedClientReference = `${generatorClient.fullName || generatorClient.id || 'vybraný klient'}${generatorClient.id ? ` (${generatorClient.id})` : ''}`;
    const savedPerformanceConfirmation = `Výkon byl uložen klientovi ${savedClientReference}.`;
    setSaveNotice({
      tone: 'progress',
      text: isPerformanceSave ? `Ukládám výkon klientovi ${savedClientReference}…` : 'Dokument se ukládá…'
    });

    if (generatedOutputSaveLockRef.current) {
      setSaveNotice({ tone: 'progress', text: 'Výkon se již ukládá…' });
      setFlash('Výkon se již ukládá. Vyčkejte na dokončení.');
      return false;
    }
    generatedOutputSaveLockRef.current = true;

    try {
      const payload = buildGeneratorRecord({
        client: generatorClient,
        generatorDraft,
        generatedText
      });

    let ok = false;
    if (editingGeneratedRecordId) {
      ok = await updateExistingRecord(editingGeneratedRecordId, payload);
    } else {
      ok = await saveRecord(payload);
    }
    if (!ok) {
      setSaveNotice({ tone: 'error', text: 'Uložení dokumentu selhalo. Zkontrolujte připojení a zkuste to znovu.' });
      return false;
    }

    if (editingGeneratedRecordId) {
      setEditingGeneratedRecordId('');
      resetGeneratedDocumentFormAfterSave();
      const editConfirmation = isPerformanceSave
        ? `Výkon byl upraven u klienta ${savedClientReference}.`
        : 'Záznam byl upraven.';
      setFlash(`${editConfirmation} Formulář byl vymazán.`);
      setSaveNotice({ tone: 'success', text: isPerformanceSave ? editConfirmation : 'Uloženo' });
      return true;
    }

    const generatorPromptSnapshot = buildSafeGeneratorUserPrompt(generatorConfig, generatorClient, generatorDraft);
    const styleMemoryRecord = buildAiStyleMemoryRecord({
      client: generatorClient,
      generatorDraft,
      generatedText,
      promptText: [generatorPromptSnapshot, generatorDraft.bulletNotes || ''].filter(Boolean).join('\n\n'),
      config: generatorConfig
    });
    const memoryOk = await saveRecord(styleMemoryRecord);
    resetGeneratedDocumentFormAfterSave();
    if (memoryOk) {
      setFlash(
        isPerformanceSave
          ? `${savedPerformanceConfirmation} Formulář byl vymazán.`
          : 'Strukturovaný záznam, dokument i anonymizovaná AI stylová paměť byly uloženy. Formulář byl vymazán.'
      );
      setSaveNotice({ tone: 'success', text: isPerformanceSave ? savedPerformanceConfirmation : 'Uloženo' });
      return true;
    }
    setFlash(
      isPerformanceSave
        ? `${savedPerformanceConfirmation} Pomocná AI stylová paměť se neuložila. Formulář byl vymazán.`
        : 'Záznam a dokument byly uloženy, ale AI stylová paměť se neuložila. Formulář byl vymazán.'
    );
    setSaveNotice({
      tone: 'warning',
      text: isPerformanceSave
        ? `${savedPerformanceConfirmation} Pomocná AI stylová paměť se neuložila.`
        : 'Dokument byl uložen, ale nepodařilo se uložit pomocnou AI stylovou paměť. Formulář byl vymazán.'
    });
    return true;
    } finally {
      generatedOutputSaveLockRef.current = false;
    }
  };

  const handleExportPlanTemplateDocx = async () => {
    if (!generatorClient) {
      setFlash('Vyber klienta pro export plánu.');
      return;
    }
    if (generatorDraft.selectedKey !== 'plan') {
      setFlash('DOCX šablona je zatím připravena jen pro individuální plán rozvoje.');
      return;
    }
    if (!generatedText.trim()) {
      setFlash('Nejprve vygeneruj text plánu.');
      return;
    }

    try {
      const response = await fetch('/api/export-plan-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPlanTemplatePayload(generatorClient, generatorDraft, generatedText))
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        throw new Error(errorResult.error || 'Export DOCX selhal.');
      }

      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `plan-osobniho-rozvoje-${slugify(generatorClient.fullName)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      setFlash('Plán byl exportován do DOCX podle tabulkové šablony.');
    } catch (error) {
      console.error('Plan DOCX export error:', error);
      setFlash(error.message || 'Export plánu do DOCX selhal.');
    }
  };

  const renderAiDocumentPanel = ({ allowedKeys, title, description, hideStyleFeedback = false, panelClassName = '', lockClientSelection = false, watermarkText = '' }) => (
    <AiDocumentPanel
      allowedKeys={allowedKeys}
      title={title}
      description={description}
      reportPrompts={REPORT_PROMPTS}
      generatorDraft={generatorDraft}
      setGeneratorDraft={setGeneratorDraft}
      clients={accessibleClients}
      workers={WORKERS}
      lockClientSelection={lockClientSelection}
      lockedClientId={generatorDraft.clientId}
      lockedClientName={clientIndex[generatorDraft.clientId]?.fullName || ''}
      watermarkText={watermarkText}
      generatedText={generatedText}
      setGeneratedText={setGeneratedText}
      lastGeneratedText={lastGeneratedText}
      generationNotice={generationNotice}
      aiGenerationStatus={aiGenerationStatus}
      isGenerating={isGenerating}
      isSaving={isSaving}
      saveNotice={saveNotice}
      saveMissingFields={getGeneratedOutputMissingFields()}
      onClearSaveNotice={() => setSaveNotice(null)}
      onGenerate={handleGenerateText}
      onSave={handleSaveGeneratedOutput}
      onExportPlan={handleExportPlanTemplateDocx}
      planGoalOptions={generatorPlanGoalOptions}
      partners={records.filter((record) => record.entityType === 'actor_registry')}
      hideStyleFeedback={hideStyleFeedback}
      panelClassName={panelClassName}
    />
  );
  const handleSaveKa01Assessment = async () => {
    const client = clientIndex[ka01Draft.assessmentClientId];
    if (!client) {
      setFlash('Vyber klienta pro posouzení vstupu.');
      return;
    }

    const ok = await saveRecord({
      entityType: 'eligibility_assessments',
      ka: 'KA01',
      title: `Posouzení vstupu - ${client.fullName}`,
      activityDate: ka01Draft.date,
      worker: ka01Draft.worker,
      clientId: client.id,
      clientIds: [client.id],
      clientName: client.fullName,
      payload: {
        formalCriteriaMet: ka01Draft.formalCriteriaMet,
        contentCriteriaCount: Number(ka01Draft.contentCriteriaCount || 0),
        motivationLevel: ka01Draft.motivationLevel,
        decision: ka01Draft.decision,
        waitingList: ka01Draft.waitingList,
        rationale: ka01Draft.rationale
      }
    });

    if (ok) {
      setFlash('Vstupní posouzení bylo uloženo.');
      setKa01Draft((prev) => ({ ...prev, rationale: '' }));
    }
  };

  const polishKa01NetworkDraft = async ({ force = false } = {}) => {
    if (!force && ka01Draft.networkDescription.trim()) {
      return ka01Draft;
    }

    const aiModel = DEFAULT_AI_MODEL;

    const currentParticipantNames = (ka01Draft.networkActorEntries || [])
      .map((entry) => getKa01ActorDisplayName(entry))
      .filter(Boolean);
    const participantSensitiveTerms = currentParticipantNames.flatMap((value) =>
      [value, ...String(value).split(/\s+[—-]\s+/)].map((item) => item.trim()).filter(Boolean)
    );
    const currentParticipantCount = currentParticipantNames.length || Number(ka01Draft.networkCount || 0);
    try {
      const response = await fetchGemini(aiModel, {
          systemInstruction: { parts: [{ text: KA2_NETWORK_SYSTEM_PROMPT }] },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: [
                    'Vytvo\u0159 souvisl\u00fd projektov\u00fd z\u00e1pis aktivity KA02-Tvorba s\u00edt\u011b.',
                    KA01_ACTIVITY_AI_CONTEXT,
                    'Piš česky, věcně a auditně obhajitelně. Rozsah přizpůsob typu a obsahu aktivity. Nevymýšlej osoby, rozhodnutí, úkoly, odpovědnosti ani termíny. Vrať pouze JSON se všemi poli description, outcome a nextSteps.',
                    getKa01PhaseGuidance(),
                    getKa01ActivityTypeGuidance(ka01Draft.networkType),
                    '',
                    'Dostupn\u00e1 data:',
                    'Typ aktivity: ' + (ka01Draft.networkType || ''),
                    'Po\u010det \u00fa\u010dastn\u00edk\u016f: ' + currentParticipantCount,
                    'M\u00edsto: ' + (ka01Draft.networkPlace || ''),
                    'Popis: ' + (ka01Draft.networkNotes || '')
                  ].join('\n')
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              required: ['description', 'outcome', 'nextSteps'],
              properties: {
                description: { type: 'STRING' },
                outcome: { type: 'STRING' },
                nextSteps: { type: 'STRING' }
              }
            }
          }
        }, participantSensitiveTerms);
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || 'AI korektura selhala.');
      const finishReason = result?.candidates?.[0]?.finishReason || '';
      if (finishReason === 'MAX_TOKENS') {
        throw new Error('AI vrátila useknutý text kvůli limitu délky. Aktivita nebyla uložena, zkus text zkrátit nebo uložit znovu.');
      }
      const parsed = parseAiJson(extractGeminiText(result));
      const description = cleanGeneratedText(parsed.description || '').trim() || 'Neuvedeno';
      const outcome = cleanGeneratedText(parsed.outcome || '').trim() || 'Neuvedeno';
      const nextSteps = cleanGeneratedText(parsed.nextSteps || '').trim() || 'Neuvedeno';
      const isTeamMeeting = String(ka01Draft.networkType || '').trim().toLocaleLowerCase('cs') === 'porada';
      const outcomeLabel = isTeamMeeting ? 'Úkoly' : 'Výsledek';
      const nextStepsLabel = isTeamMeeting ? 'Termín a témata dalšího jednání' : 'Navazující krok';
      const aiDescription = [
        `Popis: ${description}`,
        `${outcomeLabel}: ${outcome}`,
        `${nextStepsLabel}: ${nextSteps}`
      ].join('\n\n');
      return {
        ...ka01Draft,
        networkOutcome: outcome,
        networkNextSteps: nextSteps,
        networkDescription: aiDescription
      };
    } catch (error) {
      console.warn('KA01 AI polish skipped:', error);
      setFlash(error.message || 'AI korektura aktivity tvorby s\u00edt\u011b se nepoda\u0159ila. Aktivita nebyla ulo\u017eena.');
      return null;
    }
  };

  const handleGenerateKa01NetworkDescription = async () => {
    if (!String(ka01Draft.networkNotes || '').trim()) {
      setFlash('Nejprve vypl\u0148 popis.');
      return;
    }
    setIsSaving(true);
    try {
      const polishedDraft = await polishKa01NetworkDraft({ force: true });
      if (!polishedDraft) return;
      setKa01Draft(polishedDraft);
      setFlash('N\u00e1vrh z\u00e1pisu byl vygenerov\u00e1n.');
    } finally {
      setIsSaving(false);
    }
  };
  const persistKa01Network = async () => {
    if (!String(ka01Draft.networkStartTime || '').trim() || !String(ka01Draft.networkEndTime || '').trim()) {
      setSaveButtonNotice('network', 'error', 'Aktivita nebyla uložena: doplňte čas od a do.');
      setKa01NetworkTimeError('Nutn\u00e9 doplnit \u010das od a do.');
      return;
    }
    if (!String(ka01Draft.networkNotes || '').trim()) {
      setSaveButtonNotice('network', 'error', 'Aktivita nebyla uložena: vyplňte popis.');
      setFlash('Vypl\u0148 popis.');
      return;
    }
    setKa01NetworkTimeError('');
    setIsSaving(true);
    const polishedDraft = await polishKa01NetworkDraft();
    setIsSaving(false);
    if (!polishedDraft) {
      setSaveButtonNotice('network', 'error', 'Aktivita nebyla uložena: příprava zápisu selhala.');
      return;
    }
    setKa01Draft(polishedDraft);

    const participantNames = normalizeKa01ActorEntries(polishedDraft.networkActorEntries)
      .map((entry) => getKa01ActorDisplayName(entry))
      .filter(Boolean);
    const isTeamMeeting = String(polishedDraft.networkType || '').toLowerCase() === 'porada';
    const partnerRecords = ka01ActorRegistryRecords.filter((record) =>
      participantNames.includes(String(record.payload?.name || '').trim())
    );
    const partnerNames = partnerRecords.map((record) => String(record.payload?.name || '').trim()).filter(Boolean);
    const partnerIds = partnerRecords.map((record) => record.id).filter(Boolean);
    const rtMembers = isTeamMeeting ? participantNames.filter((name) => WORKERS.includes(name)) : [];
    const knownNames = new Set([...rtMembers, ...partnerNames]);
    const otherPeople = participantNames.filter((name) => !knownNames.has(name));
    const count = participantNames.length;

    if (!editingKa01NetworkRecordId && !ka01NetworkPendingIdRef.current) {
      ka01NetworkPendingIdRef.current = 'SCHUZKA-SITE-WEB-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
    }
    const recordPayload = {
      id: editingKa01NetworkRecordId || ka01NetworkPendingIdRef.current,
      entityType: 'network_activities',
      ka: 'KA2',
      title: 'KA02 - ' + polishedDraft.networkType,
      activityDate: polishedDraft.date,
      worker: '',
      clientIds: [],
      documentText: polishedDraft.networkDescription,
      payload: {
        type: polishedDraft.networkType,
        participants: participantNames.join(', '),
        partnerIds,
        partnerNames,
        rtMembers,
        otherPeople,
        place: polishedDraft.networkPlace,
        count,
        startTime: polishedDraft.networkStartTime,
        endTime: polishedDraft.networkEndTime,
        duration: formatDurationFromTimes(polishedDraft.networkStartTime, polishedDraft.networkEndTime),
        notes: polishedDraft.networkNotes,
        outcome: polishedDraft.networkOutcome || '',
        nextSteps: polishedDraft.networkNextSteps || '',
        description: polishedDraft.networkDescription
      },
      indicatorFlags: { ka01NetworkActivity: true }
    };

    const ok = editingKa01NetworkRecordId
      ? await updateExistingRecord(editingKa01NetworkRecordId, recordPayload, { noticeKey: 'network', successText: 'Uloženo' })
      : await saveRecord(recordPayload, { noticeKey: 'network', successText: 'Uloženo' });
    if (!ok) return;
    ka01NetworkPendingIdRef.current = '';

    try {
      const url = new URL(GOOGLE_SHEET_MACRO_URL, window.location.origin);
      url.searchParams.set('action', 'listNetworkMeetings');
      const response = await fetch(url.toString(), { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || json.ok === false) throw new Error(json.error || 'Načtení schůzek selhalo.');
      const remoteNetworkRecords = mapSheetRecordsToAppRecords({ networkMeetings: json.networkMeetings || [] }, clientIndex);
      setRecords((previous) => {
        const otherRecords = previous.filter((record) => record.entityType !== 'network_activities');
        const merged = [...remoteNetworkRecords, ...otherRecords].sort(compareTimelineRecordsDesc);
        return merged;
      });
    } catch (error) {
      console.warn('Network meetings refresh error:', error);
    }

    setFlash(editingKa01NetworkRecordId ? 'Aktivita tvorby s\u00edt\u011b byla upravena.' : 'Aktivita tvorby s\u00edt\u011b byla ulo\u017eena.');
    setEditingKa01NetworkRecordId('');
    setKa01Draft((previous) => ({
      ...previous,
      networkParticipants: '',
      networkActorEntries: [buildEmptyKa01ActorEntry()],
      networkPlaceType: '',
      networkPlaceCustom: '',
      networkPlace: '',
      networkCount: '0',
      networkStartTime: '',
      networkEndTime: '',
      networkNotes: '',
      networkOutcome: '',
      networkNextSteps: '',
      networkDescription: ''
    }));
  };
  const handleSaveKa01Network = async () => {
    if (ka01NetworkSaveLockRef.current) return;
    ka01NetworkSaveLockRef.current = true;
    setSaveButtonNotice('network', 'progress', 'Ukládám…');
    try {
      await persistKa01Network();
    } finally {
      ka01NetworkSaveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleEditKa01Network = (record) => {
    const payload = record.payload || {};
    const knownParticipantValues = String(payload.type || '').toLowerCase() === 'porada'
      ? [...WORKERS, ...ka01ActorOptions.map((option) => option.value)]
      : ka01ActorOptions.map((option) => option.value);
    const actorEntries = parseKa01ActorEntries(payload.participants || '', knownParticipantValues);
    const selectedActorCount = actorEntries.filter((entry) => Boolean(getKa01ActorDisplayName(entry))).length;
    const minimumCount = selectedActorCount;
    const placeSelection = parseKa01PlaceValue(payload.place || '');
    setKa01Draft((prev) => ({
      ...prev,
      date: record.activityDate || todayIso(),
      worker: '',
      networkType: payload.type || payload.networkType || prev.networkType,
      networkParticipants: payload.participants || '',
      networkActorEntries: actorEntries,
      networkPlaceType: placeSelection.placeType,
      networkPlaceCustom: placeSelection.customPlace,
      networkPlace: payload.place || '',
      networkCount: String(Math.max(Number(payload.count ?? 0), minimumCount, 0)),
      networkStartTime: payload.startTime || '',
      networkEndTime: payload.endTime || '',
      networkNotes: payload.notes || '',
      networkOutcome: payload.outcome || '',
      networkNextSteps: payload.nextSteps || '',
      networkDescription: payload.description || payload.notes || ''
    }));
    setEditingKa01NetworkRecordId(record.id);
    setFlash('Záznam KA01 byl načten do formuláře pro úpravu.');
  };

  const cancelKa01NetworkEdit = () => {
    setEditingKa01NetworkRecordId('');
    setKa01NetworkTimeError('');
    setKa01Draft((prev) => ({
      ...prev,
      networkParticipants: '',
      networkActorEntries: [buildEmptyKa01ActorEntry()],
      networkPlaceType: '',
      networkPlaceCustom: '',
      networkPlace: '',
      networkCount: '0',
      networkStartTime: '',
      networkEndTime: '',
      networkNotes: '',
      networkOutcome: '',
      networkNextSteps: '',
      networkDescription: ''
    }));
  };

  const toggleKa01NetworkDescription = (recordId) => {
    setExpandedKa01NetworkRecordIds((prev) =>
      prev.includes(recordId) ?prev.filter((item) => item !== recordId) : [...prev, recordId]
    );
  };

  useEffect(() => {
    if (String(ka01Draft.networkStartTime || '').trim() && String(ka01Draft.networkEndTime || '').trim()) {
      setKa01NetworkTimeError('');
    }
  }, [ka01Draft.networkStartTime, ka01Draft.networkEndTime]);

  useEffect(() => {
    setKa01Draft((previous) => {
      const knownValues = new Set(
        String(previous.networkType || '').toLowerCase() === 'porada'
          ? [...WORKERS, ...ka01ActorRegistryRecords.map((record) => String(record.payload?.name || '').trim()).filter(Boolean)]
          : ka01ActorRegistryRecords.map((record) => String(record.payload?.name || '').trim()).filter(Boolean)
      );
      const normalizedEntries = normalizeKa01ActorEntries(previous.networkActorEntries).map((entry) => {
        const value = String(entry.actorType || '').trim();
        if (!value || value === KA01_ACTOR_CUSTOM) return entry;
        return knownValues.has(value) ? entry : { actorType: KA01_ACTOR_CUSTOM, customName: value };
      });
      return {
        ...previous,
        networkActorEntries: normalizedEntries,
        networkParticipants: serializeKa01ActorEntries(normalizedEntries)
      };
    });
  }, [ka01Draft.networkType, ka01ActorRegistryRecords]);
  const updateKa01ActorEntry = (index, patch) => {
    setKa01Draft((prev) => {
      const nextEntries = normalizeKa01ActorEntries(prev.networkActorEntries).map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry
      );
      const normalizedEntries = normalizeKa01ActorEntries(nextEntries);
      const selectedCount = normalizedEntries.filter((entry) => Boolean(getKa01ActorDisplayName(entry))).length;
      const nextCount = selectedCount;
      return {
        ...prev,
        networkActorEntries: normalizedEntries,
        networkParticipants: serializeKa01ActorEntries(normalizedEntries),
        networkCount: String(nextCount)
      };
    });
  };

  const updateKa01PlaceSelection = (placeType) => {
    setKa01Draft((prev) => ({
      ...prev,
      networkPlaceType: placeType,
      networkPlaceCustom: placeType === KA01_PLACE_CUSTOM ?prev.networkPlaceCustom : '',
      networkPlace:
        placeType === KA01_PLACE_CUSTOM
          ?prev.networkPlaceCustom
          : placeType
            ?placeType
            : ''
    }));
  };

  const updateKa01PlaceCustom = (customPlace) => {
    setKa01Draft((prev) => ({
      ...prev,
      networkPlaceCustom: customPlace,
      networkPlace: prev.networkPlaceType === KA01_PLACE_CUSTOM ?customPlace : prev.networkPlace
    }));
  };

  const handleSaveKa02 = async (entityType) => {
    const client = clientIndex[ka02Draft.selectedClientId];
    if (!client) {
      setFlash('Vyber klienta pro KA02 aktivitu.');
      return;
    }

    const payload = buildKa02Record(entityType, ka02Draft, client);
    const ok = await saveRecord(payload);
    if (ok) {
      setFlash('Záznam KA02 byl uložen.');
    }
  };

  const resetKa01ActorRegistryDraft = () => {
    ka01ActorEditVersionRef.current = '';
    setKa01ActorDraft(createKa01ActorDraft());
  };

  const handleSaveKa01ActorRegistry = async () => {
    const name = String(ka01ActorDraft.name || '').trim();
    const origin = String(ka01ActorDraft.networkOrigin || '').trim();
    const contacts = normalizeActorContacts({ contacts: ka01ActorDraft.contacts });
    const primaryContact = contacts[0] || createEmptyActorContact();
    clearSaveButtonNotice('actor');
    if (!name) { setSaveButtonNotice('actor', 'error', 'Aktér nebyl uložen: vyplňte název subjektu.'); setFlash('Vyplňte název subjektu.'); return; }
    if (!ka01ActorDraft.actorType) { setSaveButtonNotice('actor', 'error', 'Aktér nebyl uložen: vyberte typ aktéra.'); setFlash('Vyberte typ aktéra.'); return; }
    if (!origin) { setSaveButtonNotice('actor', 'error', 'Aktér nebyl uložen: vyberte původ sítě.'); setFlash('Vyberte původ sítě.'); return; }
    if (origin.toLowerCase().includes('nov') && !ka01ActorDraft.joinedNetworkDate) {
      setSaveButtonNotice('actor', 'error', 'Aktér nebyl uložen: doplňte datum zapojení.');
      setFlash('U nov\u011b zapojen\u00e9ho akt\u00e9ra dopl\u0148 datum zapojen\u00ed.');
      return;
    }

    const editingId = ka01ActorDraft.id || '';
    const isPersistedEdit = Boolean(editingId && records.some((record) => record.id === editingId));
    const duplicate = records.find((record) =>
      record.entityType === 'actor_registry'
      && record.id !== editingId
      && normalizeDuplicateText(record.payload?.name) === normalizeDuplicateText(name)
    );
    if (duplicate) {
      setSaveButtonNotice('actor', 'error', 'Aktér nebyl uložen: tento subjekt už existuje. Upravte jej a přidejte další kontaktní osobu.');
      setFlash('Tento subjekt už je v registru. Přidejte osobu přes jeho úpravu.');
      return;
    }
    const actorRecord = {
      entityType: 'actor_registry',
      ka: 'KA2',
      title: 'Registr akt\u00e9ra - ' + name,
      activityDate: ka01ActorDraft.joinedNetworkDate || todayIso(),
      worker: ka01Draft.worker || '',
      clientIds: [],
      documentText: '',
      ...(isPersistedEdit ? { expectedUpdatedAt: ka01ActorEditVersionRef.current } : {}),
      payload: {
        ...ka01ActorDraft,
        id: isPersistedEdit ? editingId : '',
        ...(editingId && !isPersistedEdit ? { seedSourceId: editingId } : {}),
        name,
        actorType: ka01ActorDraft.actorType,
        networkOrigin: origin,
        joinedNetworkDate: origin.toLowerCase().includes('nov') ? ka01ActorDraft.joinedNetworkDate : '',
        contacts,
        contactName: primaryContact.name,
        contactTitle: primaryContact.title,
        contactFirstName: primaryContact.firstName,
        contactLastName: primaryContact.lastName,
        contactRole: primaryContact.role,
        phone: primaryContact.phone,
        email: primaryContact.email,
        cooperationStatus: 'aktivn\u011b zapojen'
      },
      indicatorFlags: { ka01NetworkSize: 1 }
    };

    const ok = isPersistedEdit
      ? await updateExistingRecord(editingId, actorRecord, { noticeKey: 'actor', successText: 'Uloženo' })
      : await saveRecord(actorRecord, { noticeKey: 'actor', successText: 'Uloženo' });
    if (!ok) return;
    setFlash(editingId ? 'Akt\u00e9r byl upraven.' : 'Akt\u00e9r byl ulo\u017een do registru.');
    resetKa01ActorRegistryDraft();
  };
  const handleEditKa01ActorRegistry = (record) => {
    const payload = record.payload || {};
    const contacts = normalizeActorContacts(payload);
    const editableContacts = contacts.length ? contacts : [createEmptyActorContact()];
    const fullName = String(payload.contactName || '').trim();
    const splitTitle = String(payload.contactTitle || '').trim();
    const splitFirst = String(payload.contactFirstName || '').trim();
    const splitLast = String(payload.contactLastName || '').trim();
    const fallbackTokens = fullName.split(/\s+/).filter(Boolean);
    const knownTitleRegex = /^(Mgr\.?|Ing\.?|Bc\.?|JUDr\.?|MUDr\.?|PhDr\.?|doc\.?|prof\.?|DiS\.?)$/i;
    const parsedTitle = splitTitle || (fallbackTokens.length > 0 && knownTitleRegex.test(fallbackTokens[0]) ? fallbackTokens[0] : '');
    const parsedFirst = splitFirst
      || (fallbackTokens.length > 0
        ? (parsedTitle ? (fallbackTokens[1] || '') : fallbackTokens[0])
        : '');
    const parsedLast = splitLast
      || (fallbackTokens.length > 0
        ? fallbackTokens.slice(parsedTitle ? 2 : 1).join(' ')
        : '');

    ka01ActorEditVersionRef.current = record.expectedUpdatedAt || record.updatedAt || '';
    setKa01ActorDraft({
      ...ka01ActorDraft,
      ...KA01_EMPTY_ACTOR_ROLES,
      ...payload,
      networkOrigin:
        String(payload.networkOrigin || '').trim()
        || (String(record.id || '').startsWith('seed-ka01-actor-')
          ? 'výchozí síť'
          : 'nově přidaný v realizaci'),
      roleRecruitment: isCheckedValue(payload.roleRecruitment),
      roleClientReferral: isCheckedValue(payload.roleClientReferral),
      roleMaterialDistribution: isCheckedValue(payload.roleMaterialDistribution),
      roleJobOpportunities: isCheckedValue(payload.roleJobOpportunities),
      roleTpm: isCheckedValue(payload.roleTpm),
      roleHpp: isCheckedValue(payload.roleHpp),
      roleFollowupService: isCheckedValue(payload.roleFollowupService) || isCheckedValue(payload.roleDebtSocialSupport),
      roleDebtSocialSupport: isCheckedValue(payload.roleDebtSocialSupport),
      roleInfoSharingWithConsent: isCheckedValue(payload.roleInfoSharingWithConsent),
      roleCoordinationMeetings: isCheckedValue(payload.roleCoordinationMeetings),
      roleWorkplaceAdaptation: isCheckedValue(payload.roleWorkplaceAdaptation),
      roleOther: isCheckedValue(payload.roleOther),
      contactTitle: parsedTitle,
      contactFirstName: parsedFirst,
      contactLastName: parsedLast,
      contacts: editableContacts,
      id: record.id
    });
    setFlash('Karta aktéra byla načtena k úpravě.');
  };

  const cancelKa01ActorRegistryEdit = () => {
    resetKa01ActorRegistryDraft();
    clearSaveButtonNotice('actor');
    setFlash('Úprava aktéra byla zrušena.');
  };

  const setKa01ActorAttendanceContacts = (recordId, contactIds) => {
    setKa01AttendanceSelection((prev) => ({
      ...prev,
      [recordId]: Array.from(new Set((contactIds || []).map(String)))
    }));
  };

  const exportKa01AttendanceSheet = async (sheetType = 'network') => {
    const selectedParticipants = buildAttendanceParticipants(ka01ActorRegistryRecords, ka01AttendanceSelection);

    if (selectedParticipants.length === 0) {
      setFlash('Vyberte alespoň jednu osobu s vyplněným jménem a příjmením.');
      return;
    }

    const attendanceTitle = attendanceSheetTitle(sheetType);
    const attendanceRowCount = Math.max(15, selectedParticipants.length);
    const rows = Array.from({ length: attendanceRowCount }, (_, index) => {
      const participant = selectedParticipants[index];
      return {
        order: String(index + 1),
        firstName: participant?.firstName || '',
        lastName: participant?.lastName || '',
        organization: participant?.organization || '',
        role: participant?.role || ''
      };
    });

    setFlash('Připravuji PDF prezenční listiny...');
    let wrapper = null;
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const rowsHtml = rows.map((row) => `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${escapeHtml(row.order)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;">${escapeHtml(row.firstName)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;">${escapeHtml(row.lastName)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;">${escapeHtml(row.organization)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;">${escapeHtml(row.role)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;height:30px;"></td>
        </tr>
      `).join('');

      wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      wrapper.style.pointerEvents = 'none';
      wrapper.style.zIndex = '2147483647';
      wrapper.style.width = '1123px';
      wrapper.style.background = '#ffffff';
      wrapper.style.color = '#0f172a';
      wrapper.style.fontFamily = 'Arial, sans-serif';
      wrapper.style.padding = '28px';
      wrapper.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:12px;">
          <div>
            <h1 style="margin:0 0 8px 0;font-size:34px;line-height:1.2;">${escapeHtml(attendanceTitle)}</h1>
            <p style="margin:0 0 6px 0;font-size:18px;">Datum vytvoření: ${escapeHtml(todayIso())}</p>
            <p style="margin:0;font-size:18px;">Schůzka dne: ........................................   Od: ....................   Do: ....................</p>
          </div>
          <img src="${sfLogoImage}" alt="Spolufinancováno" style="width:420px;height:auto;" />
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:16px;">
          <thead>
            <tr>
              <th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;">#</th>
              <th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;">Jméno</th>
              <th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;">Příjmení</th>
              <th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;">Organizace</th>
              <th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;">Funkce v organizaci</th>
              <th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;">Podpis</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `;
      document.body.appendChild(wrapper);
      const logoEl = wrapper.querySelector('img');
      if (logoEl && !logoEl.complete) {
        await new Promise((resolve) => {
          logoEl.onload = () => resolve();
          logoEl.onerror = () => resolve();
        });
      }

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: false,
        backgroundColor: '#ffffff'
      });
      wrapper.remove();
      wrapper = null;

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = imgHeight;
      let y = margin;
      doc.addImage(imgData, 'PNG', margin, y, contentWidth, imgHeight);
      heightLeft -= contentHeight;

      while (heightLeft > 0) {
        y = margin - (imgHeight - heightLeft);
        doc.addPage();
        doc.addImage(imgData, 'PNG', margin, y, contentWidth, imgHeight);
        heightLeft -= contentHeight;
      }

      doc.save(`prezencni_listina_${todayIso()}.pdf`);
      setFlash(`Prezenční listina byla stažena do PDF pro ${selectedParticipants.length} osob.`);
    } catch (error) {
      wrapper?.remove();
      console.error('KA01 attendance PDF export error:', error);
      setFlash(error.message || 'Export prezenční listiny do PDF selhal.');
    }
  };


  const handleSaveKa03 = async (entityType) => {
    const clientIdByEntityType = {
      tpm_records: ka03Draft.tpmClientId || ka03Draft.selectedClientId,
      employment_records: ka03Draft.employmentClientId || ka03Draft.selectedClientId
    };
    const activityDateByEntityType = {
      tpm_records: ka03Draft.tpmDate || ka03Draft.date,
      employment_records: ka03Draft.employmentDate || ka03Draft.date
    };
    const client = clientIndex[clientIdByEntityType[entityType] || ka03Draft.selectedClientId];
    if (!client) {
      setFlash('Vyber klienta pro aktivitu.');
      return;
    }
    const goalOptions = getPlanGoalOptions(client.id);
    const selectedGoalId =
      entityType === 'employment_records'
        ? ka03Draft.employmentLinkedPlanGoalId
        : ka03Draft.tpmLinkedPlanGoalId;
    if (!selectedGoalId || !goalOptions.some((goal) => goal.value === selectedGoalId)) {
      setFlash(goalOptions.length ? 'Vyber cíl z plánu osobního rozvoje.' : 'Nejdřív doplň cíl v plánu osobního rozvoje klienta.');
      return;
    }

    const payload = buildKa03Record(entityType, { ...ka03Draft, date: activityDateByEntityType[entityType] || ka03Draft.date }, client);
    const ok = editingKa03RecordId ? await updateExistingRecord(editingKa03RecordId, payload) : await saveRecord(payload);
    if (ok) {
      setEditingKa03RecordId('');
      setFlash(editingKa03RecordId ?'Záznam byl upraven.' : 'Záznam byl uložen.');
    }
  };

  const handleSaveEducation = async () => {
    clearSaveButtonNotice('education');
    const title = String(educationDraft.title || '').trim();
    const date = String(educationDraft.date || '').trim();
    const hours = String(educationDraft.hours || '').trim();
    const workers = [
      educationDraft.worker1,
      educationDraft.worker2,
      educationDraft.worker3
    ].map((worker) => String(worker || '').trim()).filter(Boolean);

    if (!date || !title || !hours || workers.length === 0) {
      setSaveButtonNotice('education', 'error', 'Vzdělávání nebylo uloženo: doplňte všechna povinná pole.');
      setFlash('Vyplň datum, počet hodin, název vzdělávání a alespoň prvního pracovníka.');
      return;
    }

    const recordPayload = {
      id: 'VZDELAVANI-WEB-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
      entityType: 'education_records',
      ka: 'VZDELAVANI',
      title,
      activityDate: date,
      worker: workers[0],
      clientIds: [],
      documentText: title,
      payload: {
        date,
        hours,
        title,
        accreditationNumber: String(educationDraft.accreditationNumber || '').trim(),
        worker: workers[0],
        workers
      },
      indicatorFlags: {}
    };

    const ok = await saveRecord(recordPayload, { noticeKey: 'education', successText: 'Uloženo' });
    if (!ok) return;
    setEducationDraft({
      date: todayIso(),
      hours: '',
      title: '',
      accreditationNumber: '',
      worker1: currentWorker,
      worker2: '',
      worker3: ''
    });
    setFlash('Vzdělávací akce byla uložena.');
  };

  const handleSaveSupervision = async () => {
    clearSaveButtonNotice('supervision');
    const date = String(supervisionDraft.date || '').trim();
    const hours = String(supervisionDraft.hours || '').trim();
    const type = String(supervisionDraft.type || '').trim();
    const workers = [
      supervisionDraft.worker1,
      isIndividualSupervision ? '' : supervisionDraft.worker2,
      isIndividualSupervision ? '' : supervisionDraft.worker3
    ].map((worker) => String(worker || '').trim()).filter(Boolean);

    if (!date || !hours || !type || workers.length === 0) {
      setSaveButtonNotice('supervision', 'error', 'Supervize nebyla uložena: doplňte všechna povinná pole.');
      setFlash('Vyplň datum, počet hodin, typ supervize a alespoň prvního pracovníka.');
      return;
    }

    const recordPayload = {
      id: 'SUPERVIZE-WEB-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
      entityType: 'supervision_records',
      ka: 'SUPERVIZE',
      title: 'Supervize - ' + type,
      activityDate: date,
      worker: workers[0],
      clientIds: [],
      documentText: type,
      payload: {
        date,
        hours,
        type,
        workers
      },
      indicatorFlags: {}
    };

    const ok = await saveRecord(recordPayload, { noticeKey: 'supervision', successText: 'Uloženo' });
    if (!ok) return;
    setSupervisionDraft({
      date: todayIso(),
      hours: '',
      type: 'individuální',
      worker1: currentWorker,
      worker2: '',
      worker3: ''
    });
    setFlash('Supervize byla uložena.');
  };

  const openClient = (clientId, nextView = 'clients') => {
    if (nextView !== mainView && !confirmAndResetBeforeViewChange()) return;
    setShowClientForm(false);
    setShowClientEditForm(false);
    setClientCaseSummary('');
    setEditingGeneratedRecordId('');
    setEditingKa03RecordId('');
    setSelectedClientId(clientId);
    setGeneratorDraft((prev) => ({ ...prev, clientId }));
    setKa01Draft((prev) => ({ ...prev, assessmentClientId: clientId }));
    setKa02Draft((prev) => ({ ...prev, selectedClientId: clientId }));
    setKa03Draft((prev) => ({
      ...prev,
      selectedClientId: clientId,
      tpmClientId: clientId,
      employmentClientId: clientId,
      tpmLinkedPlanGoalId: '',
      tpmLinkedPlanGoalLabel: '',
      employmentLinkedPlanGoalId: '',
      employmentLinkedPlanGoalLabel: '',
      tpmDate: prev.tpmDate || todayIso(),
      employmentDate: prev.employmentDate || todayIso()
    }));
    setMainView(nextView);
  };

  const getUniqueClientSupportRecords = (sourceRecords) => {
    const seen = new Set();
    return (sourceRecords || []).filter((record) => {
      if (record.isSynthetic || record.entityType !== 'consultations') return false;
      const clientIds = Array.isArray(record.clientIds) ? record.clientIds : record.clientId ? [record.clientId] : [];
      if (!clientIds.length) return false;
      const payload = record.payload || {};
      const key = [
        [...clientIds].sort().join(','),
        record.activityDate || '',
        payload.startTime || payload.ka02StartTime || '',
        payload.endTime || payload.ka02EndTime || '',
        Number(payload.durationMinutes || 0),
        payload.consultationType || record.title || '',
        record.documentText || payload.topics || '',
        payload.outcome || '',
        payload.nextSteps || ''
      ].map((value) => String(value).trim()).join('|').toLocaleLowerCase('cs');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const filteredClientSupportRecords = useMemo(
    () => isReportingViewActive ? getUniqueClientSupportRecords(filteredRecords) : [],
    [filteredRecords, isReportingViewActive]
  );

  const exportClientsIsEsfCsv = async () => {
    const requestId = isEsfExportRequestRef.current + 1;
    isEsfExportRequestRef.current = requestId;
    const exportClients = [...isEsfSupportedClients];
    if (!exportClients.length) {
      setIsEsfExportStatus({
        state: 'error',
        message: 'Ve zvoleném období nejsou evidováni žádní klienti s podporou KA1.',
        addressFallbacks: [],
        addressAdjustments: [],
        educationFallbacks: [],
        dataIssues: []
      });
      return;
    }

    setIsEsfExportStatus({
      state: 'loading',
      message: 'Načítám aktuální registr RÚIAN…',
      addressFallbacks: [],
      addressAdjustments: [],
      educationFallbacks: [],
      dataIssues: []
    });

    try {
      const result = await buildIsEsfPersonExport(exportClients, {
        baseUrl: '',
        onProgress: ({ phase, current, total }) => {
          if (isEsfExportRequestRef.current !== requestId) return;
          const message = phase === 'municipalities'
            ? `Ověřuji adresy podle RÚIAN (${current}/${Math.max(total, 1)})…`
            : 'Načítám seznam obcí RÚIAN…';
          setIsEsfExportStatus({
            state: 'loading',
            message,
            addressFallbacks: [],
            addressAdjustments: [],
            educationFallbacks: [],
            dataIssues: []
          });
        }
      });
      if (isEsfExportRequestRef.current !== requestId) return;

      const csv = serializeIsEsfPersonCsv(result.rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      const periodSlug = slugify(selectedReportingPeriod?.label || 'cele-obdobi');
      link.download = `PodporeneOsoby-MBV-${periodSlug}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 4000);

      const fallbackText = result.addressFallbacks.length > 0
        ? ` U ${result.addressFallbacks.length} osob se nepodařilo potvrdit úplné adresní místo; v CSV je uvedena pouze obec.`
        : ' Všechny obce, čísla domů a PSČ byly potvrzeny.';
      const adjustedText = result.addressAdjustments.length > 0
        ? ` U ${result.addressAdjustments.length} osob byla adresa bezpečně upravena nebo doplněna podle RÚIAN.`
        : '';
      const missingEducationCount = result.educationFallbacks.filter((item) => item.kind === 'missing').length;
      const unrecognizedEducationCount = result.educationFallbacks.length - missingEducationCount;
      const educationText = result.educationFallbacks.length === 0
        ? ''
        : unrecognizedEducationCount === 0
          ? ` U ${missingEducationCount} osob není v klientském registru vyplněno vzdělání; CSV používá obecný kód VZJN.`
          : ` U ${missingEducationCount} osob není vzdělání vyplněno a u ${unrecognizedEducationCount} osob nemá rozpoznaný formát; CSV používá obecný kód VZJN.`;
      setIsEsfExportStatus({
        state: result.blockingIssues.length > 0 ? 'warning' : 'success',
        message: result.blockingIssues.length > 0
          ? `CSV pro IS ESF bylo vytvořeno (${result.rows.length} osob), ale obsahuje ${result.blockingIssues.length} upozornění k doplnění.${fallbackText}${adjustedText}${educationText}`
          : `CSV pro IS ESF bylo vytvořeno (${result.rows.length} osob).${fallbackText}${adjustedText}${educationText}`,
        addressFallbacks: result.addressFallbacks,
        addressAdjustments: result.addressAdjustments,
        educationFallbacks: result.educationFallbacks,
        dataIssues: result.blockingIssues
      });
    } catch (error) {
      if (isEsfExportRequestRef.current !== requestId) return;
      setIsEsfExportStatus({
        state: 'error',
        message: error?.message || 'CSV pro IS ESF se nepodařilo vytvořit.',
        addressFallbacks: [],
        addressAdjustments: [],
        educationFallbacks: [],
        dataIssues: []
      });
    }
  };

  const importIsEsfPersonCsv = async (file) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      let content = new TextDecoder('utf-8').decode(buffer);
      if (content.includes('\uFFFD')) content = new TextDecoder('windows-1250').decode(buffer);
      const parsed = parseIsEsfPersonTemplateCsv(content);
      setIsEsfPersonImport({ fileName: file.name, rows: parsed.rows, error: '' });
      setIsEsfSupportExportStatus({
        state: 'idle',
        message: `CSV z IS ESF bylo načteno (${parsed.rowCount} osob). Nyní lze vytvořit navazující CSV podpor.`,
        issues: []
      });
    } catch (error) {
      setIsEsfPersonImport({ fileName: file.name, rows: [], error: error?.message || 'CSV z IS ESF se nepodařilo načíst.' });
      setIsEsfSupportExportStatus({
        state: 'error',
        message: error?.message || 'CSV z IS ESF se nepodařilo načíst.',
        issues: []
      });
    }
  };

  const clearIsEsfPersonCsv = () => {
    setIsEsfPersonImport({ fileName: '', rows: [], error: '' });
    setIsEsfSupportExportStatus({
      state: 'idle',
      message: 'Nejprve nahrajte CSV podpořených osob vyexportované z IS ESF.',
      issues: []
    });
  };

  const exportSupportsIsEsfCsv = async () => {
    const requestId = isEsfSupportExportRequestRef.current + 1;
    isEsfSupportExportRequestRef.current = requestId;
    if (!selectedReportingPeriod?.start || !selectedReportingPeriod?.end) {
      setIsEsfSupportExportStatus({
        state: 'error',
        message: 'Pro export podpor vyberte konkrétní monitorovací období.',
        issues: []
      });
      return;
    }
    const exportClients = [...isEsfSupportedClients];
    const exportRecords = [...isEsfSupportRecords];
    if (!exportClients.length || !exportRecords.length) {
      setIsEsfSupportExportStatus({
        state: 'error',
        message: 'Ve zvoleném období nejsou evidovány žádné výkony KA1 k exportu.',
        issues: []
      });
      return;
    }

    if (!isEsfPersonImport.rows.length) {
      setIsEsfSupportExportStatus({
        state: 'error',
        message: 'Nejprve nahrajte CSV podpořených osob vyexportované z IS ESF.',
        issues: []
      });
      return;
    }

    const unmatchedIssues = isEsfPersonImportMatch.unmatchedClients.map((client) => ({
      recordId: client.id,
      clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim(),
      message: 'Osoba nebyla v nahraném CSV z IS ESF nalezena podle jména, příjmení a data narození.'
    }));
    const ambiguousIssues = isEsfPersonImportMatch.ambiguousClients.map((client) => ({
      recordId: client.id,
      clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim(),
      message: 'Osoba je v nahraném CSV z IS ESF uvedena vícekrát a nelze ji jednoznačně přiřadit.'
    }));
    if (unmatchedIssues.length || ambiguousIssues.length) {
      setIsEsfSupportExportStatus({
        state: 'error',
        message: `CSV podpor nebylo vytvořeno: ${unmatchedIssues.length + ambiguousIssues.length} osob nelze bezpečně přiřadit k importu z IS ESF.`,
        issues: [...unmatchedIssues, ...ambiguousIssues]
      });
      return;
    }

    setIsEsfSupportExportStatus({
      state: 'loading',
      message: 'Přiřazuji osoby z IS ESF a připravuji souhrn podpor…',
      issues: []
    });

    try {
      const result = buildIsEsfSupportExport({
        clients: isEsfPersonImportMatch.matchedClients,
        personRows: isEsfPersonImportMatch.matchedPersonRows,
        records: exportRecords,
        reportingPeriod: selectedReportingPeriod,
        isFirstReportingPeriod: selectedReportingPeriod?.value === REPORTING_PERIODS[1]?.value
      });
      const issues = result.rows.flatMap((row) => row.issues.map((issue) => ({
        recordId: row.recordId || row.sourceRow,
        clientName: `${row.values.Jmeno_Osoby} ${row.values.Prijmeni_Osoby}`.trim(),
        message: issue.message
      })));

      if (result.errorCount > 0 || !result.validRows.length) {
        setIsEsfSupportExportStatus({
          state: 'error',
          message: result.errorCount > 0
            ? `CSV nebylo vytvořeno: nalezeno ${result.errorCount} chyb v datech výkonů nebo osob.`
            : 'CSV nebylo vytvořeno, protože neobsahuje žádný platný řádek podpory.',
          issues
        });
        return;
      }

      const csv = serializeIsEsfSupportCsv(result.validRows.map((row) => row.values));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const periodSlug = slugify(selectedReportingPeriod?.label || 'cele-obdobi');
      link.href = href;
      link.download = `Podpory-MBV-${periodSlug}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 4000);

      setIsEsfSupportExportStatus({
        state: 'success',
        message: `CSV bylo vytvořeno: ${result.validRows.length} souhrnných řádků, specifikace ${result.supportCode}, prezenčně ${result.inPersonHours.toLocaleString('cs-CZ')} h a elektronicky ${result.electronicHours.toLocaleString('cs-CZ')} h.`,
        issues: []
      });
    } catch (error) {
      if (isEsfSupportExportRequestRef.current !== requestId) return;
      setIsEsfSupportExportStatus({
        state: 'error',
        message: error?.message || 'CSV podpor pro IS ESF se nepodařilo vytvořit.',
        issues: []
      });
    }
  };

  const exportAllRecordsBackup = () => {
    const supportRecords = filteredClientSupportRecords;
    const content = buildAllRecordsBackupHtml(supportRecords, clients);
    const filterSlug = slugify([
      dashboardFilters.period || 'projekt',
      dashboardFilters.ka === 'all' ? 'vsechny-ka' : dashboardFilters.ka,
      dashboardFilters.worker === 'all' ? 'vsichni-pracovnici' : dashboardFilters.worker
    ].join('-'));
    downloadHtmlDocument(content, `zapisy-podpory-${filterSlug}-${todayIso()}.doc`);
  };
  const exportDetailedOutputsXlsx = async () => {
    if (isExportingDetailedOutputs) return;
    const supportRecords = filteredClientSupportRecords;
    if (!supportRecords.length) {
      setFlash('Pro zvolené filtry nejsou evidovány žádné výkony k exportu.');
      return;
    }

    setIsExportingDetailedOutputs(true);
    try {
      const { buildDetailedOutputsXlsx } = await import('../lib/detailedOutputsXlsx.js');
      const filterLabel = [
        `Období: ${selectedReportingPeriod.label}`,
        `KA: ${dashboardFilters.ka === 'all' ? 'všechny' : dashboardFilters.ka}`,
        `Pracovník: ${dashboardFilters.worker === 'all' ? 'všichni' : dashboardFilters.worker}`
      ].join(' | ');
      const result = await buildDetailedOutputsXlsx({ records: supportRecords, clients, filterLabel });
      const blob = new Blob([result.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filterSlug = slugify([
        dashboardFilters.period || 'projekt',
        dashboardFilters.ka === 'all' ? 'vsechny-ka' : dashboardFilters.ka,
        dashboardFilters.worker === 'all' ? 'vsichni-pracovnici' : dashboardFilters.worker
      ].join('-'));
      link.download = `podrobne-vystupy-${filterSlug}-${todayIso()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setFlash(`XLSX obsahuje ${result.performanceCount} výkonů a souhrn ${result.clientCount} klientů.`);
    } catch (error) {
      console.error('Detailed XLSX export error:', error);
      setFlash(error.message || 'Podrobný XLSX export se nepodařilo vytvořit.');
    } finally {
      setIsExportingDetailedOutputs(false);
    }
  };
  const exportClientFolder = () => {
    if (!selectedClient) return;
    const content = buildClientFolderHtml(selectedClient, clientJourneyTimeline);
    downloadHtmlDocument(content, `slozka-klienta-${slugify(selectedClient.fullName)}.doc`);
  };

  const summarizeClientCase = async () => {
    if (!selectedClient) return;
    const aiTimeline = filterClientCaseAiRecords(clientJourneyTimeline);
    const aiSupportBreakdown = getClientSupportBreakdown(selectedClient.id, aiTimeline);
    const fallbackSummary = buildClientCaseSummary(selectedClient, aiTimeline, aiSupportBreakdown);
    const aiModel = DEFAULT_AI_MODEL;

    setIsSummarizingCase(true);
    setFlash('Připravuji AI souhrn zakázky klienta...');
    try {
      const response = await fetchGemini(aiModel, {
          contents: [
            {
              role: 'user',
              parts: [{ text: buildAiClientCaseSummaryPrompt(selectedClient, aiTimeline, aiSupportBreakdown) }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192
          }
        }, buildSensitiveTerms(selectedClient));
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || `AI souhrn selhal se stavem ${response.status}.`);
      }
      const aiSummary = cleanGeneratedText(extractGeminiText(result));
      const summary = aiSummary || fallbackSummary;
      setClientCaseSummary(summary);
      copyToClipboard(summary, setCopied);
      setFlash('AI souhrn zakázky klienta byl připraven a zkopírován do schránky.');
    } catch (error) {
      console.error('Client case AI summary error:', error);
      setClientCaseSummary(fallbackSummary);
      copyToClipboard(fallbackSummary, setCopied);
      setFlash('AI souhrn se nepodařilo vytvořit. Použil jsem strukturovaný souhrn bez AI.');
    } finally {
      setIsSummarizingCase(false);
    }
  };

  const printClientCaseSummary = () => {
    if (!selectedClient || !clientCaseSummary) return;
    const printWindow = window.open('', '_blank', 'width=960,height=760');
    if (!printWindow) {
      setFlash('Prohlížeč zablokoval tiskové okno. Povolte vyskakovací okna a zkuste to znovu.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildClientCaseSummaryPrintHtml({
      clientName: selectedClient.fullName,
      summary: clientCaseSummary,
      createdDate: formatDateLabel(todayIso())
    }));
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
    setFlash('Otevřel jsem tiskový dialog. Zde lze dokument vytisknout nebo uložit jako PDF.');
  };

  const exportClientCaseSummaryDocx = async () => {
    if (!selectedClient || !clientCaseSummary || isExportingClientCaseDocx) return;
    setIsExportingClientCaseDocx(true);
    try {
      const filename = `souhrn-zakazky-${slugify(selectedClient.fullName)}-${todayIso()}.docx`;
      const response = await fetch('/api/export-record-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          title: 'Souhrn zakázky klienta',
          rows: [
            { label: 'Klient', value: selectedClient.fullName },
            { label: 'Datum vytvoření', value: formatDateLabel(todayIso()) },
            { label: 'Projekt', value: 'Podpora sociální práce v Moravském Berouně II' }
          ],
          text: clientCaseSummary
        })
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        throw new Error(errorResult.error || 'Export DOCX selhal.');
      }

      const blob = await response.blob();
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(href);
      setFlash('Souhrn zakázky klienta byl stažen do DOCX.');
    } catch (error) {
      console.error('Client case summary DOCX export error:', error);
      setFlash(error.message || 'Export souhrnu do DOCX selhal.');
    } finally {
      setIsExportingClientCaseDocx(false);
    }
  };

  const exportJourneyRecord = (record) => {
    if (!record || !selectedClient) return;
    const content = buildRecordHtmlDocument(record, selectedClient);
    const filenameParts = [
      record.activityDate || todayIso(),
      record.ka || record.entityType || 'zaznam',
      record.title || 'zapis'
    ];
    downloadHtmlDocument(content, `${slugify(filenameParts.join('-'))}.doc`);
  };

  const toggleJourneyPrintSelection = (recordId) => {
    setSelectedJourneyPrintIds((prev) =>
      prev.includes(recordId) ? prev.filter((item) => item !== recordId) : [...prev, recordId]
    );
  };

  const exportSelectedJourneyRecords = () => {
    if (!selectedClient) return;
    const selectedRecords = clientJourneyTimeline.filter((record) => selectedJourneyPrintIds.includes(record.id));
    if (!selectedRecords.length) {
      setFlash('Nejprve zaškrtni alespoň jeden zápis v klientské ose.');
      return;
    }
    const content = buildSelectedJourneyPrintHtml(selectedClient, selectedRecords);
    downloadHtmlDocument(content, `vybrane-zapisy-${slugify(selectedClient.fullName)}-${todayIso()}.doc`);
  };

  const buildJourneyPlanAiPrompt = (record) => [
    'Vylepši Individuální plán rozvoje klienta ve stejné struktuře, jakou používá formulář KA02.',
    'Vrať pouze validní JSON bez Markdownu a bez komentáře.',
    'JSON musí mít klíče: situationDescription, goals, finalEvaluation, acceptedPlanText.',
    'Pole goals musí být pole objektů se stejnými goalId jako ve vstupu. Neměň goalId, nemaž cíle, nepřidávej nové cíle a neměň termíny. Termín můžeš opsat pouze do acceptedPlanText.',
    'Povinně zlepši a rozveď formulace nejen v acceptedPlanText, ale také přímo v situationDescription, v každém goals[].goalDescription a v každém goals[].actionSteps. Tato strukturovaná pole musí obsahově odpovídat acceptedPlanText a nesmějí zůstat jen jako původní hesla, pokud je v souvislém textu rozvedeš.',
    'acceptedPlanText vytvoř jako čitelný souvislý plán výhradně ze stejných strukturovaných polí. Neuváděj věty typu "Žádná specifická data nebyla poskytnuta".',
    'finalEvaluation zachovej přesně ze vstupu. Pokud je prázdné, vrať prázdný řetězec a do acceptedPlanText nevkládej závěrečné vyhodnocení ani tvrzení o dosaženém výsledku.',
    'Nepřidávej nová fakta, diagnózy, zaměstnavatele, termíny ani výsledky.',
    '',
    'Aktuální struktura individuálního plánu:',
    JSON.stringify(buildStructuredPlanForAi(record), null, 2)
  ].join('\n');

  const handleGenerateJourneyPlanDraft = async (record) => {
    const aiModel = DEFAULT_AI_MODEL;

    setGeneratingJourneyPlanId(record.id);
    try {
      const response = await fetchGemini(aiModel, {
          contents: [{ role: 'user', parts: [{ text: buildJourneyPlanAiPrompt(record) }] }],
          systemInstruction: {
            parts: [{ text: `${AI_SAFETY_BASE} Vylepšuješ strukturovaný individuální plán, zachováváš vazby na cíle a vracíš pouze validní JSON podle požadovaného schématu.` }]
          },
          generationConfig: {
            temperature: 0.18,
            topP: 0.9,
            maxOutputTokens: 2500,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                situationDescription: { type: 'STRING' },
                goals: { type: 'ARRAY', items: { type: 'OBJECT', properties: { goalId: { type: 'STRING' }, goalDescription: { type: 'STRING' }, actionSteps: { type: 'STRING' }, deadline: { type: 'STRING' } }, required: ['goalId', 'goalDescription', 'actionSteps', 'deadline'] } },
                finalEvaluation: { type: 'STRING' },
                acceptedPlanText: { type: 'STRING' }
              },
              required: ['situationDescription', 'goals', 'finalEvaluation', 'acceptedPlanText']
            }
          }
        }, buildSensitiveTerms(selectedClient));
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || `AI požadavek selhal se stavem ${response.status}.`);
      let structuredDraft;
      const rawPlanOutput = extractGeminiText(result);
      try {
        structuredDraft = parseStructuredPlanAiResult(rawPlanOutput, record);
      } catch (parseError) {
        try {
          const repairResponse = await fetchGemini(aiModel, {
              contents: [{ role: 'user', parts: [{ text: `Oprav odpověď na validní JSON podle původního schématu. Neměň goalId, počet cílů ani termíny a nic věcně nepřidávej. Povinně rozpracuj heslovité goalDescription a actionSteps do profesionálních formulací při zachování původního významu:
${rawPlanOutput}` }] }],
              systemInstruction: { parts: [{ text: AI_SAFETY_BASE }] },
              generationConfig: { temperature: 0, maxOutputTokens: 2500, responseMimeType: 'application/json' }
            }, buildSensitiveTerms(selectedClient));
          const repairResult = await repairResponse.json();
          if (!repairResponse.ok) throw new Error(repairResult?.error?.message || 'Oprava JSON individuálního plánu selhala.');
          structuredDraft = parseStructuredPlanAiResult(extractGeminiText(repairResult), record);
        } catch (repairError) {
          console.warn('Journey plan AI JSON repair failed, using safe fallback:', repairError);
          structuredDraft = buildStructuredPlanFallback(rawPlanOutput, record);
        }
      }
      structuredDraft = { ...structuredDraft, acceptedPlanText: buildAcceptedPlanTextFromStructuredDraft(structuredDraft) };
      const previewRecord = buildPlanRecordWithStructuredDraft(record, structuredDraft, selectedClient);
      const text = structuredDraft.acceptedPlanText;
      setJourneyPlanStructuredDrafts((prev) => ({ ...prev, [record.id]: structuredDraft }));
      setJourneyPlanDrafts((prev) => ({ ...prev, [record.id]: text }));
      setFlash('AI návrh plánu osobního rozvoje je připravený v detailu záznamu.');
    } catch (error) {
      console.error('Journey plan AI error:', error);
      setJourneyPlanStructuredDrafts((prev) => ({ ...prev, [record.id]: buildStructuredPlanForAi(record) }));
      setJourneyPlanDrafts((prev) => ({ ...prev, [record.id]: buildPersonalDevelopmentPlanText(record, selectedClient) }));
      setFlash('AI návrh se nepodařilo vytvořit. Vložil jsem strukturovaný návrh bez AI.');
    } finally {
      setGeneratingJourneyPlanId('');
    }
  };

  const handleAcceptJourneyPlanDraft = async (record) => {
    const text = cleanGeneratedText(journeyPlanDrafts[record.id] || '');
    if (!text) {
      setFlash('Nejprve vygeneruj nebo doplň návrh plánu.');
      return;
    }
    const structuredDraft = journeyPlanStructuredDrafts[record.id] || {
      ...buildStructuredPlanForAi(record),
      acceptedPlanText: text
    };
    const updatedPlanRecord = buildPlanRecordWithStructuredDraft(record, { ...structuredDraft, acceptedPlanText: text }, selectedClient);
    const ok = await updateExistingRecord(record.id, updatedPlanRecord);
    if (ok) {
      setJourneyPlanDrafts((prev) => ({ ...prev, [record.id]: text }));
      setJourneyPlanStructuredDrafts((prev) => ({ ...prev, [record.id]: updatedPlanRecord }));
      setFlash('Návrh plánu byl přijat a propsán do struktury formuláře v KA02.');
    }
  };

  const editJourneyRecord = (record) => {
    if (!record || record.isSynthetic) return;
    if (!confirmAndResetBeforeViewChange()) return;
    const payload = record.payload || {};
    const clientId = record.clientId || record.clientIds?.[0] || selectedClient?.id || '';

    if (record.entityType === 'plans') {
      setSelectedClientId(clientId);
      setKa02Draft((prev) => ({ ...prev, selectedClientId: clientId }));
      setGeneratorDraft((prev) => ({ ...prev, clientId, linkedPlanGoalId: '', linkedPlanGoalLabel: '' }));
      setEditingGeneratedRecordId('');
      setEditingKa03RecordId('');
      setMainView('ka02');
      setFlash('Individuální plán rozvoje je načtený vlevo v KA02 a můžeš ho upravit.');
      return;
    }

    const generatorKeyByEntityType = {
      consultations: 'consultation',
      debt_cases: 'debt',
      therapy_sessions: 'therapy',
      cv_outputs: 'cv',
      job_simulators: 'simulator'
    };
    const generatorKey = generatorKeyByEntityType[record.entityType];
    if (generatorKey) {
      setEditingGeneratedRecordId(record.id);
      setEditingKa03RecordId('');
      setSelectedClientId(clientId);
      setKa02Draft((prev) => ({ ...prev, selectedClientId: clientId }));
      setGeneratorDraft((prev) => ({
        ...prev,
        selectedKey: generatorKey,
        clientId,
        date: record.activityDate || todayIso(),
        worker: record.worker || prev.worker,
        tpmRecordId: payload.tpmRecordId || prev.tpmRecordId || '',
        linkedPlanGoalId: record.linkedPlanGoalId || payload.linkedPlanGoalId || '',
        linkedPlanGoalLabel: record.linkedPlanGoalLabel || payload.linkedPlanGoalLabel || '',
        ka02StartTime: payload.startTime || '',
        ka02EndTime: payload.endTime || '',
        ka02Place: payload.place || '',
        consultationType: payload.consultationType || prev.consultationType,
        supportArea: payload.supportArea || '',
        kuSupportTypeCode: payload.kuSupportTypeCode || KU_SUPPORT_DEFAULT_CODE,
        supportSpecific: payload.supportSpecific || {},
        topics: payload.topics || '',
        outcome: payload.outcome || '',
        nextSteps: payload.nextSteps || payload.progressSummary || '',
        selectedPartnerIds: payload.selectedPartnerIds || [],
        registeredPartnerNames: payload.registeredPartnerNames || [],
        manualPartnerNames: payload.manualPartnerNames || [],
        partnerNames: payload.partnerNames || (payload.partners ? String(payload.partners).split(';').map((item) => item.trim()).filter(Boolean) : []),
        participantCount: Number(payload.participantCount || 0),
        caseManagementMode: Boolean(payload.caseManagementMode),
        debtSummary: payload.debtSummary || '',
        debtCauses: payload.debtCauses || '',
        debtStage: payload.debtStage || prev.debtStage,
        solutionPlan: payload.solutionPlan || '',
        sessionOrder: String(payload.sessionOrder || prev.sessionOrder || '1'),
        themes: payload.themes || '',
        mentalState: payload.mentalState || '',
        recommendations: payload.recommendations || '',
        targetJob: payload.targetJob || '',
        experience: payload.experience || '',
        skills: payload.skills || '',
        position: payload.position || '',
        feedback: payload.feedback || '',
        strengths: payload.strengths || '',
        developmentAreas: payload.developmentAreas || '',
        workplace: payload.workplace || '',
        barriers: payload.barriers || '',
        generatedText: record.documentText || ''
      }));
      setGeneratedText(record.documentText || '');
      setLastGeneratedText(record.documentText || '');
      setGenerationNotice('Záznam byl načten k úpravě. Po uložení se aktualizuje původní záznam.');
      setAiGenerationStatus('idle');
      setMainView('ka02');
      setFlash('Záznam byl načten k úpravě.');
      return;
    }

    if (record.entityType === 'tpm_records' || record.entityType === 'employment_records') {
      const isEmployment = record.entityType === 'employment_records';
      setEditingGeneratedRecordId('');
      setEditingKa03RecordId(record.id);
      setSelectedClientId(clientId);
      setKa03Draft((prev) => ({
        ...prev,
        selectedClientId: clientId,
        tpmClientId: clientId,
        employmentClientId: clientId,
        worker: record.worker || prev.worker,
        employer: payload.employer || '',
        workplace: payload.workplace || '',
        tpmDate: isEmployment ? prev.tpmDate : record.activityDate || payload.startDate || todayIso(),
        startDate: payload.startDate || record.activityDate || prev.startDate,
        endDate: payload.endDate || '',
        plannedMonths: String(payload.plannedMonths ?? prev.plannedMonths),
        actualMonths: String(payload.actualMonths ?? prev.actualMonths),
        employmentDate: isEmployment ? record.activityDate || payload.employmentStartDate || todayIso() : prev.employmentDate,
        employmentStartDate: payload.employmentStartDate || record.activityDate || prev.employmentStartDate,
        employmentEndDate: payload.employmentEndDate || '',
        employmentPlannedMonths: String(payload.employmentPlannedMonths ?? prev.employmentPlannedMonths),
        employmentActualMonths: String(payload.employmentActualMonths ?? prev.employmentActualMonths),
        tpmLinkedPlanGoalId: isEmployment ? prev.tpmLinkedPlanGoalId : record.linkedPlanGoalId || payload.linkedPlanGoalId || '',
        tpmLinkedPlanGoalLabel: isEmployment ? prev.tpmLinkedPlanGoalLabel : record.linkedPlanGoalLabel || payload.linkedPlanGoalLabel || '',
        employmentLinkedPlanGoalId: isEmployment ? record.linkedPlanGoalId || payload.linkedPlanGoalId || '' : prev.employmentLinkedPlanGoalId,
        employmentLinkedPlanGoalLabel: isEmployment ? record.linkedPlanGoalLabel || payload.linkedPlanGoalLabel || '' : prev.employmentLinkedPlanGoalLabel
      }));
      setMainView('ka02');
      setFlash('Záznam byl načten k úpravě.');
      return;
    }

    setFlash('Tento typ záznamu zatím nemá editační formulář.');
  };

  const exportKa01NetworkDocx = async (record) => {
    if (!record) return;
    const payload = record.payload || {};
    const activityType = payload.type || payload.networkType || record.title || 'aktivita';
    const isTeamMeeting = String(activityType).trim().toLocaleLowerCase('cs') === 'porada';
    const generatedText = String(payload.description || record.documentText || '').trim();
    const extractSection = (labelPattern, nextLabelPattern) => {
      const match = generatedText.match(new RegExp(`(?:^|\\n)\\s*(?:${labelPattern}):\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextLabelPattern}):|$)`, 'i'));
      return String(match?.[1] || '').trim();
    };
    const description = extractSection('Popis', 'Výsledek|Úkoly') || String(payload.notes || '').trim() || generatedText || 'Neuvedeno';
    const outcome = String(payload.outcome || '').trim()
      || extractSection('Výsledek|Úkoly', 'Navazující krok|Termín a témata dalšího jednání')
      || 'Neuvedeno';
    const nextSteps = String(payload.nextSteps || '').trim()
      || extractSection('Navazující krok|Termín a témata dalšího jednání', '(?!)')
      || 'Neuvedeno';
    const filenameParts = [record.activityDate || todayIso(), 'KA02', activityType];

    try {
      const response = await fetch('/api/export-record-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `${slugify(filenameParts.join('-'))}.docx`,
          title: isTeamMeeting ? 'KA02 - Zápis z porady realizačního týmu' : (record.title || 'KA02 - aktivita sítě'),
          activityDate: record.activityDate || '',
          ka: 'KA02',
          worker: '',
          text: '',
          rows: [
            { label: 'Datum', value: record.activityDate || '' },
            { label: 'Typ aktivity', value: activityType },
            { label: 'Počet účastníků', value: payload.count ?? '' },
            { label: 'OD', value: payload.startTime || '' },
            { label: 'DO', value: payload.endTime || '' },
            { label: 'Trvání', value: payload.duration || formatDurationFromTimes(payload.startTime, payload.endTime) },
            { label: isTeamMeeting ? 'Přítomní členové realizačního týmu a další osoby' : 'Zapojení aktéři', value: payload.participants || '' },
            { label: 'Místo jednání', value: payload.place || '' },
            { label: 'Popis', value: description },
            { label: isTeamMeeting ? 'Úkoly' : 'Výsledek', value: outcome },
            { label: isTeamMeeting ? 'Termín a témata dalšího jednání' : 'Navazující krok', value: nextSteps }
          ]
        })
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        throw new Error(errorResult.error || 'Export DOCX selhal.');
      }

      const blob = await response.blob();
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `${slugify(filenameParts.join('-'))}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(href);
      setFlash(isTeamMeeting ? 'Zápis z porady byl stažen do DOCX.' : 'Aktivita tvorby sítě byla stažena do DOCX.');
    } catch (error) {
      console.error('KA02 DOCX export error:', error);
      setFlash(error.message || 'Export aktivity tvorby sítě do DOCX selhal.');
    }
  };
  const exportKa01NetworkBulk = async () => {
    let exportRecords = ka01NetworkRecords;
    if (GOOGLE_SHEET_MACRO_URL) {
      try {
        const url = new URL(GOOGLE_SHEET_MACRO_URL, window.location.origin);
        url.searchParams.set('action', 'listNetworkMeetings');
        const response = await fetch(url.toString(), { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok || json.ok === false) throw new Error(json.error || 'Na\u010dten\u00ed aktivit selhalo.');
        const freshRecords = mapSheetRecordsToAppRecords({ networkMeetings: json.networkMeetings || [] }, clientIndex)
          .filter((record) => record.entityType === 'network_activities');
        if (freshRecords.length) exportRecords = freshRecords;
      } catch (error) {
        console.warn('Fresh network export data load failed:', error);
      }
    }
    if (!exportRecords.length) {
      setFlash('Nejsou ulo\u017een\u00e9 \u017e\u00e1dn\u00e9 aktivity tvorby s\u00edt\u011b ke sta\u017een\u00ed.');
      return;
    }

    const escapeExportHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const formatExportTime = (value) => {
      const text = String(value ?? '').trim();
      if (!text) return '';

      if (/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(text)) {
        const totalMinutes = Math.round(Number(text) * 24 * 60) % (24 * 60);
        return String(Math.floor(totalMinutes / 60)).padStart(2, '0')
          + ':'
          + String(totalMinutes % 60).padStart(2, '0');
      }

      const match = text.match(/(?:^|T|\s)([01]?\d|2[0-3])[:.]([0-5]\d)(?::[0-5]\d)?/);
      if (!match) return '';
      return String(Number(match[1])).padStart(2, '0') + ':' + match[2];
    };

    const rows = exportRecords
      .map((record) => {
        const payload = record.payload || {};
        const type = payload.type || payload.networkType || '';
        const startTime = formatExportTime(payload.startTime);
        const endTime = formatExportTime(payload.endTime);
        const duration = formatDurationFromTimes(startTime, endTime);
        const notesAndOutcome = [payload.notes, payload.outcome]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
          .join(' / ');
        const description = payload.description || payload.notes || '';
        return `
          <tr>
            <td>${escapeExportHtml(record.activityDate || '')}</td>
            <td>${escapeExportHtml(type)}</td>
            <td class="time">${escapeExportHtml(startTime)}</td>
            <td class="time">${escapeExportHtml(endTime)}</td>
            <td>${escapeExportHtml(duration)}</td>
            <td>${escapeExportHtml(payload.participants || '')}</td>
            <td>${escapeExportHtml(payload.place || '')}</td>
            <td>${escapeExportHtml(notesAndOutcome)}</td>
            <td>${escapeExportHtml(description)}</td>
          </tr>`;
      })
      .join('');

    const content = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>KA2 - hromadn\u00fd export aktivit</title>
          <style>
            @page Section1 {
              size: 841.9pt 595.3pt;
              margin: 34pt;
              mso-page-orientation: landscape;
            }
            div.Section1 { page: Section1; }
            body { font-family: Arial, sans-serif; color: #1e293b; }
            table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 9pt; }
            th, td { padding: 5px; border: 1px solid #cbd5e1; vertical-align: top; overflow-wrap: anywhere; }
            th { background: #f8fafc; text-align: left; }
            td.time { white-space: nowrap; text-align: center; }
          </style>
        </head>
        <body>
          <div class="Section1">
            <h1 style="margin:0 0 8px;">KA2 - hromadn\u00fd export aktivit</h1>
            <p style="margin:0 0 16px;color:#475569;">Po\u010det z\u00e1znam\u016f: ${exportRecords.length}</p>
            <table>
              <colgroup>
                <col style="width:8%;" />
                <col style="width:11%;" />
                <col style="width:5%;" />
                <col style="width:5%;" />
                <col style="width:8%;" />
                <col style="width:17%;" />
                <col style="width:10%;" />
                <col style="width:17%;" />
                <col style="width:19%;" />
              </colgroup>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Typ aktivity</th>
                  <th>OD</th>
                  <th>DO</th>
                  <th>Trv\u00e1n\u00ed</th>
                  <th>Zapojen\u00ed akt\u00e9\u0159i</th>
                  <th>M\u00edsto setk\u00e1n\u00ed</th>
                  <th>Obsah / v\u00fdsledek</th>
                  <th>Popis aktivity</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </body>
      </html>`;

    downloadHtmlDocument(content, `ka02-hromadny-export-${todayIso()}.doc`);
    setFlash('Hromadn\u00fd export aktivit KA02 byl sta\u017een.');
  };

  const exportMonitoringBundle = () => {
    const content = buildMonitoringBundleHtml({
      indicators: computedIndicators,
      records: filteredRecords,
      clients
    });
    downloadHtmlDocument(content, 'souhrnna-monitorovaci-dokumentace.doc');
  };

  const kuStatisticsOverview = useMemo(
    () => isReportingViewActive
      ? buildKuStatisticsOverview(statisticsRows, statisticsFilters)
      : { rows: [], groups: {}, totalUniqueClients: 0, totalRecords: 0, dateFrom: '', dateTo: '' },
    [isReportingViewActive, statisticsRows, statisticsFilters]
  );

  const hasValidKuStatisticsDateRange = Boolean(statisticsFilters.dateFrom && statisticsFilters.dateTo)
    && parseDateForSort(statisticsFilters.dateFrom) <= parseDateForSort(statisticsFilters.dateTo);

  const handleExportKuStatisticsDocx = async () => {
    if (!hasValidKuStatisticsDateRange) {
      setFlash('Vyber datum od a datum do pro statistiku KÚ.');
      return;
    }
    setIsExportingKuStatistics(true);
    try {
      const response = await fetch('/api/export-record-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `statistika-ku-${statisticsFilters.dateFrom}-${statisticsFilters.dateTo}.docx`,
          title: 'Statistika pro KÚ',
          rows: [
            { label: 'Datum od', value: formatDateLabel(statisticsFilters.dateFrom) },
            { label: 'Datum do', value: formatDateLabel(statisticsFilters.dateTo) },
            { label: 'Počet unikátních osob', value: kuStatisticsOverview.totalUniqueClients },
            { label: 'Počet statistických záznamů', value: kuStatisticsOverview.totalRecords }
          ],
          text: buildKuStatisticsDocumentText(kuStatisticsOverview)
        })
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        throw new Error(errorResult.error || 'Export statistiky KÚ selhal.');
      }

      const blob = await response.blob();
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `statistika-ku-${statisticsFilters.dateFrom}-${statisticsFilters.dateTo}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(href);
      setFlash('Statistika pro KÚ byla stažena do DOCX.');
    } catch (error) {
      console.error('KU statistics DOCX export error:', error);
      setFlash(error.message || 'Export statistiky KÚ selhal.');
    } finally {
      setIsExportingKuStatistics(false);
    }
  };

  const handleGenerateZorTexts = async () => {
    if (!selectedReportingPeriod || selectedReportingPeriod.value === 'all') {
      setFlash('Nejprve vyber konkrétní vykazované období.');
      return;
    }

    setIsGeneratingZor(true);
    const kaTexts = buildZorTexts(periodRecordsForZor);
    const horizontalPrinciplesTexts = buildHorizontalPrinciplesTexts();
    const horizontalContext = Object.entries(kaTexts)
      .map(([title, text]) => `${title}:\n${text}`)
      .join('\n\n');
    let aiTextCount = 0;
    try {
      const aiModel = DEFAULT_AI_MODEL;
      const results = await Promise.allSettled(Object.entries(horizontalPrinciplesTexts).map(async ([title, fallbackText]) => {
        const response = await fetchGemini(aiModel, {
          contents: [{ role: 'user', parts: [{ text: buildHorizontalPrincipleAiPrompt({
            periodLabel: selectedReportingPeriod.label,
            title,
            text: fallbackText,
            contextText: horizontalContext
          }) }] }],
          systemInstruction: {
            parts: [{ text: `${AI_SAFETY_BASE}\nVytváříš pouze anonymizovaný text do zprávy o realizaci. Nepřidávej žádné nedoložené skutečnosti a vrať jen výsledný odstavec bez nadpisu.` }]
          },
          generationConfig: { temperature: 0.15, maxOutputTokens: 700 }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error?.message || `AI text pro téma „${title}“ se nepodařilo vytvořit.`);
        const aiText = cleanGeneratedText(extractGeminiText(result)).trim();
        if (aiText.length < 200 || aiText.length > ZOR_TEXT_MAX_LENGTH) {
          throw new Error(`AI text pro téma „${title}“ nemá povolenou délku.`);
        }
        return { title, text: aiText };
      }));
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          horizontalPrinciplesTexts[result.value.title] = result.value.text;
          aiTextCount += 1;
        } else {
          console.warn('ZOR horizontal principle AI fallback:', result.reason);
        }
      });
    } catch (error) {
      console.warn('ZOR horizontal principles AI fallback:', error);
    } finally {
      setZorTexts({
        periodLabel: selectedReportingPeriod.label,
        generatedAt: new Date().toISOString(),
        texts: {
          ...kaTexts,
          ...Object.fromEntries(Object.entries(horizontalPrinciplesTexts).map(([title, text]) => [
            `Horizontální principy – ${title}`,
            text
          ]))
        }
      });
      setFlash(
        aiTextCount === Object.keys(horizontalPrinciplesTexts).length
          ? `Texty pro ZOR včetně dvou AI textů horizontálních témat byly připraveny za období ${selectedReportingPeriod.label}.`
          : aiTextCount > 0
            ? `Texty pro ZOR byly připraveny za období ${selectedReportingPeriod.label}. Jedno horizontální téma upravila AI, druhé používá bezpečný pracovní text.`
            : `Texty pro ZOR byly připraveny za období ${selectedReportingPeriod.label}. Horizontální témata používají bezpečné pracovní texty bez AI.`
      );
      setIsGeneratingZor(false);
    }
  };

  const viewTheme = VIEW_THEMES[mainView] || VIEW_THEMES.clients;

  return (
    <div className={`relative min-h-screen overflow-hidden text-slate-800 transition-colors duration-500 ${viewTheme.page}`}>
      <IdleFlyScreensaver />
      <div className={`pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full blur-3xl ${viewTheme.accent}`} />
      <div className="pointer-events-none absolute right-[-8rem] top-[22rem] h-96 w-96 rounded-full bg-white/35 blur-3xl" />
      <header className={`sticky top-0 z-10 border-b shadow-sm shadow-black/5 backdrop-blur-xl transition-colors duration-500 ${viewTheme.header}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_80px_auto] lg:items-center">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${viewTheme.label}`}>Projektové výkaznictví</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">PODPORA SOCIÁLNÍ PRÁCE V MORAVSKÉM BEROUNĚ II</h1>
              {goalAlertsVisible && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 shadow-sm">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => setGoalAlertsExpanded((value) => !value)}
                      className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left font-semibold"
                      title="Zobrazit detail cílů k vyhodnocení"
                    >
                      <span>
                        Ke kontrole: {goalDeadlineAlerts.approaching.length} {goalDeadlineAlerts.approaching.length === 1 ? 'cíl se blíží' : goalDeadlineAlerts.approaching.length >= 2 && goalDeadlineAlerts.approaching.length <= 4 ? 'cíle se blíží' : 'cílů se blíží'} k termínu
                        {goalDeadlineAlerts.overdue.length > 0 ? `, ${goalDeadlineAlerts.overdue.length} ${goalDeadlineAlerts.overdue.length === 1 ? 'cíl je' : goalDeadlineAlerts.overdue.length >= 2 && goalDeadlineAlerts.overdue.length <= 4 ? 'cíle jsou' : 'cílů je'} po termínu bez vyhodnocení` : ''}.
                      </span>
                      <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${goalAlertsExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={dismissGoalAlerts}
                      className="rounded p-0.5 text-amber-700 transition hover:bg-amber-100 hover:text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      title="Skrýt toto upozornění do změny informací"
                      aria-label="Skrýt upozornění na termíny cílů"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {!goalAlertsExpanded && goalAlertPreviewItems.length > 0 && (
                    <p className="mt-1 text-[11px] text-amber-800">
                      {goalAlertPreviewItems.map((item) => `${item.clientName} – ${formatDateLabel(item.deadline)}`).join('; ')}
                      {goalDeadlineAlerts.total > goalAlertPreviewItems.length ? `; … a další ${goalDeadlineAlerts.total - goalAlertPreviewItems.length}` : ''}
                    </p>
                  )}
                  {goalAlertsExpanded && (
                    <div className="mt-2 grid gap-2 text-[11px] md:grid-cols-2">
                      <div>
                        <div className="font-bold text-amber-950">Blíží se termín cíle</div>
                        {goalDeadlineAlerts.approaching.length ? (
                          <ul className="mt-1 space-y-1">
                            {goalDeadlineAlerts.approaching.slice(0, 6).map((item) => (
                              <li key={`soon-${item.clientId}-${item.deadline}-${item.goalLabel}`} className="rounded-md bg-white/70 px-2 py-1">
                                <strong>{item.clientName}</strong> – {formatDateLabel(item.deadline)} ({item.daysUntil === 0 ? 'dnes' : `za ${item.daysUntil} dnů`})<br />
                                <span className="text-amber-800">{item.goalLabel}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-amber-700">Žádné cíle v nejbližších {GOAL_DEADLINE_WARNING_DAYS} dnech.</p>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-amber-950">Po termínu bez vyhodnocení</div>
                        {goalDeadlineAlerts.overdue.length ? (
                          <ul className="mt-1 space-y-1">
                            {goalDeadlineAlerts.overdue.slice(0, 6).map((item) => (
                              <li key={`overdue-${item.clientId}-${item.deadline}-${item.goalLabel}`} className="rounded-md bg-white/70 px-2 py-1">
                                <strong>{item.clientName}</strong> – termín {formatDateLabel(item.deadline)} ({item.daysOverdue} dnů po termínu)<br />
                                <span className="text-amber-800">{item.goalLabel}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-amber-700">Žádné cíle po termínu bez vyhodnocení.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <img
              src={cityLogoImage}
              alt="Znak města Moravský Beroun"
              className="mx-auto h-20 w-auto max-w-[72px] object-contain lg:justify-self-center"
            />
            <div className="flex flex-col gap-2 text-sm lg:justify-self-end">
              {!isAppInstalled && (
                <button
                  type="button"
                  onClick={installApplication}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-100"
                  title={installPrompt ? 'Nainstalovat aplikaci do počítače nebo telefonu' : 'Zobrazit možnost nebo návod k instalaci aplikace'}
                >
                  <Download className="h-4 w-4" />
                  Nainstalovat aplikaci
                </button>
              )}
              {!isAppInstalled && installHelpVisible && (
                <div className="max-w-[300px] rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 shadow-sm" role="status">
                  <p className="font-semibold">Chrome zatím automatické instalační okno nenabídl.</p>
                  <p className="mt-1">V nabídce Chrome <strong>⋮</strong> vyber <strong>Nainstalovat stránku jako aplikaci</strong>. Pokud položka ještě není dostupná, jednou na stránce klikni, nech ji alespoň 30 sekund otevřenou a potom ji obnov.</p>
                </div>
              )}
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500" htmlFor="global-worker-select">
                Pracovník pro aplikaci
              </label>
              <select
                id="global-worker-select"
                value={globalWorker || WORKERS[0]}
                onChange={(event) => setGlobalWorker(event.target.value)}
                className="h-9 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                title="Vybraný pracovník se použije pro nové záznamy v KA01 i KA02."
              >
                {WORKERS.map((worker) => (
                  <option key={worker} value={worker}>{worker}</option>
                ))}
              </select>
              {false && <TopMetric
                label="Stav integrace"
                value={sheetError ?'Sheets fallback' : 'Hybrid aktivní'}
                icon={sheetError ?AlertCircle : CheckCircle2}
                tone={sheetError ?'amber' : 'blue'}
              />}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap gap-2">
              {APP_VIEWS.map((item) => {
                const Icon = item.icon;
                const active = mainView === item.id;
                const navTheme = NAV_THEMES[item.id] || NAV_THEMES.clients;
                return (
                  <button
                    key={item.id}
                    onClick={() => switchMainView(item.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? navTheme.active
                        : navTheme.idle
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </button>
                );
              })}
            </nav>

          </div>
        </div>
      </header>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[70] max-w-[min(92vw,720px)] -translate-x-1/2 rounded-xl border border-slate-300 bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-2xl"
        >
          {statusMessage}
        </div>
      )}

      <main className="relative z-[1] mx-auto max-w-7xl px-4 py-6 md:px-6">
        {sheetError && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>{sheetError}</span>
          </div>
        )}

        {mainView === 'clients' && (
          <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
            <div className="space-y-3">
              <Panel
                title="Klientský registr"
                description=""
                icon={Users}
                action={
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const willOpen = !showClientForm;
                        setClientDraft((prev) => ({ ...prev, keyWorker: prev.keyWorker || (isGarantWorker(currentWorker) ? '' : currentWorker) }));
                        clearSaveButtonNotice('client-create');
                        setShowClientEditForm(false);
                        if (willOpen) setSelectedClientId('');
                        setShowClientForm(willOpen);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <Plus className="h-4 w-4" />
                      {showClientForm ?'Zavřít formulář' : 'Přidat klienta'}
                    </button>
                  </div>
                }
              >
                <div className="mb-3 flex items-center gap-2">
                  <input
                    id="show-all-clients"
                    type="checkbox"
                    checked={showAllClients}
                    onChange={(event) => setShowAllClients(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="show-all-clients" className="text-sm font-semibold text-slate-700">
                    Zobraz všechny klienty
                  </label>
                </div>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Začněte psát příjmení..."
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {saveButtonNotices['client-delete'] && (
                  <div className="mb-3">
                    <SaveInlineNotice notice={saveButtonNotices['client-delete']} />
                  </div>
                )}

                {isLoadingClients && clients.length > 0 && (
                  <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-slate-500" role="status">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Ověřuji změny v Sheetu…
                  </div>
                )}

                {showClientForm && (
                  <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <ClientRegistrationFields draft={clientDraft} setDraft={setClientDraft} compact />
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={handleClientCreate}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        <Save className="h-4 w-4" />
                        Uložit klienta
                      </button>
                      <SaveInlineNotice notice={saveButtonNotices['client-create']} />
                    </div>
                  </div>
                )}

                <div
                  ref={clientRegistryScrollRef}
                  onScroll={rememberClientRegistryScroll}
                  className="client-registry-scroll space-y-2 pr-1.5"
                  aria-label="Seznam klientů"
                >
                  {isLoadingClients && clients.length === 0 ?(
                    <LoadingCard text="Načítám klienty z registru..." />
                  ) : (
                    filteredClientList.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                        {canSeeAllClients
                          ? 'Žádný klient neodpovídá vyhledávání.'
                          : `Pro pozici ${currentWorker} není přiřazen žádný klient.`}
                      </div>
                    ) : filteredClientList.map((client) => {
                      const stats = getClientStats(client.id, records);
                      const active = client.id === selectedClientId;
                      const workerEditLocked = active && showClientEditForm;
                      const showCaseManagementBadge = hasCaseManagementNeed(client) && !handlesCaseManagementDirectly(client.keyWorker);
                      return (
                        <div
                          key={client.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openClient(client.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openClient(client.id);
                            }
                          }}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                            active
                              ?'border-indigo-500 bg-indigo-100 shadow-md ring-2 ring-indigo-300'
                              : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex w-full items-start justify-between gap-2 text-left">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">{client.fullName}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {isGarantWorker(currentWorker) && (
                                <button
                                  type="button"
                                  onClick={(event) => handleClientDelete(client, event)}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  disabled={isSaving || pendingRecordMutationIdsRef.current.has(`client:${client.id}`)}
                                  className="inline-flex h-6 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 text-[10px] font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  title={`Smazat celého klienta ${client.fullName}`}
                                  aria-label={`Smazat celého klienta ${client.fullName}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Smazat
                                </button>
                              )}
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </div>
                          <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
                            {client.rodina
                              ? <MiniBadge icon={Users} label="Rodina" tone="emerald" />
                              : <MiniBadge icon={Database} label={`ID ${client.id}`} tone="slate" />}
                            <label
                              className={`flex min-w-0 items-center gap-1 rounded-full border px-2 py-1 ${
                                workerEditLocked
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                  : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              }`}
                              onClick={(event) => event.stopPropagation()}
                              title={workerEditLocked ? 'Klíčového pracovníka změňte v otevřeném detailu klienta.' : ''}
                            >
                              <User className="h-3.5 w-3.5 shrink-0" />
                              <select
                                value={client.keyWorker || ''}
                                onChange={(event) => handleClientKeyWorkerQuickChange(client, event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                disabled={isSaving || workerEditLocked}
                                className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none disabled:cursor-not-allowed"
                                aria-label={`Klíčový pracovník klienta ${client.fullName}`}
                              >
                                <option value="">Bez klíč. prac.</option>
                                {WORKERS.map((worker) => (
                                  <option key={worker} value={worker}>{worker}</option>
                                ))}
                              </select>
                            </label>
                            <MiniBadge icon={Clock} label={formatSupportMinutes(stats.supportMinutes)} tone="indigo" />
                            {showCaseManagementBadge && <MiniBadge icon={User} label="case" tone="emerald" />}
                            {saveButtonNotices[`client-worker:${client.id}`] && (
                              <div className="col-span-2">
                                <SaveInlineNotice notice={saveButtonNotices[`client-worker:${client.id}`]} />
                              </div>
                            )}
                            {saveButtonNotices[`client-delete:${client.id}`] && (
                              <div className="col-span-2">
                                <SaveInlineNotice notice={saveButtonNotices[`client-delete:${client.id}`]} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Panel>
            </div>

            <div className="space-y-4">
              {selectedClient ?(
                <>
                  <Panel
                    title={selectedClient.fullName}
                    icon={User}
                    className="!border-indigo-400 !bg-indigo-100/70 ring-2 ring-indigo-200/80"
                    action={
                      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                        <button
                          onClick={summarizeClientCase}
                          disabled={isSummarizingCase}
                          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSummarizingCase ?<Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCopy className="h-4 w-4" />}
                          Shrnout zakázku AI
                        </button>
                        <HelpIcon help={HELP.clientsAiSummary} />
                        <button
                          onClick={openClientEditForm}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <User className="h-4 w-4" />
                          Upravit klienta
                        </button>
                      </div>
                    }
                  >
                    {showClientEditForm && (
                      <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                        <ClientRegistrationFields draft={clientEditDraft} setDraft={setClientEditDraft} />
                        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              clearSaveButtonNotice('client-update');
                              setShowClientEditForm(false);
                            }}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Zrušit
                          </button>
                          <button
                            type="button"
                            onClick={handleClientUpdate}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <Save className="h-3.5 w-3.5" />
                            Uložit úpravy
                          </button>
                          <SaveInlineNotice notice={saveButtonNotices['client-update']} />
                        </div>
                      </div>
                    )}
                    {clientCaseSummary && (
                      <div className="mb-2 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-bold text-indigo-900">Souhrn zakázky klienta</div>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(clientCaseSummary, setCopied)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                            >
                              <ClipboardCopy className="h-3.5 w-3.5" />
                              Kopírovat
                            </button>
                            <button
                              type="button"
                              onClick={printClientCaseSummary}
                              title="V tiskovém dialogu lze zvolit také Uložit jako PDF"
                              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Tisk / PDF
                            </button>
                            <button
                              type="button"
                              onClick={exportClientCaseSummaryDocx}
                              disabled={isExportingClientCaseDocx}
                              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isExportingClientCaseDocx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                              DOCX
                            </button>
                          </div>
                        </div>
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{clientCaseSummary}</pre>
                      </div>
                    )}
                    <div className="grid gap-2 xl:grid-cols-[1.55fr_0.85fr]">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {[
                          { key: 'address', icon: MapPin, label: 'Adresa', value: buildAddress(selectedClient) },
                          { key: 'contact', icon: Phone, label: 'Kontakt', value: selectedClient.telefon || selectedClient.email || 'Neuvedeno' },
                          { key: 'case-management', icon: Workflow, label: 'Klient case managementu', value: hasCaseManagementNeed(selectedClient) ? 'ANO' : 'NE' },
                          { key: 'edu', icon: GraduationCap, label: 'Vzdělání', value: selectedClient.vzdelani || 'Neuvedeno' },
                          { key: 'job', icon: Briefcase, label: 'Postavení na trhu práce', value: selectedClient.postaveniNaTrhu || 'Neuvedeno' },
                          { key: 'disadv', icon: AlertCircle, label: 'Znevýhodnění', value: selectedClient.znevyhodneni || 'Neuvedeno' }
                        ].map((item) => (
                          <div key={item.key} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              <item.icon className="h-3 w-3" />
                              <span>{item.label}</span>
                            </div>
                            <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{item.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Projektový stav</div>
                        <div className="mt-1.5 space-y-0.5 text-sm">
                          <DetailRow label="Interní ID" value={selectedClient.id} />
                          <DetailRow label="Status klienta" value={selectedClient.projectStatusLabel} />
                          <DetailRow label="Klíčový pracovník" value={selectedClient.keyWorker || 'Neuvedeno'} />
                          <DetailRow label="Datum vstupu" value={selectedClient.datumVstupu || 'Neuvedeno'} />
                          <DetailRow label="Datum výstupu" value={selectedClient.datumVystupu || 'Neuvedeno'} />
                          <DetailRow label="Situace po ukončení" value={selectedClient.situacePoUkonceni || 'Neuvedeno'} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2">
                      {selectedClientDriveBundle?.payload ?(
                        <div className="grid gap-1.5 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={openClientFolderViewer}
                            className="flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-left transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          >
                            <FolderOpen className="h-4 w-4 shrink-0 text-emerald-700" />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-slate-900">Otevřít složku klienta</span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {selectedClientDriveBundle.payload.clientFolderName || 'Dokumenty klienta'}
                              </span>
                            </span>
                          </button>
                          {selectedClientDriveBundle.payload.monListFileUrl ? (
                            <a
                              href={selectedClientDriveBundle.payload.monListFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 transition hover:border-emerald-300 hover:bg-emerald-50"
                            >
                              <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-700" />
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold text-slate-900">Monitorovací list</span>
                                <span className="block truncate text-[11px] text-slate-500">
                                  {selectedClientDriveBundle.payload.monListFileName || 'Monitorovací list klienta'}
                                </span>
                              </span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-left text-amber-900">
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold">Monitorovací list se připravuje</span>
                                <span className="block text-[11px]">Probíhá automaticky na pozadí.</span>
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-emerald-800">
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          Složka klienta a monitorovací list se připravují automaticky.
                        </div>
                      )}
                    </div>
                  </Panel>

                  <div className="grid gap-4">
                    <Panel title="Podpory podle typu" description="Počet podpor a čas podpory za jednotlivé typy klientských aktivit." icon={BarChart3} help={HELP.clientsSupportHours} className="!border-indigo-400 !bg-indigo-100/70 ring-2 ring-indigo-200/80">
                      {selectedClientSupportBreakdown.byType.length === 0 ?(
                        <EmptyState icon={BarChart3} title="U klienta zatím nejsou evidované žádné podpory." />
                      ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                <tr>
                                  <th className="px-3 py-2 text-left">Typ podpory</th>
                                  <th className="px-3 py-2 text-right">Počet</th>
                                  <th className="px-3 py-2 text-right">Čas</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selectedClientSupportBreakdown.byType.map((item) => (
                                  <tr key={item.key}>
                                    <td className="px-3 py-2 font-medium text-slate-900">{item.label}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{item.count}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{formatSupportMinutes(item.minutes)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-50 font-semibold text-slate-800">
                                <tr>
                                  <td className="px-3 py-2">Celkem</td>
                                  <td className="px-3 py-2 text-right">{selectedClientSupportBreakdown.totalCount}</td>
                                  <td className="px-3 py-2 text-right">{formatSupportMinutes(selectedClientSupportBreakdown.totalMinutes)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </Panel>

                    <Panel
                      title="Klientská osa"
                      icon={History}
                      className="!border-indigo-400 !bg-indigo-100/70 ring-2 ring-indigo-200/80"
                      action={
                        <button
                          type="button"
                          onClick={exportSelectedJourneyRecords}
                          disabled={selectedJourneyPrintIds.length === 0}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <Printer className="h-4 w-4" />
                          Tisk vybraných záznamů ({selectedJourneyPrintIds.length})
                        </button>
                      }
                    >
                      {recordDeleteNotice?.clientId === selectedClient.id && (
                        <div className="mb-3">
                          <SaveInlineNotice notice={recordDeleteNotice} />
                        </div>
                      )}
                      <div className="mb-3 grid gap-3 md:grid-cols-3">
                        <InfoCard icon={History} label="Položky na ose" value={String(clientJourneyTimeline.length)} />
                        <InfoCard icon={Clock} label="Čas podpory" value={formatSupportMinutes(getClientStats(selectedClient.id, clientJourneyTimeline).supportMinutes)} />
                        <InfoCard icon={Target} label="Dokumenty" value={String(clientJourneyTimeline.filter((record) => Boolean(record.documentText)).length)} />
                      </div>
                      <div className="space-y-3">
                        {clientJourneyTimeline.length === 0 ?(
                          <EmptyState icon={FileText} title="Klient zatím nemá žádné uložené kroky v KA1 ani KA2." />
                        ) : (
                          clientJourneyTimeline.map((record, index) => {
                            const meta = getClientJourneyMeta(record);
                            const tone = JOURNEY_TONE_CLASSES[meta.tone] || JOURNEY_TONE_CLASSES.slate;
                            const Icon = meta.icon;
                            const summary = buildClientJourneySummary(record);
                            const detail = buildClientJourneyDetail(record, selectedClient);
                            const isExpanded = expandedJourneyRecordIds.includes(record.id);

                            return (
                              <div key={record.id} className="grid gap-2 md:grid-cols-[72px_96px_24px_minmax(0,1fr)] md:items-start">
                                <div className="flex justify-start pt-0.5">
                                  <label className={`flex min-h-12 w-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide shadow-sm transition ${record.isSynthetic ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-55' : selectedJourneyPrintIds.includes(record.id) ? 'cursor-pointer border-slate-900 bg-slate-900 text-white' : 'cursor-pointer border-slate-300 bg-white text-slate-600 hover:border-slate-500 hover:bg-slate-50'}`} title={record.isSynthetic ? 'Zařazení klienta není samostatný tisknutelný zápis.' : 'Zařadit zápis do společného tisku'}>
                                    <span className="inline-flex items-center gap-1">
                                      <Printer className="h-3 w-3" />
                                      Tisk
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={selectedJourneyPrintIds.includes(record.id)}
                                      disabled={record.isSynthetic}
                                      onChange={() => toggleJourneyPrintSelection(record.id)}
                                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                    />
                                  </label>
                                </div>
                                <div className="pt-1 text-xs font-semibold text-slate-500">{formatDateLabel(record.activityDate)}</div>
                                <div className="relative flex h-full justify-center">
                                  <div className={`relative z-[1] mt-1 h-6 w-6 rounded-full border-4 border-white shadow-sm ${tone.dot}`} />
                                  {index < clientJourneyTimeline.length - 1 && (
                                    <div className="absolute top-8 h-[calc(100%+1.5rem)] w-px bg-slate-200" />
                                  )}
                                </div>
                                <div className={`rounded-xl border p-3 shadow-sm ${tone.panel}`}>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone.badge}`}>
                                          {meta.stage}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                          {meta.label}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex items-start gap-2">
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.badge}`}>
                                          <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-sm font-bold text-slate-900">{record.title || meta.label}</div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-nowrap items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedJourneyRecordIds((prev) =>
                                            prev.includes(record.id) ?prev.filter((item) => item !== record.id) : [...prev, record.id]
                                          )
                                        }
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
                                      >
                                        <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ?'rotate-90' : ''}`} />
                                        {isExpanded ?'Skrýt' : 'Detail'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => exportJourneyRecord(record)}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
                                      >
                                        <Download className="h-3 w-3" />
                                        Stáhnout
                                      </button>
                                      {!record.isSynthetic && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => deleteRecord(record)}
                                            disabled={isSaving}
                                            className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                          >
                                            Smazat
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => editJourneyRecord(record)}
                                            disabled={isSaving}
                                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                                          >
                                            <Pencil className="h-3 w-3" />
                                            Upravit
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3 rounded-xl border border-white/70 bg-white/80 p-3 text-sm leading-snug text-slate-700">
                                    {summary}
                                  </div>
                                  {isExpanded && (
                                    <div className="mt-2 space-y-3">
                                      <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800">
                                        {detail}
                                      </div>
                                      {record.entityType === 'plans' && !record.isSynthetic && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                              <div className="text-sm font-bold text-amber-950">AI návrh plánu osobního rozvoje</div>
                                              <div className="text-xs text-amber-800">Návrh se po přijetí uloží zpět do stejného záznamu plánu v KA02.</div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                type="button"
                                                onClick={() => handleGenerateJourneyPlanDraft(record)}
                                                disabled={generatingJourneyPlanId === record.id || isSaving}
                                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-indigo-700 disabled:opacity-60"
                                              >
                                                {generatingJourneyPlanId === record.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                                Vygenerovat návrh
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleAcceptJourneyPlanDraft(record)}
                                                disabled={isSaving || !String(journeyPlanDrafts[record.id] || '').trim()}
                                                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                              >
                                                <Save className="h-3.5 w-3.5" />
                                                Přijmout návrh
                                              </button>
                                            </div>
                                          </div>
                                          <textarea
                                            value={journeyPlanDrafts[record.id] ?? buildPersonalDevelopmentPlanText(record, selectedClient)}
                                            onChange={(event) => setJourneyPlanDrafts((prev) => ({ ...prev, [record.id]: event.target.value }))}
                                            rows={14}
                                            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Panel>

                    {false && (
                    <Panel title="Projektové aktivity klienta" icon={History}>
                      <div className="space-y-3">
                        {clientTimeline.length === 0 ?(
                          <EmptyState icon={FileText} title="Klient zatím nemá žádné uložené aktivity." />
                        ) : (
                          clientTimeline.map((record) => (
                            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="text-sm font-bold text-slate-900">{record.title}</div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {record.activityDate || 'Bez data'} · {record.ka || 'Bez KA'} · {record.worker || 'Bez pracovníka'}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                                    {record.entityType}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteRecord(record)}
                                    disabled={isSaving}
                                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                  >
                                    Smazat
                                  </button>
                                </div>
                              </div>
                              {record.documentText && (
                                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                                  {truncate(record.documentText, 360)}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </Panel>
                    )}

                    {false && (
                    <Panel title="Generátor dokumentů" description="Dokument se vždy ukládá spolu se strukturovanou aktivitou." icon={Sparkles}>
                      <div className="space-y-4">
                        <SelectField
                          label="Typ dokumentu"
                          value={generatorDraft.selectedKey}
                          onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, selectedKey: value }))}
                          options={Object.entries(REPORT_PROMPTS).map(([key, value]) => ({ value: key, label: value.label }))}
                        />
                        <SelectField
                          label="Klient"
                          value={generatorDraft.clientId}
                          onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, clientId: value }))}
                          options={clients.map((client) => ({ value: client.id, label: client.fullName }))}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InputField label="Datum aktivity" value={generatorDraft.date} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, date: value }))} />
                          <SelectField
                            label="Pracovník"
                            value={generatorDraft.worker}
                            onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, worker: value }))}
                            options={WORKERS.map((worker) => ({ value: worker, label: worker }))}
                          />
                        </div>

                        {generatorDraft.selectedKey === 'plan' && (
                          <>
                            <TextAreaField label="Výchozí situace" value={generatorDraft.currentSituation} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, currentSituation: value }))} />
                            <TextAreaField label="Cíle" value={generatorDraft.goals} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, goals: value }))} />
                            <TextAreaField label="Bariéry" value={generatorDraft.barriers} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, barriers: value }))} />
                            <TextAreaField label="Plánované kroky" value={generatorDraft.plannedSteps} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, plannedSteps: value }))} />
                            <InputField label="Čas podpory (min)" value={generatorDraft.planDurationMinutes} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, planDurationMinutes: value }))} />
                          </>
                        )}

                        {generatorDraft.selectedKey === 'consultation' && (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <SelectField
                                label="Typ konzultace"
                                value={generatorDraft.consultationType}
                                onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, consultationType: value }))}
                                options={[
                                  { value: 'z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed', label: 'z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed' },
                                  { value: 'Dluhové poradenství', label: 'Dluhové poradenství' },
                                  { value: 'Motivační podpora', label: 'Motivační podpora' }
                                ]}
                              />
                              <InputField label="Délka (min)" value={generatorDraft.durationMinutes} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, durationMinutes: value }))} />
                            </div>
                            <TextAreaField label="Témata" value={generatorDraft.topics} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, topics: value }))} />
                            <TextAreaField label="Vyhodnocení" value={generatorDraft.outcome} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, outcome: value }))} />
                            <TextAreaField label="Další kroky" value={generatorDraft.nextSteps} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, nextSteps: value }))} />
                          </>
                        )}

                        {generatorDraft.selectedKey === 'debt' && (
                          <>
                            <TextAreaField label="Mapované závazky" value={generatorDraft.debtSummary} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, debtSummary: value }))} />
                            <TextAreaField label="Příčiny předlužení" value={generatorDraft.debtCauses} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, debtCauses: value }))} />
                            <InputField label="Fáze řešení" value={generatorDraft.debtStage} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, debtStage: value }))} />
                            <TextAreaField label="Návrh řešení" value={generatorDraft.solutionPlan} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, solutionPlan: value }))} />
                          </>
                        )}

                        {generatorDraft.selectedKey === 'therapy' && (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <InputField label="Pořadí setkání" value={generatorDraft.sessionOrder} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, sessionOrder: value }))} />
                              <InputField label="Délka (min)" value={generatorDraft.durationMinutes} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, durationMinutes: value }))} />
                            </div>
                            <TextAreaField label="Témata" value={generatorDraft.themes} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, themes: value }))} />
                            <TextAreaField label="Psychický stav" value={generatorDraft.mentalState} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, mentalState: value }))} />
                            <TextAreaField label="Doporučení" value={generatorDraft.recommendations} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, recommendations: value }))} />
                          </>
                        )}

                        {generatorDraft.selectedKey === 'cv' && (
                          <>
                            <InputField label="Cílová pozice" value={generatorDraft.targetJob} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, targetJob: value }))} />
                            <InputField label="Čas podpory tvorby CV (min)" value={generatorDraft.cvDurationMinutes} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, cvDurationMinutes: value }))} />
                            <TextAreaField label="Zkušenosti" value={generatorDraft.experience} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, experience: value }))} />
                            <TextAreaField label="Dovednosti" value={generatorDraft.skills} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, skills: value }))} />
                          </>
                        )}

                        {generatorDraft.selectedKey === 'simulator' && (
                          <>
                            <InputField label="Simulovaná pozice" value={generatorDraft.position} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, position: value }))} />
                            <TextAreaField label="Průběh a výkon" value={generatorDraft.feedback} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, feedback: value }))} />
                            <TextAreaField label="Silné stránky" value={generatorDraft.strengths} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, strengths: value }))} />
                            <TextAreaField label="Rozvojové oblasti" value={generatorDraft.developmentAreas} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, developmentAreas: value }))} />
                          </>
                        )}

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={handleGenerateText}
                            disabled={isGenerating}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {isGenerating ?<Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Vygenerovat návrh
                          </button>
                          <button
                            onClick={handleSaveGeneratedOutput}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isSaving ? 'Ukládám…' : generatorDraft.selectedKey === 'consultation' ? 'Uložit výkon' : 'Uložit dokument'}
                          </button>
                          <SaveInlineNotice notice={saveNotice} />
                          <button
                            onClick={() => copyToClipboard(generatedText, setCopied)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <ClipboardCopy className="h-4 w-4" />
                            {copied ?'Zkopírováno' : 'Kopírovat'}
                          </button>
                        </div>

                        {generationNotice && (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                            {generationNotice}
                          </div>
                        )}

                        {false && generatedText && (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Náhled vygenerovaného textu
                            </div>
                            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-relaxed text-slate-800">
                              {generatedText}
                            </div>
                          </div>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-2 text-sm font-semibold text-slate-700">Výstup dokumentu</div>
                          <textarea
                            value={generatedText}
                            onChange={(event) => {
                              setGeneratedText(event.target.value);
                              setGeneratorDraft((prev) => ({ ...prev, generatedText: event.target.value }));
                            }}
                            rows={24}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Po vygenerování nebo ručním dopsání se zde zobrazí text dokumentu."
                          />
                        </div>
                      </div>
                    </Panel>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState icon={Users} title="Vyber klienta ze seznamu vlevo." />
              )}
            </div>
          </div>
        )}

        {mainView === 'ka2case' && (
          <React.Suspense fallback={<LazyViewFallback />}>
            <Ka2CaseManagementView
              clients={clientSelectionPool}
              records={records}
              onSaveRecord={saveRecord}
              onUpdateRecord={updateExistingRecord}
              ka02Draft={ka02Draft}
              setKa02Draft={setKa02Draft}
              onSelectedClientChange={setSelectedClientId}
              setGeneratorDraft={setGeneratorDraft}
              renderAiDocumentPanel={renderAiDocumentPanel}
              computedIndicators={computedIndicators}
            />
          </React.Suspense>
        )}

        {mainView === 'ka01' && (
          <React.Suspense fallback={<LazyViewFallback />}>
            <Ka01View
              ka01Draft={ka01Draft}
              setKa01Draft={setKa01Draft}
              ka01ActorDraft={ka01ActorDraft}
              setKa01ActorDraft={setKa01ActorDraft}
              ka01ActorOptions={ka01ActorOptions}
              ka01ActorCustomValue={KA01_ACTOR_CUSTOM}
              updateKa01ActorEntry={updateKa01ActorEntry}
              ka01PlaceOptions={KA01_PLACE_OPTIONS}
              ka01PlaceCustomValue={KA01_PLACE_CUSTOM}
              updateKa01PlaceSelection={updateKa01PlaceSelection}
              updateKa01PlaceCustom={updateKa01PlaceCustom}
              clients={accessibleClients}
              handleSaveKa01Assessment={handleSaveKa01Assessment}
              isSaving={isSaving}
              ka01NetworkDuration={ka01NetworkDuration}
              ka01StartTimeSuggestions={ka01StartTimeSuggestions}
              ka01EndTimeSuggestions={ka01EndTimeSuggestions}
              editingKa01NetworkRecordId={editingKa01NetworkRecordId}
              handleGenerateKa01NetworkDescription={handleGenerateKa01NetworkDescription}
              handleSaveKa01Network={handleSaveKa01Network}
              handleSaveKa01ActorRegistry={handleSaveKa01ActorRegistry}
              networkSaveNotice={saveButtonNotices.network}
              actorSaveNotice={saveButtonNotices.actor}
              setKa01ActorAttendanceContacts={setKa01ActorAttendanceContacts}
              ka01AttendanceSelection={ka01AttendanceSelection}
              exportKa01AttendanceSheet={exportKa01AttendanceSheet}
              handleEditKa01ActorRegistry={handleEditKa01ActorRegistry}
              cancelKa01ActorRegistryEdit={cancelKa01ActorRegistryEdit}
              exportKa01NetworkBulk={exportKa01NetworkBulk}
              ka01NetworkTimeError={ka01NetworkTimeError}
              cancelKa01NetworkEdit={cancelKa01NetworkEdit}
              ka01NetworkRecords={ka01NetworkRecords}
              ka01ActorRegistryRecords={ka01ActorRegistryRecords}
              expandedKa01NetworkRecordIds={expandedKa01NetworkRecordIds}
              toggleKa01NetworkDescription={toggleKa01NetworkDescription}
              exportKa01NetworkDocx={exportKa01NetworkDocx}
              handleEditKa01Network={handleEditKa01Network}
              deleteRecord={deleteRecord}
              recordDeleteNotice={recordDeleteNotice}
              computedIndicators={computedIndicators}
              formatDurationFromTimes={formatDurationFromTimes}
            />
          </React.Suspense>
        )}

        {mainView === 'ka02' && (
          <React.Suspense fallback={<LazyViewFallback />}>
            <Ka02View
              clients={clientSelectionPool}
              records={records}
              onSaveRecord={saveRecord}
              onUpdateRecord={updateExistingRecord}
              ka02Draft={ka02Draft}
              setKa02Draft={setKa02Draft}
              onSelectedClientChange={setSelectedClientId}
              setGeneratorDraft={setGeneratorDraft}
              renderAiDocumentPanel={renderAiDocumentPanel}
              ka02AiDocumentKeys={KA02_AI_DOCUMENT_KEYS}
              computedIndicators={computedIndicators}
            />
          </React.Suspense>
        )}

        {mainView === 'education' && (
          <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
            <div className="space-y-4">
              <Panel title="Vzdělávání" icon={GraduationCap}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <InputField label="Datum" type="date" value={educationDraft.date} onChange={(value) => setEducationDraft((prev) => ({ ...prev, date: value }))} />
                  <InputField label="Počet hodin" help={{ title: 'Počet hodin', text: 'Hodinou se myslí 60 minut.' }} value={educationDraft.hours} onChange={(value) => setEducationDraft((prev) => ({ ...prev, hours: value }))} placeholder="např. 8" />
                  <InputField label="Název vzdělávání" value={educationDraft.title} onChange={(value) => setEducationDraft((prev) => ({ ...prev, title: value }))} />
                  <InputField label="Číslo akreditace" value={educationDraft.accreditationNumber} onChange={(value) => setEducationDraft((prev) => ({ ...prev, accreditationNumber: value }))} />
                  <SelectField label="Pracovník 1" value={educationDraft.worker1} onChange={(value) => setEducationDraft((prev) => ({ ...prev, worker1: value }))} options={WORKERS.map((worker) => ({ value: worker, label: worker }))} />
                  <SelectField label="Pracovník 2" value={educationDraft.worker2} onChange={(value) => setEducationDraft((prev) => ({ ...prev, worker2: value }))} options={[{ value: '', label: 'Nevyplněno' }, ...WORKERS.map((worker) => ({ value: worker, label: worker }))]} />
                  <SelectField label="Pracovník 3" value={educationDraft.worker3} onChange={(value) => setEducationDraft((prev) => ({ ...prev, worker3: value }))} options={[{ value: '', label: 'Nevyplněno' }, ...WORKERS.map((worker) => ({ value: worker, label: worker }))]} />
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={handleSaveEducation} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
                      <Save className="h-4 w-4" />
                      Uložit vzdělávání
                    </button>
                    <SaveInlineNotice notice={saveButtonNotices.education} />
                  </div>
                </div>
              </Panel>

              <Panel title="Uložená vzdělávání" icon={FileSpreadsheet}>
                {recordDeleteNotice?.entityType === 'education_records' && (
                  <div className="mb-3"><SaveInlineNotice notice={recordDeleteNotice} /></div>
                )}
                {educationRecords.length === 0 ? (
                  <EmptyState icon={GraduationCap} title="Zatím není uložena žádná vzdělávací akce." />
                ) : (
                  <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-[900px] w-full divide-y divide-slate-200 text-xs">
                      <thead className="sticky top-0 bg-amber-50 font-semibold uppercase text-amber-800">
                        <tr>
                          <th className="px-2 py-2 text-left">Datum</th>
                          <th className="px-2 py-2 text-left">Počet hodin</th>
                          <th className="px-2 py-2 text-left">Název vzdělávání</th>
                          <th className="px-2 py-2 text-left">Číslo akreditace</th>
                          <th className="px-2 py-2 text-left">Pracovník 1</th>
                          <th className="px-2 py-2 text-left">Pracovník 2</th>
                          <th className="px-2 py-2 text-left">Pracovník 3</th>
                          <th className="px-2 py-2 text-right">Akce</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {educationRecords.map((record) => {
                          const payload = record.payload || {};
                          const workers = Array.isArray(payload.workers) ? payload.workers : [record.worker || payload.worker].filter(Boolean);
                          return (
                            <tr key={record.id} className="even:bg-slate-50/60">
                              <td className="px-2 py-2">{record.activityDate || payload.date || '-'}</td>
                              <td className="px-2 py-2">{payload.hours || '-'}</td>
                              <td className="px-2 py-2 font-semibold">{payload.title || record.title || '-'}</td>
                              <td className="px-2 py-2">{payload.accreditationNumber || '-'}</td>
                              <td className="px-2 py-2">{workers[0] || '-'}</td>
                              <td className="px-2 py-2">{workers[1] || '-'}</td>
                              <td className="px-2 py-2">{workers[2] || '-'}</td>
                              <td className="whitespace-nowrap px-2 py-2 text-right">
                                <button type="button" onClick={() => deleteRecord(record)} disabled={isSaving} className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700 disabled:opacity-50">
                                  Smazat
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>

            <div className="space-y-4">
              <Panel title="Supervize" icon={Brain}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <InputField label="Datum" type="date" value={supervisionDraft.date} onChange={(value) => setSupervisionDraft((prev) => ({ ...prev, date: value }))} />
                  <InputField label="Počet hodin" help={{ title: 'Počet hodin', text: 'Hodinou se myslí 60 minut.' }} value={supervisionDraft.hours} onChange={(value) => setSupervisionDraft((prev) => ({ ...prev, hours: value }))} placeholder="např. 2" />
                  <SelectField label="Typ supervize" value={supervisionDraft.type} onChange={(value) => setSupervisionDraft((prev) => ({ ...prev, type: value, worker2: value === 'individuální' ? '' : prev.worker2, worker3: value === 'individuální' ? '' : prev.worker3 }))} options={SUPERVISION_TYPE_OPTIONS.map((type) => ({ value: type, label: type }))} />
                  <SelectField label="Pracovník 1" value={supervisionDraft.worker1} onChange={(value) => setSupervisionDraft((prev) => ({ ...prev, worker1: value }))} options={WORKERS.map((worker) => ({ value: worker, label: worker }))} />
                  {!isIndividualSupervision && (
                    <>
                      <SelectField label="Pracovník 2" value={supervisionDraft.worker2} onChange={(value) => setSupervisionDraft((prev) => ({ ...prev, worker2: value }))} options={[{ value: '', label: 'Nevyplněno' }, ...WORKERS.map((worker) => ({ value: worker, label: worker }))]} />
                      <SelectField label="Pracovník 3" value={supervisionDraft.worker3} onChange={(value) => setSupervisionDraft((prev) => ({ ...prev, worker3: value }))} options={[{ value: '', label: 'Nevyplněno' }, ...WORKERS.map((worker) => ({ value: worker, label: worker }))]} />
                    </>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={handleSaveSupervision} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
                      <Save className="h-4 w-4" />
                      Uložit supervizi
                    </button>
                    <SaveInlineNotice notice={saveButtonNotices.supervision} />
                  </div>
                </div>
              </Panel>

              <Panel title="Uložené supervize" icon={FileSpreadsheet}>
                {recordDeleteNotice?.entityType === 'supervision_records' && (
                  <div className="mb-3"><SaveInlineNotice notice={recordDeleteNotice} /></div>
                )}
                {supervisionRecords.length === 0 ? (
                  <EmptyState icon={Brain} title="Zatím není uložena žádná supervize." />
                ) : (
                  <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-[900px] w-full divide-y divide-slate-200 text-xs">
                      <thead className="sticky top-0 bg-amber-50 font-semibold uppercase text-amber-800">
                        <tr>
                          <th className="px-2 py-2 text-left">Datum</th>
                          <th className="px-2 py-2 text-left">Počet hodin</th>
                          <th className="px-2 py-2 text-left">Typ supervize</th>
                          <th className="px-2 py-2 text-left">Pracovník 1</th>
                          <th className="px-2 py-2 text-left">Pracovník 2</th>
                          <th className="px-2 py-2 text-left">Pracovník 3</th>
                          <th className="px-2 py-2 text-right">Akce</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supervisionRecords.map((record) => {
                          const payload = record.payload || {};
                          const workers = Array.isArray(payload.workers) ? payload.workers : [];
                          return (
                            <tr key={record.id} className="even:bg-slate-50/60">
                              <td className="px-2 py-2">{record.activityDate || payload.date || '-'}</td>
                              <td className="px-2 py-2">{payload.hours || '-'}</td>
                              <td className="px-2 py-2 font-semibold">{payload.type || record.title || '-'}</td>
                              <td className="px-2 py-2">{workers[0] || '-'}</td>
                              <td className="px-2 py-2">{workers[1] || '-'}</td>
                              <td className="px-2 py-2">{workers[2] || '-'}</td>
                              <td className="whitespace-nowrap px-2 py-2 text-right">
                                <button type="button" onClick={() => deleteRecord(record)} disabled={isSaving} className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700 disabled:opacity-50">
                                  Smazat
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}

        {mainView === 'dashboard' && (
          <React.Suspense fallback={<LazyViewFallback />}>
            <ReportingView
              dashboardOverview={dashboardOverview}
              exportClientsIsEsfCsv={exportClientsIsEsfCsv}
              isEsfExportStatus={isEsfExportStatus}
              isEsfSupportedClientCount={isEsfSupportedClients.length}
              exportSupportsIsEsfCsv={exportSupportsIsEsfCsv}
              isEsfSupportExportStatus={isEsfSupportExportStatus}
              isEsfSupportExportCount={isEsfPersonImportMatch.matchedClients.length}
              isEsfPersonImport={{
                ...isEsfPersonImport,
                expectedCount: isEsfSupportedClients.length,
                matchedCount: isEsfPersonImportMatch.matchedClients.length,
                unmatchedClients: isEsfPersonImportMatch.unmatchedClients,
                ambiguousClients: isEsfPersonImportMatch.ambiguousClients
              }}
              importIsEsfPersonCsv={importIsEsfPersonCsv}
              clearIsEsfPersonCsv={clearIsEsfPersonCsv}
              exportAllRecordsBackup={exportAllRecordsBackup}
              exportDetailedOutputsXlsx={exportDetailedOutputsXlsx}
              isExportingDetailedOutputs={isExportingDetailedOutputs}
              supportExportCount={filteredClientSupportRecords.length}
              analyticsRecords={filteredClientSupportRecords}
              kuStatisticsOverview={kuStatisticsOverview}
              statisticsRowsCount={statisticsRows.length}
              statisticsFilters={statisticsFilters}
              setStatisticsFilters={setStatisticsFilters}
              hasValidKuStatisticsDateRange={hasValidKuStatisticsDateRange}
              handleExportKuStatisticsDocx={handleExportKuStatisticsDocx}
              isExportingKuStatistics={isExportingKuStatistics}
              workReportRecords={records}
              clients={clients}
              onOpenClient={(clientId) => openClient(clientId, 'clients')}
              dashboardFilters={dashboardFilters}
              setDashboardFilters={setDashboardFilters}
              filteredRecords={filteredRecords}
              handleGenerateZorTexts={handleGenerateZorTexts}
              isGeneratingZor={isGeneratingZor}
              zorTexts={zorTexts}
              copyToClipboard={copyToClipboard}
              setCopied={setCopied}
              copied={copied}
              deleteRecord={deleteRecord}
              isSaving={isSaving}
              canManageBackups={canSeeAllClients}
              backupStatus={backupStatus}
              isBackupActionRunning={isBackupActionRunning}
              handleStartFullBackup={handleStartFullBackup}
              handleInstallWeeklyBackup={handleInstallWeeklyBackup}
            />
          </React.Suspense>
        )}

        {clientFolderViewer.open && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-5"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeClientFolderViewer();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="client-folder-viewer-title"
              className="flex h-[min(92vh,820px)] w-[min(98vw,1320px)] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-2xl"
            >
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 shrink-0 text-emerald-700" />
                    <h2 id="client-folder-viewer-title" className="truncate text-base font-bold text-slate-950">
                      Dokumenty klienta · {clientFolderViewer.clientName}
                    </h2>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {clientFolderViewer.folder?.name || 'Načítám obsah klientské složky…'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeClientFolderViewer}
                  aria-label="Zavřít náhled složky"
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              {clientFolderViewer.loading ? (
                <div className="flex flex-1 items-center justify-center gap-3 text-sm font-semibold text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                  Načítám dokumenty…
                </div>
              ) : clientFolderViewer.error ? (
                <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {clientFolderViewer.error}
                </div>
              ) : clientFolderViewer.files.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center text-slate-600">
                  <FolderOpen className="h-10 w-10 text-slate-400" />
                  <p className="font-semibold">Složka zatím neobsahuje žádné dokumenty.</p>
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 grid-rows-[minmax(150px,32vh)_minmax(0,1fr)] lg:grid-cols-[330px_minmax(0,1fr)] lg:grid-rows-1">
                  <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-2 lg:border-b-0 lg:border-r">
                    <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Dokumenty ({clientFolderViewer.files.length})
                    </div>
                    <div className="space-y-1">
                      {clientFolderViewer.files.map((file) => {
                        const FileIcon = file.mimeType === 'application/vnd.google-apps.spreadsheet'
                          ? FileSpreadsheet
                          : FileText;
                        const isSelected = file.id === clientFolderViewer.selectedFileId;
                        return (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => loadClientFolderFilePreview(clientFolderViewer.clientId, file)}
                            className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              isSelected
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                                : 'border-transparent bg-white text-slate-800 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <FileIcon className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block break-words text-xs font-semibold leading-4">{file.name}</span>
                              <span className="mt-0.5 block text-[10px] text-slate-500">
                                {[formatClientFolderFileDate(file.updatedAt), formatClientFolderFileSize(file.size)].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            {file.previewable && <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <div className="flex min-h-0 flex-col bg-slate-100">
                    <div className="flex min-h-[52px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">
                          {selectedClientFolderFile?.name || 'Vyberte dokument'}
                        </div>
                        {selectedClientFolderFile && (
                          <div className="text-[11px] text-slate-500">Náhled pouze pro čtení</div>
                        )}
                      </div>
                      {selectedClientFolderFile?.url && (
                        <a
                          href={selectedClientFolderFile.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Otevřít originál
                        </a>
                      )}
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto p-3">
                      {clientFolderViewer.previewLoading ? (
                        <div className="flex h-full items-center justify-center gap-3 text-sm font-semibold text-slate-600">
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                          Připravuji náhled…
                        </div>
                      ) : clientFolderViewer.previewError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                          {clientFolderViewer.previewError}
                        </div>
                      ) : clientFolderViewer.preview?.type === 'pdf' ? (
                        <iframe
                          title={`Náhled ${clientFolderViewer.preview.name || 'dokumentu'}`}
                          src={clientFolderViewer.preview.dataUrl}
                          className="h-full min-h-[440px] w-full rounded-lg border border-slate-300 bg-white"
                        />
                      ) : clientFolderViewer.preview?.type === 'image' ? (
                        <div className="flex min-h-full items-start justify-center rounded-lg border border-slate-200 bg-white p-3">
                          <img
                            src={clientFolderViewer.preview.dataUrl}
                            alt={clientFolderViewer.preview.name || 'Náhled dokumentu'}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : clientFolderViewer.preview?.type === 'text' ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">
                            {clientFolderViewer.preview.text || 'Dokument je prázdný.'}
                          </pre>
                          {clientFolderViewer.preview.truncated && (
                            <p className="mt-3 border-t border-amber-200 pt-3 text-xs font-semibold text-amber-800">
                              Náhled je zkrácený. Celý dokument otevřete tlačítkem nahoře.
                            </p>
                          )}
                        </div>
                      ) : clientFolderViewer.preview?.type === 'tables' ? (
                        <div className="space-y-3">
                          {(clientFolderViewer.preview.tables || []).map((table) => (
                            <section key={table.name} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                              <h3 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{table.name}</h3>
                              <div className="overflow-auto">
                                <table className="min-w-full border-collapse text-xs">
                                  <tbody>
                                    {(table.rows || []).map((row, rowIndex) => (
                                      <tr key={`${table.name}-${rowIndex}`} className={rowIndex === 0 ? 'bg-slate-50 font-semibold' : ''}>
                                        {row.map((cell, columnIndex) => (
                                          <td key={`${rowIndex}-${columnIndex}`} className="max-w-[320px] border-b border-r border-slate-100 px-2 py-1.5 align-top">
                                            <span className="whitespace-pre-wrap break-words">{cell}</span>
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {table.truncated && (
                                <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                                  Zobrazuje se pouze část rozsáhlého listu.
                                </p>
                              )}
                            </section>
                          ))}
                        </div>
                      ) : clientFolderViewer.preview?.type === 'unavailable' ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                          {clientFolderViewer.preview.message || 'Náhled tohoto dokumentu není dostupný.'}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                          Vyberte dokument vlevo.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
