import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  DownloadCloud,
  FileBadge,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  History,
  Home,
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
  TrendingUp,
  User,
  Users,
  Workflow,
  Brain,
  Printer
} from 'lucide-react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import {
  APP_VIEWS,
  GOOGLE_DRIVE_UPLOAD_URL,
  GOOGLE_SHEET_MACRO_URL,
  REPORTING_PERIODS,
  REPORT_PROMPTS,
  TARGETS,
  WORKERS,
  CLIENT_GENDER_OPTIONS,
  CLIENT_EMPLOYMENT_OPTIONS,
  CLIENT_EDUCATION_OPTIONS,
  CLIENT_DISADVANTAGE_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  YES_NO_OPTIONS,
  emptyClientDraft,
  emptyFilters,
  emptyGeneratorDraft
} from '../config/projectConfig.js';
import {
  CheckboxField,
  CompactMetric,
  DetailRow,
  EmptyState,
  InfoCard,
  InputField,
  LoadingCard,
  MiniBadge,
  Panel,
  SelectField,
  StatCard,
  TextAreaField,
  TopMetric
} from '../components/ui.jsx';
import { appId, auth, db, hasFirebaseConfig } from '../lib/firebase.js';
import AiDocumentPanel from './AiDocumentPanel.jsx';
import sfLogoImage from '../assets/eu-spolufinancovano-logo.png';
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
  buildKa02Record,
  buildKa03Record,
  buildManualClientId,
  buildMonitoringBundleHtml,
  buildRecordHtmlDocument,
  buildSelectedJourneyPrintHtml,
  cleanGeneratedText,
  computedIndicatorsMap,
  copyToClipboard,
  downloadCsv,
  downloadHtmlDocument,
  enrichClient,
  extractGeminiText,
  getClientSupportBreakdown,
  getClientStats,
  getMockClients,
  groupRecordsByType,
  loadLocalRecords,
  mapSheetRowToClient,
  saveLocalRecords,
  slugify,
  todayIso,
  truncate
} from '../lib/projectUtils.js';

const Ka01View = React.lazy(() => import('./Ka01View.jsx'));
const Ka02View = React.lazy(() => import('./Ka02View.jsx'));
const Ka2CaseManagementView = React.lazy(() => import('./Ka2CaseManagementView.jsx'));
const Ka03View = React.lazy(() => import('./Ka03View.jsx'));
const ReportingView = React.lazy(() => import('./ReportingView.jsx'));

const LazyViewFallback = () => (
  <LoadingCard text="Načítám modul..." />
);

const KA02_AI_DOCUMENT_KEYS = ['plan', 'consultation'];
const KA02_STRUCTURED_FORM_KEYS = ['consultation'];
const KA1_SUPPORT_SPECIFIC_SHEET_COLUMNS = [
  ['contactPlace', 'misto_depistaze'],
  ['contactMethod', 'zpusob_kontaktu'],
  ['contactReason', 'duvod_osloveni'],
  ['helpOffered', 'pomoc_nabidnuta'],
  ['counsellingProvided', 'poradenstvi_poskytnuto'],
  ['contactsGiven', 'kontakty_predany'],
  ['cooperationInterest', 'zajem_o_spolupraci'],
  ['mappedAreas', 'hlavni_zjistene_oblasti'],
  ['risks', 'rizika'],
  ['clientResources', 'zdroje_klienta'],
  ['clientNeeds', 'potreby_klienta'],
  ['agreedProcedure', 'dohoda_na_dalsim_postupu'],
  ['counsellingTopic', 'tema_poradenstvi'],
  ['providedInformation', 'poskytnute_informace'],
  ['recommendedProcedure', 'doporuceny_postup'],
  ['fieldWorkPlace', 'misto_vykonu'],
  ['visitPurpose', 'ucel_navstevy'],
  ['clientReaction', 'reakce_klienta'],
  ['nextContactAgreement', 'dohoda_na_dalsim_kontaktu'],
  ['problemType', 'druh_problemu'],
  ['solutionStatus', 'stav_reseni'],
  ['agreedStep', 'domluveny_krok'],
  ['recommendedService', 'doporucena_navazna_sluzba'],
  ['housingSituation', 'typ_bytove_situace'],
  ['housingProblem', 'problem_v_bydleni'],
  ['contactedSubject', 'kontaktovany_subjekt'],
  ['workStatus', 'pracovni_status'],
  ['workTopic', 'resene_tema_prace'],
  ['performedStep', 'provedeny_krok'],
  ['followupSubject', 'navazny_subjekt'],
  ['benefitType', 'druh_davky_rizeni'],
  ['applicationStatus', 'stav_zadosti'],
  ['neededDocuments', 'potrebne_doklady'],
  ['nextStep', 'dalsi_krok_spec'],
  ['familyArea', 'resena_oblast_rodina'],
  ['involvedPersons', 'zapojene_osoby'],
  ['followupNeed', 'potreba_navazne_podpory'],
  ['clientAgreement', 'dohoda_s_klientem'],
  ['healthNeed', 'resena_potreba_zdravi'],
  ['recommendedContact', 'doporuceny_kontakt'],
  ['orderingAssistance', 'asistence_objednani'],
  ['nextProcedure', 'dalsi_postup_zdravi'],
  ['accompanimentPlace', 'kam_doprovod_probehl'],
  ['accompanimentPurpose', 'ucel_doprovodu'],
  ['meetingResult', 'vysledek_jednani'],
  ['institution', 'instituce'],
  ['contactForm', 'forma_kontaktu'],
  ['meetingTopic', 'tema_jednani'],
  ['clientPresent', 'klient_pritomen'],
  ['crisisType', 'typ_krize'],
  ['urgency', 'mira_akutnosti'],
  ['measures', 'prijata_opatreni'],
  ['followupHelp', 'predani_navazne_pomoci'],
  ['contactResult', 'vysledek_kontaktu'],
  ['adminType', 'typ_administrativy'],
  ['documentAction', 'dokument_ukon'],
  ['withClient', 'provedeno_s_klientem'],
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
    if (value) accumulator[key] = value;
    return accumulator;
  }, {});
const KA03_AI_DOCUMENT_KEYS = [];
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
      'Jde o intern\u00ed poradu realiza\u010dn\u00edho t\u00fdmu projektu, nikoli o sch\u016fzku partnersk\u00e9 s\u00edt\u011b.',
      'Zachy\u0165 projednan\u00e1 t\u00e9mata, podstatn\u00e9 z\u00e1v\u011bry a konkr\u00e9tn\u00ed \u00fakoly. U \u00fakol\u016f uve\u010f odpov\u011bdnost a term\u00edn pouze tehdy, jsou-li v datech.',
      'Na konci uve\u010f domluven\u00fd term\u00edn a t\u00e9mata dal\u0161\u00edho jedn\u00e1n\u00ed, pokud byla zad\u00e1na.'
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

const KA02_ACTIVITY_AI_CONTEXT = `
KA02 je zaměřena na poskytování pracovního a dluhového poradenství cílové skupině, včetně motivačních, vzdělávacích a terapeuticko-diagnostických aktivit. Podpora probíhá po celou dobu projektu ambulantní formou v poradně v Dívčím Hradě a Hlinkách, s důrazem na individuální práci, pravidelný kontakt, bezpečné prostředí, důvěru a postupné posilování samostatnosti klienta.

Garant zajišťuje odborný dohled nad metodikou práce, jednotný standard služeb, konzultace poradcům, podporu při složitých případech, koordinaci spolupráce s ÚP, zaměstnavateli, obcemi a SAS, kontrolu kvality individuálních plánů, zpětnou vazbu, monitoring a reporting výsledků poradenství.

Pracovní poradce provádí vstupní diagnostiku, mapuje silné stránky, bariéry a potřeby klienta v oblasti zaměstnání, vzdělání a finanční stability, spolupracuje na tvorbě a aktualizaci individuálního plánu rozvoje, poskytuje kariérové a pracovní poradenství, posiluje motivaci, připravuje klienta na pohovor, podporuje tvorbu CV a motivačního dopisu jako součást podpory, organizuje pracovní simulátor, propojuje klienta se zaměstnavateli, ÚP a institucemi a podporuje udržení pracovního místa.

Dluhový poradce mapuje finanční situaci, závazky, exekuce, příjmy a výdaje, podporuje tvorbu přehledu dluhů, rodinného rozpočtu a realistických splátkových plánů, podporuje jednání s věřiteli, bankami, dodavateli energií, obcemi, úřady a zaměstnavateli, vysvětluje exekuce, insolvenční postupy, finanční gramotnost, rizika neplnění závazků a prevenci dalšího zadlužování.

KA02 pracuje s identifikací zakázky klienta, polostrukturovaným rozhovorem, osobním dotazníkem, mapováním bariér, participativním plánováním, pravidelnou reflexí plánu, motivací ke změně, vzděláváním, základní pracovní, finanční a právní orientací a propojováním pracovních a dluhových témat. Ze všech jednání má vznikat zápis s výstupy daného jednání.

Terapeuticko-diagnostická setkání kombinují pracovní diagnostiku, edukaci a terapeutický přístup. Mají podporovat motivaci, reálné uplatnění na trhu práce, poznání silných stránek, bariér a doporučení pro další podporu bez uvádění nepodložených diagnóz.

Pracovní simulátor zahrnuje přípravu CV a motivačního dopisu, přípravu na pohovor, nácvik pohovoru, modelové výběrové řízení, zpětnou vazbu a propojení s požadavky regionálního trhu práce.

Poradna funguje ambulantně v Dívčím Hradě a Hlinkách. Čtyři dny v týdnu jsou určeny pro běžné poradenské hodiny a jeden den pro individuálně sjednané schůzky, komunikaci s aktéry sítě, návaznou koordinaci, porady a administraci klientských kroků. Pokud vstup obsahuje místo, den nebo návaznost na aktéry, promítni je do věcného kontextu zápisu.

Pracovní a dluhové poradenství se mají chápat jako propojené oblasti podpory. Řešení dluhové a finanční situace pomáhá pracovní stabilizaci a pracovní uplatnění naopak posiluje schopnost klienta řešit závazky. Vzdělávání, rekvalifikace a další odborné kurzy zmiňuj jen tehdy, když jsou relevantní ke konkrétnímu klientovi nebo zadanému kroku.

Výstupy KA02 zahrnují individuální plány rozvoje, individuální konzultace, pracovní a dluhové poradenství, pracovní simulátory, terapeuticko-diagnostická setkání, podporu při vytvoření CV a motivačního dopisu, mapování závazků a splátkové kalendáře. Při generování vždy popisuj konkrétní podporu v souladu se zvoleným typem dokumentu a rolí zvoleného pracovníka. Nevypisuj tento metodický kontext mechanicky do výstupu.
`.trim();

const KA03_ACTIVITY_AI_CONTEXT = `
KA03 je zaměřena na zprostředkování zaměstnání, tréninková pracovní místa a podporu účastníků při adaptaci na pracovišti. Aktivita navazuje na KA02: využívá výsledky mapování, individuální plán, pracovní poradenství, dluhové poradenství a přípravu klienta na vstup nebo návrat na trh práce.

Tréninková pracovní místa slouží k ověření a posílení pracovních návyků, sociálních dovedností, docházky, komunikace, zvládání pracovních povinností a schopnosti udržet pracovní režim. TPM má být popisováno jako chráněnější a průběžně podporované zapojení, nikoli jako běžné pracovní místo bez podpory.

TPM se realizují zpravidla po dobu 3 až 5 měsíců, v rozsahu podle individuálních potřeb klienta, maximálně 80 hodin měsíčně. Projekt počítá se zapojením minimálně 17 účastníků do TPM. Tyto hodnoty používej jen jako metodický rámec; do konkrétní zprávy je uváděj pouze tehdy, když odpovídají zadaným údajům.

Mentor/kouč poskytuje pracovní asistenci, průběžnou podporu na pracovišti, pomoc při zvládání povinností, řešení překážek a konfliktů, plánování času, komunikaci se zaměstnavatelem a předávání informací pracovnímu poradci. Intenzita mentorství se přizpůsobuje potřebám klienta.

Zprostředkované zaměstnání odlišuj od TPM. U zaměstnání popisuj zejména návaznost na předchozí podporu, vhodnost pracovní pozice, domluvené podmínky, rizika udržení, podporu při adaptaci a následné kroky. Nepiš, že klient práci získal, udržel nebo je stabilizovaný, pokud to není doložené ve vstupu.

Výstupy KA03 mají být konkrétní, pracovní a doložitelné: co klient na pracovišti dělal, jaké pracovní návyky nebo dovednosti procvičil, jakou podporu poskytl mentor, co bylo domluveno se zaměstnavatelem a jaký je další realistický krok. Nevypisuj tento metodický kontext mechanicky do výstupu.
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
  'employment_records',
  'mentoring_records'
]);
const CLIENT_JOURNEY_ENTITY_TYPES = new Set([
  'plans',
  'consultations',
  'debt_cases',
  'therapy_sessions',
  'cv_outputs',
  'job_simulators',
  'tpm_records',
  'mentoring_records',
  'employment_records',
  'mentor_report_document'
]);

const CLIENT_JOURNEY_META = {
  project_entry: { stage: 'Vstup', label: 'Zařazení klienta', tone: 'slate', icon: Calendar },
  plans: { stage: 'KA02', label: 'Plán rozvoje', tone: 'blue', icon: Target },
  consultations: { stage: 'KA02', label: 'Konzultace', tone: 'blue', icon: MessageSquare },
  debt_cases: { stage: 'KA02', label: 'Dluhové poradenství', tone: 'blue', icon: Scale },
  therapy_sessions: { stage: 'KA02', label: 'Terapie', tone: 'blue', icon: Brain },
  cv_outputs: { stage: 'KA02', label: 'CV a motivační dopis', tone: 'blue', icon: FileBadge },
  job_simulators: { stage: 'KA02', label: 'Pracovní simulátor', tone: 'blue', icon: Presentation },
  tpm_records: { stage: 'KA03', label: 'TPM', tone: 'amber', icon: Briefcase },
  mentoring_records: { stage: 'KA03', label: 'Mentoring', tone: 'amber', icon: Users },
  employment_records: { stage: 'KA03', label: 'Pracovní uplatnění', tone: 'emerald', icon: Briefcase },
  mentor_report_document: { stage: 'KA03', label: 'Referenční zpráva', tone: 'emerald', icon: FileText }
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
  const dateDiff = parseDateForSort(b.activityDate) - parseDateForSort(a.activityDate);
  if (dateDiff !== 0) return dateDiff;
  const createdDiff = Number(b.createdAt || 0) - Number(a.createdAt || 0);
  if (createdDiff !== 0) return createdDiff;
  if (a.entityType === 'project_entry' && b.entityType !== 'project_entry') return 1;
  if (b.entityType === 'project_entry' && a.entityType !== 'project_entry') return -1;
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

function buildExactGeneratorFacts(config, draft) {
  return [
    'Závazná data z formuláře:',
    `Typ dokumentu: ${config.label}`,
    `KA: ${config.ka}`,
    `Datum aktivity: ${draft.date || todayIso()}`,
    `Pracovník: ${draft.worker || 'Neuvedeno'}`,
    `Délka podpory: ${formatSupportDuration(getGeneratorSupportMinutes(draft))}`,
    '',
    'Tato data ve výstupu použij přesně. Datum ani délku podpory neměň, nepřepisuj a nenahrazuj odhadem.'
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
    plans: record.strengthsAndLimits || payload.strengthsAndLimits || payload.currentSituation || payload.plannedSteps,
    consultations: payload.topics || payload.outcome || payload.nextSteps,
    debt_cases: payload.debtSummary || payload.solutionPlan || payload.educationTopic,
    therapy_sessions: payload.themes || payload.recommendations || payload.mentalState,
    cv_outputs: payload.targetJob || payload.skills || payload.experience,
    job_simulators: payload.position || payload.feedback || payload.committee,
    tpm_records: [payload.employer, payload.workplace].filter(Boolean).join(' • '),
    mentoring_records: payload.progressSummary || payload.nextSupportSteps || payload.barriers,
    employment_records: [payload.employmentType, payload.employmentStatus, payload.sustainabilitySupport].filter(Boolean).join(' • '),
    mentor_report_document: record.documentText
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

function getPlanGoals(planRecord) {
  if (!planRecord) return [];
  if (Array.isArray(planRecord.goals)) return planRecord.goals;
  if (Array.isArray(planRecord.payload?.goals)) return planRecord.payload.goals;
  return [];
}

function normalizePlanGoalForAi(goal, index) {
  return {
    goalId: goal.goalId || goal.id || `goal-${index + 1}`,
    goalDescription: cleanGeneratedText(goal.goalDescription || ''),
    actionSteps: cleanGeneratedText(goal.actionSteps || ''),
    targetDate: formatCaseSummaryDate(goal.targetDate),
    isCompleted: Boolean(goal.isCompleted),
    goalEvaluation: cleanGeneratedText(goal.goalEvaluation || '')
  };
}

function buildStructuredPlanForAi(record) {
  const payload = record.payload || {};
  return {
    strengthsAndLimits: cleanGeneratedText(record.strengthsAndLimits || payload.strengthsAndLimits || ''),
    identifiedBarriers: cleanGeneratedText(record.identifiedBarriers || payload.identifiedBarriers || ''),
    goals: getPlanGoals(record).map(normalizePlanGoalForAi),
    finalEvaluation: cleanGeneratedText(record.finalEvaluation || payload.finalEvaluation || '')
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

  const parsed = JSON.parse(rawText.slice(start, end + 1));
  const sourceGoals = getPlanGoals(sourceRecord);
  const aiGoals = Array.isArray(parsed.goals) ? parsed.goals : [];
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
      isCompleted: Boolean(sourceGoal.isCompleted),
      goalEvaluation: sourceGoal.isCompleted ? cleanGeneratedText(aiGoal.goalEvaluation || sourceGoal.goalEvaluation || '') : sourceGoal.goalEvaluation || ''
    };
  });

  return {
    strengthsAndLimits: cleanGeneratedText(parsed.strengthsAndLimits || sourceRecord.strengthsAndLimits || sourceRecord.payload?.strengthsAndLimits || ''),
    identifiedBarriers: cleanGeneratedText(parsed.identifiedBarriers || sourceRecord.identifiedBarriers || sourceRecord.payload?.identifiedBarriers || ''),
    goals,
    finalEvaluation: cleanGeneratedText(parsed.finalEvaluation || sourceRecord.finalEvaluation || sourceRecord.payload?.finalEvaluation || ''),
    acceptedPlanText: cleanGeneratedText(parsed.acceptedPlanText || '')
  };
}

function buildPlanRecordWithStructuredDraft(record, structuredDraft, client = null) {
  const payload = record.payload || {};
  const updatedRecord = {
    ...record,
    strengthsAndLimits: structuredDraft.strengthsAndLimits,
    identifiedBarriers: structuredDraft.identifiedBarriers,
    goals: structuredDraft.goals,
    finalEvaluation: structuredDraft.finalEvaluation || '',
    acceptedPlanText: structuredDraft.acceptedPlanText || '',
    payload: {
      ...payload,
      strengthsAndLimits: structuredDraft.strengthsAndLimits,
      identifiedBarriers: structuredDraft.identifiedBarriers,
      goals: structuredDraft.goals,
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
    'Silné stránky a limity',
    planRecord.strengthsAndLimits || payload.strengthsAndLimits || 'Neuvedeno',
    '',
    'Identifikované bariéry',
    planRecord.identifiedBarriers || payload.identifiedBarriers || 'Neuvedeno',
    '',
    'Cíle a plánované kroky'
  ];

  if (goals.length) {
    goals.forEach((goal, index) => {
      const targetDate = formatCaseSummaryDate(goal.targetDate);
      lines.push(`${index + 1}. ${cleanGeneratedText(goal.goalDescription || 'Bez popisu cíle.')}`);
      if (goal.actionSteps) lines.push(`   Kroky: ${cleanGeneratedText(goal.actionSteps)}`);
      if (targetDate) lines.push(`   Termín: ${targetDate}`);
      lines.push(`   Stav: ${goal.isCompleted ? 'splněn' : 'otevřen'}`);
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
  const individualConsultationCount = records.filter((record) =>
    ['consultations', 'debt_cases', 'therapy_sessions'].includes(record.entityType)
  ).length;
  const therapyCount = countByType('therapy_sessions');
  const debtRecords = records.filter((record) => record.entityType === 'debt_cases');

  return [
    { ka: 'KA02', label: 'Individuální plány rozvoje', target: TARGETS.ka02Plans, value: countByType('plans'), note: countByType('plans') ? 'započítá se' : 'nezapočítá se' },
    { ka: 'KA02', label: 'Individuální konzultace', target: TARGETS.ka02Consultations, value: individualConsultationCount, note: individualConsultationCount ? 'zápis konzultace + dluhové poradenství + terapie' : 'nezapočítá se' },
    { ka: 'KA02', label: 'Klienti v poradenství', target: TARGETS.ka02SupportedClients, value: hasAny(['plans', 'consultations', 'debt_cases']) ? 1 : 0, note: 'unikátní klient s IPR/konzultací/dluhovým poradenstvím' },
    { ka: 'KA02', label: 'Realizace pracovního simulátoru', target: TARGETS.ka02SimulatorRuns, value: countByType('job_simulators'), note: countByType('job_simulators') ? 'počet simulátorů' : 'nezapočítá se' },
    { ka: 'KA02', label: 'Klienti se 3 terapiemi', target: TARGETS.ka02TherapyClients, value: therapyCount >= 3 ? 1 : 0, note: therapyCount ? `${therapyCount}/3 terapeutických setkání` : 'nezapočítá se' },
    { ka: 'KA02', label: 'CV a motivační dopisy', target: TARGETS.ka02CvOutputs, value: countByType('cv_outputs'), note: countByType('cv_outputs') ? 'počet výstupů CV/motivační dopis' : 'nezapočítá se' },
    { ka: 'KA02', label: 'Klienti se zmapovanými závazky', target: TARGETS.ka02DebtMappedClients, value: debtRecords.length ? 1 : 0, note: debtRecords.length ? 'unikátní klient s dluhovým záznamem' : 'nezapočítá se' },
    { ka: 'KA02', label: 'Splátkové kalendáře', target: TARGETS.ka02RepaymentArrangements, value: debtRecords.filter((record) => record.indicatorFlags?.ka02RepaymentArrangements || record.payload?.hasRepaymentArrangement).length, note: 'jen pokud je v dluhovém poradenství potvrzen splátkový kalendář' },
    { ka: 'KA03', label: 'Zřízená TPM', target: TARGETS.ka03TpmRecords, value: countByType('tpm_records'), note: countByType('tpm_records') ? 'počet TPM záznamů' : 'nezapočítá se' },
    { ka: 'KA03', label: 'Zřízená HPP', target: TARGETS.ka03EmploymentRecords, value: countByType('employment_records'), note: countByType('employment_records') ? 'počet HPP záznamů' : 'nezapočítá se' },
    { ka: 'KA03', label: 'Referenční zprávy mentora', target: TARGETS.ka03MentorReports, value: countByType('mentor_report_document'), note: countByType('mentor_report_document') ? 'počet zpráv mentora' : 'nezapočítá se' }
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

  const therapyCount = records.filter((record) => record.entityType === 'therapy_sessions').length;
  if (therapyCount > 0 && therapyCount < 3) warnings.push(`Terapeutická podpora není kompletní pro indikátor 3 terapií (${therapyCount}/3).`);

  const completedGoals = goals.filter((goal) => goal.isCompleted);
  const goalsMissingEvaluation = completedGoals.filter((goal) => !String(goal.goalEvaluation || '').trim());
  if (goalsMissingEvaluation.length) warnings.push(`Některé splněné cíle nemají vyplněné hodnocení (${goalsMissingEvaluation.length}).`);
  if (goals.length && goals.every((goal) => goal.isCompleted) && !planRecords.some((record) => String(record.finalEvaluation || record.payload?.finalEvaluation || '').trim())) {
    warnings.push('Všechny cíle jsou označené jako splněné, ale chybí závěrečné vyhodnocení plánu.');
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
  const completedGoals = goals.filter((goal) => goal.isCompleted).length;
  const evaluatedGoals = goals.filter((goal) => goal.isCompleted && String(goal.goalEvaluation || '').trim()).length;
  const allGoalsEvaluated = goals.length > 0 && goals.every((goal) => goal.isCompleted && String(goal.goalEvaluation || '').trim());
  const finalEvaluation = String(planRecord?.finalEvaluation || planRecord?.payload?.finalEvaluation || '').trim();

  const lines = [
    `Souhrn zakázky klienta - ${client.fullName}`,
    '',
    'Promítnutí zakázky do indikátorů',
    buildClientIndicatorTable(timeline),
    '',
    'Kontrola kvality evidence',
    ...(buildClientCaseQualityWarnings(client, timeline).length
      ? buildClientCaseQualityWarnings(client, timeline).map((warning) => `- ${warning}`)
      : ['- Nebyly nalezeny zjevné chyby v základní návaznosti evidence.']),
    '',
    'Základní údaje',
    `- Status: ${client.projectStatusLabel || 'neuvedeno'}`,
    `- Vstup do projektu: ${formatDateLabel(client.datumVstupu || client.datumZarazeni || '')}`,
    `- Postavení na trhu práce: ${client.postaveniNaTrhu || 'neuvedeno'}`,
    `- Vzdělání: ${client.vzdelani || 'neuvedeno'}`,
    `- Znevýhodnění / bariéry z registru: ${client.znevyhodneni || 'neuvedeno'}`,
    '',
    'Individuální plán rozvoje',
    `- Silné stránky a limity: ${planRecord?.strengthsAndLimits || planRecord?.payload?.strengthsAndLimits || 'zatím neuvedeno'}`,
    `- Identifikované bariéry: ${planRecord?.identifiedBarriers || planRecord?.payload?.identifiedBarriers || 'zatím neuvedeno'}`,
    `- Cíle: ${goals.length} celkem, ${completedGoals} splněno, ${evaluatedGoals} vyhodnoceno`,
    '',
    'Cíle'
  ];

  if (goals.length) {
    goals.forEach((goal, index) => {
      const targetDate = formatCaseSummaryDate(goal.targetDate);
      lines.push(`${index + 1}. ${cleanGeneratedText(goal.goalDescription || 'Bez popisu cíle.')}`);
      lines.push(`   Stav: ${goal.isCompleted ? 'splněn' : 'otevřen'}${targetDate ? `, termín: ${targetDate}` : ''}`);
      if (goal.isCompleted && String(goal.goalEvaluation || '').trim()) {
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
    lines.push('Všechny cíle jsou označené jako splněné a vyhodnocené. Závěrečné slovní vyhodnocení ještě není doplněné v plánu osobního rozvoje.');
  } else {
    lines.push('Závěrečné vyhodnocení zatím není kompletní, protože nejsou splněné a vyhodnocené všechny cíle v plánu osobního rozvoje.');
  }

  return lines.join('\n');
}

function buildAiClientCaseSummaryPrompt(client, timeline, supportBreakdown) {
  const deterministicSummary = buildClientCaseSummary(client, timeline, supportBreakdown);
  const qualityWarnings = buildClientCaseQualityWarnings(client, timeline);

  return `
Vytvoř profesionální souhrn zakázky klienta pro projektovou evidenci.

Povinná pravidla:
1. Piš česky, věcně, úředně srozumitelně, bez marketingu a bez domýšlení faktů.
2. Použij pouze data níže. Pokud údaj chybí, napiš, že chybí nebo není doložen.
3. Zachovej jednotnou strukturu přesně v tomto pořadí:
   Souhrn zakázky klienta
   1. Identifikace zakázky
   2. Individuální plán rozvoje a cíle
   3. Realizovaná podpora KA02
   4. Realizovaná podpora KA03
   5. Promítnutí do indikátorů
   6. Kontrola kvality evidence
   7. Závěrečné vyhodnocení cílů a doporučení
4. Část "Promítnutí do indikátorů" musí obsahovat tabulku z podkladů. Neměň hodnoty v tabulce.
5. Část "Kontrola kvality evidence" musí výslovně upozornit na zjevné chyby, chybějící údaje a časové nesoulady podpor. Pokud nic zásadního nevidíš, napiš "Bez zjevného rozporu v dostupných datech."
6. Nehodnoť osobnost klienta a nepiš diagnózy. Hodnoť jen doložený posun, doložené aktivity a chybějící evidenci.
7. Výstup vrať jako prostý text s nadpisy a tabulkou v Markdownu. Nepřidávej komentář k tomu, že jsi AI.

Strojově zjištěná varování:
${qualityWarnings.length ? qualityWarnings.map((warning) => `- ${warning}`).join('\n') : '- Bez automaticky zjištěných varování.'}

Podklady:
${deterministicSummary}
`.trim();
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

function buildPreviousRecordContext(record) {
  if (!record) return '';
  const dateLabel = formatDateLabel(record.activityDate);
  const summary = buildClientJourneySummary(record);
  const documentPreview = truncate(cleanGeneratedText(record.documentText || ''), 900);
  return [
    `Poslední relevantní zápis (${dateLabel})`,
    `Název: ${record.title || 'Bez názvu'}`,
    `Shrnutí: ${summary || 'Bez shrnutí.'}`,
    documentPreview ?`Text minulého zápisu: ${documentPreview}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

function isDateWithinPeriod(dateValue, period) {
  if (!period || period.value === 'all') return true;
  if (!dateValue) return false;
  return dateValue >= period.start && dateValue <= period.end;
}

function clipText(text, maxLength = 2000) {
  const normalized = cleanGeneratedText(text || '');
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function joinSummaryParts(parts) {
  return parts.filter(Boolean).join(' ');
}

function buildKa01ZorText(records) {
  const networkRecords = records.filter((record) => record.entityType === 'network_activities');
  if (networkRecords.length === 0) {
    return 'Ve sledovaném období nebyly v KA01 evidovány žádné vykazované síťové aktivity, porady ani distribuce materiálů.';
  }

  const totals = networkRecords.reduce(
    (acc, record) => {
      const type = record.payload?.type || '';
      const count = Number(record.payload?.count || 0);
      if (type === 'koordinační setkání') acc.meetings += 1;
      if (type === 'distribuce materiálů') acc.materials += count;
      if (type === 'porada týmu') acc.teamMeetings += 1;
      if (type === 'síť aktérů') acc.network += 1;
      return acc;
    },
    { meetings: 0, materials: 0, teamMeetings: 0, network: 0 }
  );

  const highlights = networkRecords
    .map((record) => record.payload?.notes || record.payload?.participants || '')
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => truncate(cleanGeneratedText(item), 140));

  return clipText(
    joinSummaryParts([
      'Ve sledovaném období byla v KA01 realizována průběžná síťovací a koordinační činnost podporující naplňování projektu.',
      totals.meetings ?`Bylo evidováno ${totals.meetings} koordinačních setkání s aktéry spolupráce.` : '',
      totals.materials ?`Distribuce informačních materiálů dosáhla ${totals.materials} kusů nebo výstupů.` : '',
      totals.teamMeetings ?`Současně proběhlo ${totals.teamMeetings} porad realizačního týmu.` : '',
      totals.network ?`V evidenci se promítlo také ${totals.network} aktualizací či rozvojových kroků v síti aktérů.` : '',
      highlights.length ?`Obsah aktivit se soustředil zejména na: ${highlights.join('; ')}.` : ''
    ])
  );
}

function buildKa02ZorText(records) {
  if (records.length === 0) {
    return 'Ve sledovaném období nebyly v KA02 evidovány žádné klientské podpory ani související dokumenty.';
  }

  const uniqueClients = new Set(records.map((record) => record.clientId).filter(Boolean)).size;
  const counts = {
    plans: records.filter((record) => record.entityType === 'plans').length,
    consultations: records.filter((record) => record.entityType === 'consultations').length,
    debt: records.filter((record) => record.entityType === 'debt_cases').length,
    therapy: records.filter((record) => record.entityType === 'therapy_sessions').length,
    cv: records.filter((record) => record.entityType === 'cv_outputs').length,
    simulator: records.filter((record) => record.entityType === 'job_simulators').length
  };
  const supportHours = records.reduce((sum, record) => sum + Number(record.payload?.durationMinutes || 0), 0) / 60;

  const highlights = records
    .map((record) => {
      const payload = record.payload || {};
      return (
        payload.goals ||
        payload.topics ||
        payload.solutionPlan ||
        payload.themes ||
        payload.targetJob ||
        payload.feedback ||
        ''
      );
    })
    .filter(Boolean)
    .slice(0, 4)
    .map((item) => truncate(cleanGeneratedText(item), 140));

  return clipText(
    joinSummaryParts([
      `Ve sledovaném období probíhala v KA02 přímá podpora klientů zaměřená na stabilizaci situace, rozvoj pracovních kompetencí a přípravu na pracovní uplatnění. Celkem bylo evidováno ${records.length} výkonů pro ${uniqueClients} klientů.`,
      counts.plans ?`Bylo zpracováno ${counts.plans} plánů rozvoje.` : '',
      counts.consultations ?`Individuálních konzultací proběhlo ${counts.consultations}.` : '',
      counts.debt ?`Dluhové poradenství bylo evidováno ve ${counts.debt} případech.` : '',
      counts.therapy ?`Terapeuticko-diagnostických setkání proběhlo ${counts.therapy}.` : '',
      counts.cv ?`Výstupů typu CV a motivační dopis bylo ${counts.cv}.` : '',
      counts.simulator ?`Pracovní simulátor byl realizován v ${counts.simulator} případech.` : '',
      supportHours ?`Odhadovaný rozsah přímé podpory činil ${supportHours.toFixed(1)} hodiny.` : '',
      highlights.length ?`Tematicky se práce soustředila zejména na: ${highlights.join('; ')}.` : ''
    ])
  );
}

function buildKa03ZorText(records) {
  if (records.length === 0) {
    return 'Ve sledovaném období nebyly v KA03 evidovány žádné záznamy o TPM, mentoringu ani pracovním uplatnění.';
  }

  const tpmRecords = records.filter((record) => record.entityType === 'tpm_records');
  const mentoringRecords = records.filter((record) => record.entityType === 'mentoring_records');
  const employmentRecords = records.filter((record) => record.entityType === 'employment_records');
  const mentorReports = records.filter((record) => record.entityType === 'mentor_report_document');
  const totalMonths = tpmRecords.reduce((sum, record) => sum + Number(record.payload?.actualMonths || 0), 0);

  const employers = Array.from(
    new Set(
      records
        .map((record) => record.payload?.employer || '')
        .filter(Boolean)
    )
  ).slice(0, 4);

  return clipText(
    joinSummaryParts([
      'Ve sledovaném období byla v KA03 realizována navazující podpora směřující k pracovnímu uplatnění a udržení klientů v pracovním procesu.',
      tpmRecords.length ?`Bylo evidováno ${tpmRecords.length} záznamů o TPM se skutečným výkonem v rozsahu ${totalMonths.toFixed(1)} měsíců.` : '',
      mentoringRecords.length ?`Mentoring byl zaznamenán v ${mentoringRecords.length} případech.` : '',
      employmentRecords.length ?`Pracovní uplatnění bylo evidováno v ${employmentRecords.length} případech.` : '',
      mentorReports.length ?`Současně vzniklo ${mentorReports.length} referenčních zpráv mentora.` : '',
      employers.length ?`Klienti byli zapojeni zejména u těchto zaměstnavatelů nebo pracovišť: ${employers.join(', ')}.` : ''
    ])
  );
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
    header: 'border-stone-200 bg-stone-50/90',
    accent: 'bg-amber-300/30',
    label: 'text-amber-700',
    navActive: 'border-amber-300 bg-amber-600 text-white shadow-sm shadow-amber-200/70',
    navIdle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800'
  },
  ka01: {
    page: 'bg-[radial-gradient(circle_at_top_left,#d7f2df_0,#eef4dc_36%,#edf2e6_62%,#e8eef0_100%)]',
    header: 'border-emerald-200 bg-emerald-50/85',
    accent: 'bg-emerald-300/30',
    label: 'text-emerald-700',
    navActive: 'border-emerald-300 bg-emerald-600 text-white shadow-sm shadow-emerald-200/70',
    navIdle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800'
  },
  ka02: {
    page: 'bg-[radial-gradient(circle_at_top_left,#fde7b2_0,#f6edd7_35%,#eee8dc_62%,#e7edf1_100%)]',
    header: 'border-amber-200 bg-amber-50/85',
    accent: 'bg-yellow-300/30',
    label: 'text-amber-700',
    navActive: 'border-amber-300 bg-amber-600 text-white shadow-sm shadow-amber-200/70',
    navIdle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800'
  },
  ka03: {
    page: 'bg-[radial-gradient(circle_at_top_left,#ffd7ba_0,#f7e5d2_34%,#eee4d8_62%,#e8edf1_100%)]',
    header: 'border-orange-200 bg-orange-50/85',
    accent: 'bg-orange-300/30',
    label: 'text-orange-700',
    navActive: 'border-orange-300 bg-orange-600 text-white shadow-sm shadow-orange-200/70',
    navIdle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800'
  },
  dashboard: {
    page: 'bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#e9eef4_35%,#f0eadc_66%,#ebe6dc_100%)]',
    header: 'border-blue-200 bg-blue-50/85',
    accent: 'bg-blue-300/30',
    label: 'text-blue-700',
    navActive: 'border-blue-300 bg-blue-600 text-white shadow-sm shadow-blue-200/70',
    navIdle: 'border-stone-200 bg-white/80 text-stone-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800'
  }
};

function asSheetText(value) {
  if (value == null) return '';
  if (typeof value?.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  return String(value);
}

function asSheetWorker(value) {
  const text = asSheetText(value).trim();
  return text === 'test-user' ? '' : text;
}

function asSheetDate(value) {
  const text = asSheetText(value).trim();
  if (!text) return '';
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return text.slice(0, 10);
}

function parseSheetJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function hoursToMinutes(value) {
  const number = Number(String(value || '').replace(',', '.'));
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

function mapSheetRecordsToAppRecords({ individualPlans = [], performances = [], meetings = [], networkMeetings = [], partners = [] }, clientIndex = {}) {
  const clientName = (clientId) => clientIndex[clientId]?.fullName || clientId || '';
  const statusOk = (row) => !String(row.status || '').toLowerCase().includes('smaz');
  const records = [];

  individualPlans.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.plan_id);
    const clientId = asSheetText(row.klient_id);
    if (!id || !clientId) return;
    const goals = parseSheetJson(row.cile_json, []);
    records.push({
      id,
      remoteSource: 'google-sheet',
      entityType: 'plans',
      ka: 'KA1',
      title: 'Individu?ln? pl?n - ' + clientName(clientId),
      activityDate: asSheetDate(row.updated_at || row.created_at),
      worker: asSheetWorker(row.pracovnik || row.updated_by || row.created_by),
      clientId,
      clientIds: [clientId],
      clientName: clientName(clientId),
      documentText: asSheetText(row.accepted_plan_text),
      goals: Array.isArray(goals) ? goals : [],
      payload: {
        currentSituation: asSheetText(row.silne_stranky_limity),
        strengthsAndLimits: asSheetText(row.silne_stranky_limity),
        barriers: asSheetText(row.identifikovane_bariery_potreby),
        identifiedBarriers: asSheetText(row.identifikovane_bariery_potreby),
        goals: stringifyPlanGoals(goals),
        structuredGoals: Array.isArray(goals) ? goals : [],
        plannedSteps: stringifyPlanGoals(goals),
        finalEvaluation: asSheetText(row.zaverecne_vyhodnoceni),
        acceptedPlanText: asSheetText(row.accepted_plan_text),
        durationMinutes: 60
      },
      indicatorFlags: { ka02Plans: true },
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0
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
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0
    });
  });

  meetings.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.meeting_id);
    const clientId = asSheetText(row.klient_id);
    if (!id || !clientId) return;
    records.push({
      id,
      remoteSource: 'google-sheet',
      entityType: 'consultations',
      ka: 'KA2',
      title: asSheetText(row.typ_podpory) || 'Case management - ' + clientName(clientId),
      activityDate: asSheetDate(row.datum || row.created_at),
      worker: asSheetText(row.pracovnik),
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
        partnerNames: asSheetText(row.partneri).split(';').map((item) => item.trim()).filter(Boolean),
        partners: asSheetText(row.partneri),
        participantCount: Number(asSheetText(row.pocet_akteru) || 0),
        caseManagementMode: true
      },
      indicatorFlags: { ka02Consultations: true },
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0
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
      worker: asSheetText(row.pracovnik),
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
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0
    });
  });

  partners.filter(statusOk).forEach((row) => {
    const id = asSheetText(row.partner_id);
    const name = asSheetText(row.nazev_subjektu || row.subjekt || row.name);
    if (!id && !name) return;
    records.push({
      id: id || 'partner-' + name,
      remoteSource: 'google-sheet',
      entityType: 'actor_registry',
      ka: 'KA2',
      title: 'Registr akt?ra - ' + (name || id),
      activityDate: asSheetDate(row.datum_zapojeni || row.updated_at || row.created_at),
      worker: asSheetText(row.pracovnik || row.updated_by),
      clientIds: [],
      payload: {
        name,
        actorType: asSheetText(row.typ_aktera),
        networkOrigin: asSheetText(row.puvod_site),
        joinedNetworkDate: asSheetDate(row.datum_zapojeni),
        contactName: asSheetText(row.kontaktni_osoba),
        contactRole: asSheetText(row.funkce),
        phone: asSheetText(row.telefon),
        email: asSheetText(row.email),
        cooperationStatus: asSheetText(row.status) || 'zapojen? akt?r'
      },
      indicatorFlags: { ka01ActorRegistry: true },
      createdAt: Date.parse(asSheetText(row.created_at)) || 0,
      updatedAt: Date.parse(asSheetText(row.updated_at)) || 0
    });
  });

  return records.sort(compareTimelineRecordsDesc);
}

function mapClientDraftToSheetClient(draft, klientId = '') {
  return {
    klient_id: klientId,
    jmeno: String(draft.jmeno || '').trim(),
    prijmeni: String(draft.prijmeni || '').trim(),
    datum_narozeni: draft.datumNarozeni || '',
    ulice: String(draft.ulice || '').trim(),
    cislo_popisne: String(draft.cisloPopisne || '').trim(),
    mesto: String(draft.mesto || '').trim(),
    psc: String(draft.psc || '').trim(),
    email: String(draft.email || '').trim(),
    datova_schranka: String(draft.datovaSchranka || '').trim(),
    telefon: String(draft.telefon || '').trim(),
    pohlavi: draft.pohlavi || '',
    postaveni_na_trhu_prace: draft.postaveniNaTrhu || '',
    dosazene_vzdelani: draft.vzdelani || '',
    znevyhodneni: draft.znevyhodneni || '',
    datum_vstupu_do_projektu: draft.datumVstupu || '',
    datum_vystupu_z_projektu: draft.datumVystupu || '',
    stav_klienta: draft.stavKlienta || 'Aktivn\u00ed',
    case_management_potreba: draft.caseManagementPotreba || 'Ne',
    case_management_duvod: draft.caseManagementPotreba === 'Ano' ? String(draft.caseManagementDuvod || '').trim() : '',
    case_management_od: draft.caseManagementPotreba === 'Ano' ? draft.caseManagementOd || '' : '',
    poznamka: String(draft.poznamka || '').trim(),
    drive_folder_url: draft.driveFolderUrl || '',
    monitoring_list_url: draft.monitoringListUrl || ''
  };
}

const optionItems = (values, placeholder) => [
  { value: '', label: placeholder },
  ...values.map((value) => ({ value, label: value }))
];

function ClientRegistrationFields({ draft, setDraft, compact = false }) {
  const update = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));

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
          <InputField label="Ulice" value={draft.ulice} onChange={(value) => update('ulice', value)} />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <InputField label="Číslo popisné" value={draft.cisloPopisne} onChange={(value) => update('cisloPopisne', value)} />
            <InputField label="PSČ" value={draft.psc} onChange={(value) => update('psc', value)} />
          </div>
          <InputField label="Město / obec" value={draft.mesto} onChange={(value) => update('mesto', value)} />
          <InputField label="Telefon" type="tel" value={draft.telefon} onChange={(value) => update('telefon', value)} />
          <InputField label="E-mail" type="email" value={draft.email} onChange={(value) => update('email', value)} />
          <InputField label="Datová schránka" value={draft.datovaSchranka} onChange={(value) => update('datovaSchranka', value)} />
        </div>

        <div className={sectionBox}>
          <div className={sectionTitle}>Monitorovací údaje</div>
          <SelectField label="Postavení na trhu práce" value={draft.postaveniNaTrhu} onChange={(value) => update('postaveniNaTrhu', value)} options={optionItems(CLIENT_EMPLOYMENT_OPTIONS, 'Vyberte postavení')} />
          <SelectField label="Dosažené vzdělání" value={draft.vzdelani} onChange={(value) => update('vzdelani', value)} options={optionItems(CLIENT_EDUCATION_OPTIONS, 'Vyberte vzdělání')} />
          <SelectField label="Typ znevýhodnění" value={draft.znevyhodneni} onChange={(value) => update('znevyhodneni', value)} options={optionItems(CLIENT_DISADVANTAGE_OPTIONS, 'Vyberte znevýhodnění')} />
        </div>

        <div className={sectionBox}>
          <div className={sectionTitle}>Zařazení v projektu</div>
          <SelectField label="Stav klienta" value={draft.stavKlienta} onChange={(value) => update('stavKlienta', value)} options={optionItems(CLIENT_STATUS_OPTIONS, 'Vyberte stav')} />
          <InputField label="Datum vstupu do projektu" type="date" value={draft.datumVstupu} onChange={(value) => update('datumVstupu', value)} />
          <InputField label="Datum výstupu z projektu" type="date" value={draft.datumVystupu} onChange={(value) => update('datumVystupu', value)} />
          <SelectField label="Potřeba case managementu" value={draft.caseManagementPotreba} onChange={(value) => update('caseManagementPotreba', value)} options={optionItems(YES_NO_OPTIONS, 'Vyberte odpověď')} />
          {draft.caseManagementPotreba === 'Ano' && (
            <>
              <InputField label="Case management od" type="date" value={draft.caseManagementOd} onChange={(value) => update('caseManagementOd', value)} />
              <TextAreaField label="Důvod case managementu" value={draft.caseManagementDuvod} onChange={(value) => update('caseManagementDuvod', value)} rows={2} />
            </>
          )}
          <TextAreaField label="Poznámka" value={draft.poznamka} onChange={(value) => update('poznamka', value)} rows={2} />
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InputField label="Ulice" value={draft.ulice} onChange={(value) => update('ulice', value)} />
        <InputField label="Číslo popisné" value={draft.cisloPopisne} onChange={(value) => update('cisloPopisne', value)} />
        <InputField label="Město / obec" value={draft.mesto} onChange={(value) => update('mesto', value)} />
        <InputField label="PSČ" value={draft.psc} onChange={(value) => update('psc', value)} />
        <InputField label="Telefon" type="tel" value={draft.telefon} onChange={(value) => update('telefon', value)} />
        <InputField label="E-mail" type="email" value={draft.email} onChange={(value) => update('email', value)} />
        <InputField label="Datová schránka" value={draft.datovaSchranka} onChange={(value) => update('datovaSchranka', value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Postavení na trhu práce" value={draft.postaveniNaTrhu} onChange={(value) => update('postaveniNaTrhu', value)} options={optionItems(CLIENT_EMPLOYMENT_OPTIONS, 'Vyberte postavení')} />
        <SelectField label="Dosažené vzdělání" value={draft.vzdelani} onChange={(value) => update('vzdelani', value)} options={optionItems(CLIENT_EDUCATION_OPTIONS, 'Vyberte vzdělání')} />
        <SelectField label="Typ znevýhodnění" value={draft.znevyhodneni} onChange={(value) => update('znevyhodneni', value)} options={optionItems(CLIENT_DISADVANTAGE_OPTIONS, 'Vyberte znevýhodnění')} />
        <SelectField label="Stav klienta" value={draft.stavKlienta} onChange={(value) => update('stavKlienta', value)} options={optionItems(CLIENT_STATUS_OPTIONS, 'Vyberte stav')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InputField label="Datum vstupu do projektu" type="date" value={draft.datumVstupu} onChange={(value) => update('datumVstupu', value)} />
        <InputField label="Datum výstupu z projektu" type="date" value={draft.datumVystupu} onChange={(value) => update('datumVystupu', value)} />
        <SelectField label="Potřeba case managementu" value={draft.caseManagementPotreba} onChange={(value) => update('caseManagementPotreba', value)} options={optionItems(YES_NO_OPTIONS, 'Vyberte odpověď')} />
        {draft.caseManagementPotreba === 'Ano' && (
          <InputField label="Case management od" type="date" value={draft.caseManagementOd} onChange={(value) => update('caseManagementOd', value)} />
        )}
      </div>

      {draft.caseManagementPotreba === 'Ano' && (
        <TextAreaField label="Důvod case managementu" value={draft.caseManagementDuvod} onChange={(value) => update('caseManagementDuvod', value)} rows={2} />
      )}
      <TextAreaField label="Poznámka" value={draft.poznamka} onChange={(value) => update('poznamka', value)} rows={2} />
    </div>
  );
}

function App() {
  const [mainView, setMainView] = useState('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [firebaseAuthError, setFirebaseAuthError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientDraft, setClientDraft] = useState(emptyClientDraft);
  const [showClientEditForm, setShowClientEditForm] = useState(false);
  const [clientEditDraft, setClientEditDraft] = useState(emptyClientDraft);
  const [generatorDraft, setGeneratorDraft] = useState(emptyGeneratorDraft);
  const [generatedText, setGeneratedText] = useState('');
  const [lastGeneratedText, setLastGeneratedText] = useState('');
  const [generationNotice, setGenerationNotice] = useState('');
  const [aiGenerationStatus, setAiGenerationStatus] = useState('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProvisioningClientFolder, setIsProvisioningClientFolder] = useState(false);
  const [isSummarizingCase, setIsSummarizingCase] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [clientCaseSummary, setClientCaseSummary] = useState('');
  const [dashboardFilters, setDashboardFilters] = useState(emptyFilters);
  const [zorTexts, setZorTexts] = useState(null);
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
  const [ka01ActorDraft, setKa01ActorDraft] = useState({
    id: '',
    name: '',
    networkOrigin: '',
    actorType: 'obec / m\u011bsto',
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
    communicationNote: '',
    cooperationStatus: 'potenciální aktér',
    joinedNetworkDate: '',
    lastContactDate: '',
    inactivityReason: '',
    ownerWorker: 'Garant projektu',
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
    worker: 'Mentor/Kouč',
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
    mentoringFrequency: '1x za 14 dní',
    progressSummary: '',
    barriers: '',
    nextSupportSteps: '',
    employmentType: 'HPP',
    employmentStartDate: todayIso(),
    employmentEndDate: '',
    employmentPlannedMonths: '12',
    employmentActualMonths: '0',
    employmentStatus: 'active',
    sustainabilitySupport: '',
    mentorReportTitle: 'Referenční zpráva mentora',
    mentorReportText: ''
  });

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setUser({ uid: 'local-user' });
      return undefined;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        setFirebaseAuthError('');
      } catch (error) {
        console.error('Auth error:', error);
        setFirebaseAuthError('Firebase Authentication není připravené. Ve Firebase zapni Authentication > Sign-in method > Anonymous.');
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    if (!hasFirebaseConfig || !db) {
      setRecords(loadLocalRecords());
      return undefined;
    }

    const recordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projectRecords');
    const unsubscribe = onSnapshot(
      recordsRef,
      (snapshot) => {
        const loaded = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data()
        }));
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRecords(loaded);
      },
      (error) => {
        console.error('Firestore snapshot error:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
      setSheetError('');
      try {
        const clientsUrl = new URL(GOOGLE_SHEET_MACRO_URL);
        clientsUrl.searchParams.set('action', 'listClients');
        const token = import.meta.env?.VITE_CLIENTS_API_TOKEN || '';
        if (token) clientsUrl.searchParams.set('token', token);
        const response = await fetch(clientsUrl.toString());
        if (!response.ok) {
          throw new Error('Nepodařilo se načíst klientský registr.');
        }

        const json = await response.json();
        let rows = [];
        if (Array.isArray(json)) rows = json;
        else if (json && Array.isArray(json.clients)) rows = json.clients;
        else if (json && Array.isArray(json.data)) rows = json.data;
        else if (json && Array.isArray(json.items)) rows = json.items;

        const parsed = rows
          .map((row, index) => mapSheetRowToClient(row, index))
          .filter(Boolean);

        if (parsed.length > 0) {
          setClients(parsed);
          setSelectedClientId(parsed[0].id);
          setGeneratorDraft((prev) => ({ ...prev, clientId: parsed[0].id }));
          setKa01Draft((prev) => ({ ...prev, assessmentClientId: parsed[0].id }));
          setKa02Draft((prev) => ({ ...prev, selectedClientId: parsed[0].id }));
          setKa03Draft((prev) => ({
            ...prev,
            selectedClientId: parsed[0].id,
            tpmClientId: parsed[0].id,
            employmentClientId: parsed[0].id,
            tpmDate: prev.tpmDate || todayIso(),
            employmentDate: prev.employmentDate || todayIso()
          }));
        } else {
          throw new Error('Tabulka neobsahuje aktivní klienty.');
        }
      } catch (error) {
        console.error('Google Sheets load error:', error);
        const mockClients = getMockClients();
        setClients(mockClients);
        setSelectedClientId(mockClients[0].id);
        setGeneratorDraft((prev) => ({ ...prev, clientId: mockClients[0].id }));
        setKa01Draft((prev) => ({ ...prev, assessmentClientId: mockClients[0].id }));
        setKa02Draft((prev) => ({ ...prev, selectedClientId: mockClients[0].id }));
        setKa03Draft((prev) => ({
          ...prev,
          selectedClientId: mockClients[0].id,
          tpmClientId: mockClients[0].id,
          employmentClientId: mockClients[0].id,
          tpmDate: prev.tpmDate || todayIso(),
          employmentDate: prev.employmentDate || todayIso()
        }));
        setSheetError('Načtení Google Sheets selhalo. Aplikace běží nad ukázkovými daty a interní evidencí.');
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  const clientIndex = useMemo(() => {
    const map = {};
    clients.forEach((client) => {
      map[client.id] = client;
    });
    return map;
  }, [clients]);


  useEffect(() => {
    if (!GOOGLE_SHEET_MACRO_URL || clients.length === 0) return undefined;
    let cancelled = false;

    const fetchAction = async (action) => {
      const url = new URL(GOOGLE_SHEET_MACRO_URL);
      url.searchParams.set('action', action);
      const token = import.meta.env?.VITE_CLIENTS_API_TOKEN || '';
      if (token) url.searchParams.set('token', token);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Google Sheet akce ' + action + ' selhala.');
      const json = await response.json();
      if (json.ok === false) throw new Error(json.error || 'Google Sheet akce ' + action + ' selhala.');
      return json;
    };

    const fetchSheetRecords = async () => {
      try {
        const [plans, performances, meetings, networkMeetings, partners] = await Promise.all([
          fetchAction('listIndividualPlans'),
          fetchAction('listPerformances'),
          fetchAction('listMeetings'),
          fetchAction('listNetworkMeetings'),
          fetchAction('listPartners')
        ]);
        if (cancelled) return;
        const remoteRecords = mapSheetRecordsToAppRecords({
          individualPlans: plans.individualPlans || [],
          performances: performances.performances || [],
          meetings: meetings.meetings || [],
          networkMeetings: networkMeetings.networkMeetings || [],
          partners: partners.partners || []
        }, clientIndex);
        setRecords((prev) => {
          const remoteIds = new Set(remoteRecords.map((record) => record.id));
          const localOnly = prev.filter((record) => !record.remoteSource && !remoteIds.has(record.id));
          const merged = [...remoteRecords, ...localOnly].sort(compareTimelineRecordsDesc);
          if (!hasFirebaseConfig || !db) saveLocalRecords(merged);
          return merged;
        });
        setSheetError('');
      } catch (error) {
        if (cancelled) return;
        console.error('Google Sheets records load error:', error);
        setSheetError('Klienti se na?etli, ale nepoda?ilo se na??st ulo?en? z?znamy ze Sheetu.');
      }
    };

    fetchSheetRecords();
    return () => {
      cancelled = true;
    };
  }, [clients, clientIndex]);

  const selectedClient = selectedClientId ?clientIndex[selectedClientId] : null;


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

  const recordsByType = useMemo(() => groupRecordsByType(records), [records]);

  const selectedReportingPeriod = useMemo(
    () => REPORTING_PERIODS.find((item) => item.value === dashboardFilters.period) || REPORTING_PERIODS[0],
    [dashboardFilters.period]
  );

  const storedActivityRecords = useMemo(
    () => records.filter((record) => CURRENT_ACTIVITY_ENTITY_TYPES.has(record.entityType)),
    [records]
  );

  const filteredRecords = useMemo(() => {
    return storedActivityRecords.filter((record) => {
      const matchesPeriod = isDateWithinPeriod(record.activityDate || '', selectedReportingPeriod);
      const matchesKa = dashboardFilters.ka === 'all' || record.ka === dashboardFilters.ka;
      const matchesWorker = dashboardFilters.worker === 'all' || record.worker === dashboardFilters.worker;
      return matchesPeriod && matchesKa && matchesWorker;
    });
  }, [dashboardFilters, selectedReportingPeriod, storedActivityRecords]);

  const filteredClientList = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      return [client.fullName, client.mesto, client.postaveniNaTrhu, client.projectStatusLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [clients, searchQuery]);

  const computedIndicators = useMemo(() => {
    return buildIndicators({
      clients,
      records: filteredRecords
    });
  }, [clients, filteredRecords]);

  const dashboardOverview = useMemo(() => {
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
    const isCompletedGoal = (goal) => {
      const value = goal?.isCompleted;
      return value === true || ['ano', 'true', '1', 'splnen', 'splneno'].includes(normalize(value));
    };
    const evaluatedLongGoal = (clientId, aliases) => {
      const plans = (contextRecordsByClient.get(clientId) || []).filter((record) => record.entityType === 'plans');
      const activities = (filteredRecordsByClient.get(clientId) || []).filter(
        (record) => record.entityType !== 'plans' && areaMatches(record, aliases)
      );
      return activities.some((activity) => {
        const goalId = String(activity.linkedPlanGoalId || activity.payload?.linkedPlanGoalId || '');
        if (!goalId || goalId === 'one-time-order') return false;
        return plans.some((plan) => {
          const finalEvaluation = String(plan.finalEvaluation || plan.payload?.finalEvaluation || '').trim();
          const goal = getPlanGoals(plan).find(
            (item, index) => String(item.goalId || item.id || ('goal-' + (index + 1))) === goalId
          );
          return Boolean(goal && isCompletedGoal(goal) && (String(goal.goalEvaluation || '').trim() || finalEvaluation));
        });
      });
    };
    const completedShortOrder = (clientId, aliases) =>
      (filteredRecordsByClient.get(clientId) || []).some((record) => {
        if (record.entityType === 'plans' || !areaMatches(record, aliases)) return false;
        const outcome = String(record.payload?.outcome || record.documentText || '').trim();
        const goalId = String(record.linkedPlanGoalId || record.payload?.linkedPlanGoalId || '');
        return Boolean(outcome && (!goalId || goalId === 'one-time-order'));
      });
    const countLongGoal = (aliases) => longTermClients.filter((client) => evaluatedLongGoal(client.id, aliases)).length;
    const countShortGoal = (aliases) => shortTermClients.filter((client) => completedShortOrder(client.id, aliases)).length;

    const caseMeetingCount = filteredRecords.filter((record) => {
      const type = normalize(record.payload?.consultationType || record.payload?.type || record.title);
      return type.includes('pripadov') || type.includes('multiobor');
    }).length;
    const outreachCount = filteredRecords.filter((record) =>
      normalize(record.payload?.consultationType || record.title).includes('depist')
    ).length;
    const missingPlanCount = longTermClients.filter(
      (client) => !(contextRecordsByClient.get(client.id) || []).some((record) => record.entityType === 'plans')
    ).length;
    const missingGoalEvaluationCount = supportedClients.filter((client) =>
      (contextRecordsByClient.get(client.id) || [])
        .filter((record) => record.entityType === 'plans')
        .some((plan) => getPlanGoals(plan).some((goal) => isCompletedGoal(goal) && !String(goal.goalEvaluation || '').trim()))
    ).length;
    const completeMonitoringCount = longTermClients.filter(hasCompleteMonitoringData).length;

    return {
      indicators: [
        { key: '600000', code: '600 000', label: 'Celkov\u00fd po\u010det \u00fa\u010dastn\u00edk\u016f', current: longEligible.length, target: 29 },
        { key: '670102', code: '670 102', label: 'Vyu\u017e\u00edv\u00e1n\u00ed podpo\u0159en\u00fdch slu\u017eeb', current: shortEligible.length, target: 100 }
      ],
      longGoals: [
        { key: 'parenting-long', label: 'Rodi\u010dovsk\u00e9 kompetence', current: countLongGoal(['rodina']), target: 11 },
        { key: 'housing-long', label: 'Bydlen\u00ed', current: countLongGoal(['bydlen\u00ed']), target: 5 },
        { key: 'work-long', label: 'Pracovn\u00ed kompetence', current: countLongGoal(['zam\u011bstn\u00e1n\u00ed']), target: 5 },
        { key: 'finance-long', label: 'Finan\u010dn\u00ed situace', current: countLongGoal(['finance/dluhy', 'dluhy']), target: 5 }
      ],
      shortGoals: [
        { key: 'security-short', label: 'Soci\u00e1ln\u00ed zabezpe\u010den\u00ed', current: countShortGoal(['d\u00e1vky']), target: 50 },
        { key: 'services-short', label: 'P\u0159\u00edstup ke slu\u017eb\u00e1m', current: countShortGoal(['slu\u017eby']), target: 25 },
        { key: 'parenting-short', label: 'Rodi\u010dovsk\u00e9 kompetence', current: countShortGoal(['rodina']), target: 20 },
        { key: 'inclusion-short', label: 'Soci\u00e1ln\u00ed za\u010dlen\u011bn\u00ed', current: countShortGoal(['soci\u00e1ln\u00ed za\u010dlen\u011bn\u00ed']), target: 5 }
      ],
      activityGoals: [
        { key: 'outreach', label: 'Depist\u00e1\u017en\u00ed z\u00e1znamy', current: outreachCount, target: 100 },
        { key: 'case-meetings', label: 'P\u0159\u00edpadov\u00e1 / multioborov\u00e1 setk\u00e1n\u00ed', current: caseMeetingCount, target: 15 }
      ],
      risks: [
        { key: 'near-40', label: 'Klienti bl\u00edzko 40 hodin', count: supportedClients.filter((client) => hoursFor(client.id) >= 30 && hoursFor(client.id) < 40).length, detail: '30\u201339,99 hodiny podpory' },
        { key: 'long-not-counted', label: 'Nad 40 hodin, ale nezapo\u010dteno do 600 000', count: longTermClients.length - longEligible.length, detail: 'Chyb\u00ed povinn\u00e9 monitorovac\u00ed \u00fadaje' },
        { key: 'short-not-counted', label: 'Pod 40 hodin, ale nezapo\u010dteno do 670 102', count: shortTermClients.length - shortEligible.length, detail: 'Chyb\u00ed minim\u00e1ln\u00ed registra\u010dn\u00ed \u00fadaje' },
        { key: 'missing-plan', label: 'Chyb\u00ed individu\u00e1ln\u00ed pl\u00e1n u 40+', count: missingPlanCount, detail: 'Riziko pro dolo\u017een\u00ed dlouhodob\u00e9 podpory' },
        { key: 'missing-evaluation', label: 'Chyb\u00ed vyhodnocen\u00ed c\u00edle', count: missingGoalEvaluationCount, detail: 'Spln\u011bn\u00fd c\u00edl nem\u00e1 slovn\u00ed vyhodnocen\u00ed' }
      ]
    };
  }, [clients, filteredRecords, records]);

  const periodRecordsForZor = useMemo(
    () => storedActivityRecords.filter((record) => isDateWithinPeriod(record.activityDate || '', selectedReportingPeriod)),
    [selectedReportingPeriod, storedActivityRecords]
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
  const mentorReportRecords = useMemo(
    () =>
      records
        .filter((record) => record.entityType === 'mentor_report_document')
        .sort((a, b) => (b.activityDate || '').localeCompare(a.activityDate || '')),
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
        worker: 'Garant projektu',
        payload: {
          id: '',
          ownerWorker: 'Garant projektu',
          ...item,
          networkOrigin: item.networkOrigin || 'výchozí síť'
        }
      }));
      return [...existing, ...seeded].sort((a, b) => (b.activityDate || '').localeCompare(a.activityDate || ''));
    },
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
        if (typeof next[record.id] === 'boolean') return;
        const defaultValue = Boolean(record.payload?.includeInAttendance);
        next[record.id] = defaultValue;
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
      const goals = Array.isArray(planRecord?.goals) && planRecord.goals.length
        ? planRecord.goals
        : planRecord?.payload?.goals || [];

      return goals
        .map((goal, index) => {
          const label = goal.goalDescription || goal.description || `Cíl ${index + 1}`;
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
  const previousGeneratorRecord = useMemo(() => {
    if (!generatorClient || !generatorConfig) return null;
    return records
      .filter((record) => {
        const clientIds = Array.isArray(record.clientIds) ?record.clientIds : record.clientId ?[record.clientId] : [];
        return clientIds.includes(generatorClient.id) && record.entityType === generatorConfig.entityType;
      })
      .sort((a, b) => {
        const left = `${b.activityDate || ''}-${b.createdAt || 0}`;
        const right = `${a.activityDate || ''}-${a.createdAt || 0}`;
        return left.localeCompare(right);
      })[0] || null;
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
        selectedKey: KA03_AI_DOCUMENT_KEYS.includes(prev.selectedKey) ?prev.selectedKey : 'mentor',
        tpmRecordId: prev.tpmRecordId || preferredTpm?.id || '',
        clientId: prev.clientId || preferredTpm?.clientId || ka03Draft.tpmClientId || ka03Draft.employmentClientId || ka03Draft.selectedClientId,
        worker: 'Mentor/Kouč'
      }));
    }
  }, [mainView, ka02Draft.selectedClientId, ka03Draft.selectedClientId, ka03Draft.tpmClientId, ka03Draft.employmentClientId, tpmRecords]);

  useEffect(() => {
    if (generatorDraft.selectedKey !== 'therapy' || editingGeneratedRecordId) return;
    setGeneratorDraft((prev) => {
      if (prev.sessionOrder === nextTherapySessionOrder && prev.worker === 'Terapeut') return prev;
      return {
        ...prev,
        sessionOrder: nextTherapySessionOrder,
        worker: 'Terapeut'
      };
    });
  }, [editingGeneratedRecordId, generatorDraft.selectedKey, nextTherapySessionOrder]);

  useEffect(() => {
    if (!KA02_STRUCTURED_FORM_KEYS.includes(generatorDraft.selectedKey) || editingGeneratedRecordId) return;
    const workerByDocument = {
      debt: 'Dluhový poradce',
      therapy: 'Terapeut',
      cv: 'Pracovní poradce',
      simulator: 'Pracovní poradce'
    };    const consultationWorkers = ['Soci\u00e1ln\u00ed pracovn\u00edk', 'Case manager'];
    const targetWorker = workerByDocument[generatorDraft.selectedKey];
    setGeneratorDraft((prev) => {
      if (targetWorker && prev.worker !== targetWorker) return { ...prev, worker: targetWorker };
      if (prev.selectedKey === 'consultation' && !consultationWorkers.includes(prev.worker)) {
        return { ...prev, worker: 'Soci\u00e1ln\u00ed pracovn\u00edk' };
      }
      return prev;
    });
  }, [editingGeneratedRecordId, generatorDraft.selectedKey]);

  useEffect(() => {
    setZorTexts(null);
  }, [dashboardFilters.period]);

  const setFlash = (message) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 3000);
  };

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
        clientIds: Array.isArray(record.clientIds) ?record.clientIds : [],
        clientName: record.clientName || '',
        title: record.title || '',
        documentText: cleanGeneratedText(record.documentText || ''),
        payload: record.payload || {},
        indicatorFlags: record.indicatorFlags || {}
      })
    );

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

  const persistClientDriveBundleRecord = async (client, bundleResult) => {
    const existingRecord = records.find(
      (record) => record.entityType === 'client_folder_bundle' && record.clientId === client.id
    );
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

    if (!hasFirebaseConfig || !db) {
      const nextRecord = existingRecord
        ? { ...existingRecord, ...payload, createdAt: existingRecord.createdAt || Date.now() }
        : { ...payload, id: `local-drive-bundle-${client.id}`, createdAt: Date.now() };
      const nextRecords = existingRecord
        ? records.map((record) => (record.id === existingRecord.id ? nextRecord : record))
        : [nextRecord, ...records];
      setRecords(nextRecords);
      saveLocalRecords(nextRecords);
      return;
    }

    const recordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projectRecords');
    if (existingRecord?.id) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projectRecords', existingRecord.id), {
        ...payload,
        createdAt: existingRecord.createdAt || Date.now()
      });
      return;
    }

    await addDoc(recordsRef, {
      ...payload,
      createdAt: Date.now()
    });
  };

  const provisionClientDriveFolder = async (client, { silent = false, manageState = true } = {}) => {
    if (!GOOGLE_SHEET_MACRO_URL) {
      if (!silent) setFlash('Propojen\u00ed s Google Diskem nen\u00ed nastaven\u00e9.');
      return false;
    }

    if (manageState) setIsProvisioningClientFolder(true);
    try {
      const response = await fetch(GOOGLE_SHEET_MACRO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          token: import.meta.env?.VITE_CLIENTS_API_TOKEN || '',
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
      if (!bundleResult.clientFolderUrl) throw new Error('Apps Script nevr\u00e1til odkaz na slo\u017eku klienta.');

      await persistClientDriveBundleRecord(client, bundleResult);
      if (!silent) setFlash('Slo\u017eka klienta a monitorovac\u00ed list byly p\u0159ipraveny.');
      return true;
    } catch (error) {
      console.error('Client Drive folder provisioning error:', error);
      if (!silent) setFlash(error.message || 'Slo\u017eku klienta se nepoda\u0159ilo vytvo\u0159it.');
      return false;
    } finally {
      if (manageState) setIsProvisioningClientFolder(false);
    }
  };

  const provisionAllClientDriveFolders = async () => {
    if (!GOOGLE_SHEET_MACRO_URL) {
      setFlash('Google Drive propojení zatím není nastavené.');
      return;
    }

    const clientsWithoutFolder = clients.filter(
      (client) => !client.driveFolderUrl && !records.some((record) => record.entityType === 'client_folder_bundle' && record.clientId === client.id)
    );
    if (!clientsWithoutFolder.length) {
      setFlash('Všichni klienti už mají založenou Drive složku.');
      return;
    }

    setIsProvisioningClientFolder(true);
    let createdCount = 0;
    try {
      for (const client of clientsWithoutFolder) {
        const ok = await provisionClientDriveFolder(client, { silent: true, manageState: false });
        if (ok) createdCount += 1;
      }
      setFlash(`Drive složky byly vytvořeny pro ${createdCount} z ${clientsWithoutFolder.length} klientů.`);
    } finally {
      setIsProvisioningClientFolder(false);
    }
  };


  const postGoogleSheetAction = async (payload) => {
    if (!GOOGLE_SHEET_MACRO_URL) return null;
    const response = await fetch(GOOGLE_SHEET_MACRO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: import.meta.env?.VITE_CLIENTS_API_TOKEN || '', ...payload })
    });
    if (!response.ok) throw new Error('Google Sheet akce selhala: ' + response.status);
    const result = await response.json().catch(() => ({}));
    if (result.ok === false) throw new Error(result.error || 'Google Sheet akce selhala.');
    return result;
  };

  const syncRecordToGoogleSheet = async (record) => {
    if (!GOOGLE_SHEET_MACRO_URL || record.entityType === 'ai_style_memory') return record;
    const payload = record.payload || {};

    if (record.entityType === 'actor_registry') {
      const result = await postGoogleSheetAction({
        action: 'savePartner',
        partner: {
          partner_id: String(record.id || '').startsWith('local-') ? '' : record.id || '',
          nazev_subjektu: payload.name || record.title || '',
          typ_aktera: payload.actorType || '',
          puvod_site: payload.networkOrigin || 'st\u00e1vaj\u00edc\u00ed',
          datum_zapojeni: payload.joinedNetworkDate || record.activityDate || '',
          kontaktni_osoba: payload.contactName || [payload.contactTitle, payload.contactFirstName, payload.contactLastName].filter(Boolean).join(' '),
          funkce: payload.contactRole || payload.role || '',
          telefon: payload.phone || '',
          email: payload.email || '',
          status: 'Platn\u00fd'
        }
      });
      return { ...record, id: result?.partner?.partner_id || record.id };
    }

    if (record.entityType === 'network_activities') {
      const result = await postGoogleSheetAction({
        action: 'saveNetworkMeeting',
        networkMeeting: {
          schuzka_site_id: String(record.id || '').startsWith('local-') ? '' : record.id || '',
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
          status: 'Platn\u00fd'
        }
      });
      return { ...record, id: result?.networkMeeting?.schuzka_site_id || record.id };
    }

    if (record.entityType === 'plans') {
      const sourceGoals = Array.isArray(payload.structuredGoals)
        ? payload.structuredGoals
        : Array.isArray(payload.goals)
          ? payload.goals
          : [];
      const normalizedGoals = sourceGoals.length
        ? sourceGoals.map((goal, index) => ({
            goalId: goal.goalId || goal.id || ('goal-' + (index + 1)),
            goalDescription: goal.goalDescription || goal.description || '',
            actionSteps: Array.isArray(goal.actionSteps) ? goal.actionSteps.join('\n') : goal.actionSteps || '',
            targetDate: goal.targetDate && typeof goal.targetDate.toDate === 'function'
              ? goal.targetDate.toDate().toISOString().slice(0, 10)
              : String(goal.targetDate || goal.deadline || '').slice(0, 10),
            isCompleted: Boolean(goal.isCompleted),
            goalEvaluation: goal.goalEvaluation || ''
          }))
        : [{
            goalId: 'goal-1',
            goalDescription: typeof payload.goals === 'string' ? payload.goals : '',
            actionSteps: payload.plannedSteps || '',
            targetDate: '',
            isCompleted: false,
            goalEvaluation: ''
          }];
      const result = await postGoogleSheetAction({
        action: 'saveIndividualPlan',
        individualPlan: {
          plan_id: String(record.id || '').startsWith('local-') ? '' : record.id || '',
          klient_id: record.clientId || '',
          silne_stranky_limity: payload.strengthsAndLimits || payload.currentSituation || '',
          identifikovane_bariery_potreby: payload.identifiedBarriers || payload.barriers || '',
          cile_json: JSON.stringify(normalizedGoals),
          zaverecne_vyhodnoceni: payload.finalEvaluation || '',
          accepted_plan_text: payload.acceptedPlanText || record.documentText || '',
          status: 'Platn\u00fd'
        }
      });
      return {
        ...record,
        id: result?.individualPlan?.plan_id || record.id,
        goals: normalizedGoals,
        payload: { ...payload, structuredGoals: normalizedGoals }
      };
    }

    if (record.clientId && payload.caseManagementMode) {
      const result = await postGoogleSheetAction({
        action: 'saveMeeting',
        meeting: {
          meeting_id: String(record.id || '').startsWith('local-') ? '' : record.id || '',
          klient_id: record.clientId || '',
          case_management_id: '',
          datum: record.activityDate || '',
          cas_od: payload.startTime || payload.ka02StartTime || '',
          cas_do: payload.endTime || payload.ka02EndTime || '',
          pocet_hodin: payload.durationMinutes ? Math.round((Number(payload.durationMinutes) / 60) * 100) / 100 : '',
          typ_podpory: payload.consultationType || 'case management - individu\u00e1ln\u00ed pr\u00e1ce s klientem',
          tema_podpory: payload.supportArea || '',
          forma_poskytovani: 'ambulantn\u00ed',
          cil_ip_id: payload.linkedPlanGoalId || '',
          cil_ip: payload.linkedPlanGoalLabel || '',
          partner_ids: Array.isArray(payload.selectedPartnerIds) ? payload.selectedPartnerIds.join(';') : payload.selectedPartnerIds || '',
          partneri: Array.isArray(payload.partnerNames) ? payload.partnerNames.join('; ') : payload.partners || payload.partnerNames || '',
          ucastnici: Array.isArray(payload.partnerNames) ? payload.partnerNames.join('; ') : payload.partners || '',
          pocet_akteru: Number(payload.participantCount || 0),
          popis: payload.topics || '',
          vysledek: payload.outcome || '',
          dalsi_krok: payload.nextSteps || '',
          dokument_text: record.documentText || '',
          status: 'Platn\u00fd'
        }
      });
      return { ...record, id: result?.meeting?.meeting_id || record.id };
    }

    if (record.clientId) {
      const result = await postGoogleSheetAction({
        action: 'savePerformance',
        performance: {
          vykon_id: String(record.id || '').startsWith('local-') ? '' : record.id || '',
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
          status: 'Platn\u00fd'
        }
      });
      return { ...record, id: result?.performance?.vykon_id || record.id };
    }

    return record;
  };
  const saveRecord = async (payload) => {
    const duplicateMessage = getDuplicateSaveMessage(payload);
    if (duplicateMessage) {
      setFlash(duplicateMessage);
      return false;
    }
    if (!user && hasFirebaseConfig) {
      setFlash('Ulo\u017een\u00ed do Google Sheetu se nepoda\u0159ilo. Zkontroluj p\u0159ipojen\u00ed a nasazen\u00fd Apps Script.');
      return false;
    }
    if (!user) {
      setFlash('Záznam nelze uložit bez přihlášeného uživatele.');
      return false;
    }

    setIsSaving(true);
    try {
      if (!hasFirebaseConfig || !db) {
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
          saveLocalRecords(nextRecords);
          return nextRecords;
        });
        if (syncedRecord.entityType !== 'ai_style_memory') {
          await syncRecordToGoogleDrive(syncedRecord);
        }
        return true;
      }

      const recordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projectRecords');
      const recordToSave = {
        ...payload,
        createdAt: Date.now()
      };
      const docRef = await addDoc(recordsRef, recordToSave);
      const syncedRecord = await syncRecordToGoogleSheet({ ...recordToSave, id: recordToSave.id || docRef.id });
      if (syncedRecord.entityType !== 'ai_style_memory') {
        await syncRecordToGoogleDrive(syncedRecord);
      }
      return true;
    } catch (error) {
      console.error('Error saving record:', error);
      setFlash('Uložení záznamu selhalo.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateExistingRecord = async (recordId, payload) => {
    const existingRecord = records.find((record) => record.id === recordId);
    if (!existingRecord) {
      setFlash('Upravovaný záznam už v evidenci není.');
      return false;
    }

    setIsSaving(true);
    try {
      const updatedRecord = {
        ...existingRecord,
        ...payload,
        id: existingRecord.id,
        createdAt: existingRecord.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      if (!hasFirebaseConfig || !db) {
        const syncedRecord = await syncRecordToGoogleSheet(updatedRecord);
        const nextRecords = records.map((record) => (record.id === recordId ? syncedRecord : record));
        setRecords(nextRecords);
        saveLocalRecords(nextRecords);
        if (syncedRecord.entityType !== 'ai_style_memory') {
          await syncRecordToGoogleDrive(syncedRecord);
        }
        return true;
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projectRecords', recordId), {
        ...payload,
        createdAt: existingRecord.createdAt || Date.now(),
        updatedAt: Date.now()
      });
      const syncedRecord = await syncRecordToGoogleSheet(updatedRecord);
      if (syncedRecord.entityType !== 'ai_style_memory') {
        await syncRecordToGoogleDrive(syncedRecord);
      }
      return true;
    } catch (error) {
      console.error('Update record error:', error);
      setFlash('Úprava záznamu selhala.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };


  const deleteGoogleSheetRecord = async (record) => {
    if (!GOOGLE_SHEET_MACRO_URL || !record?.id || String(record.id).startsWith('local-')) return;
    let action = '';
    if (record.entityType === 'consultations') {
      action = record.ka === 'KA2' || record.payload?.caseManagementMode ? 'deleteMeeting' : 'deletePerformance';
    } else if (record.entityType === 'actor_registry') {
      action = 'deletePartner';
    } else if (record.entityType === 'network_activities') {
      action = 'deleteNetworkMeeting';
    }
    if (action) await postGoogleSheetAction({ action, id: record.id });
  };

  const deleteRecord = async (record) => {
    if (!record?.id) return;
    const confirmed = window.confirm(`Opravdu smazat záznam "${record.title || 'bez názvu'}"?`);
    if (!confirmed) return;

    setIsSaving(true);
    const previousRecords = records;
    const nextRecords = records.filter((item) => item.id !== record.id);
    try {
      await deleteGoogleSheetRecord(record);
      setRecords(nextRecords);
      if (!hasFirebaseConfig || !db) {
        saveLocalRecords(nextRecords);
        setFlash('Záznam byl smazán.');
        return;
      }

      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projectRecords', record.id));
      setFlash('Záznam byl smazán.');
    } catch (error) {
      setRecords(previousRecords);
      console.error('Delete record error:', error);
      setFlash('Záznam se nepodařilo smazat.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClientCreate = async () => {
    if (!clientDraft.jmeno.trim() || !clientDraft.prijmeni.trim()) {
      setFlash('Vypl\u0148 alespo\u0148 jm\u00e9no a p\u0159\u00edjmen\u00ed klienta.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await postGoogleSheetAction({
        action: 'saveClient',
        client: mapClientDraftToSheetClient(clientDraft)
      });
      if (!result?.client?.klient_id) throw new Error('Google Sheet nevr\u00e1til ID klienta.');
      const savedClient = mapSheetRowToClient(result.client, clients.length);
      if (!savedClient) throw new Error('Ulo\u017een\u00e9ho klienta se nepoda\u0159ilo na\u010d\u00edst.');

      setClients((prev) => [savedClient, ...prev.filter((client) => client.id !== savedClient.id)]);
      setSelectedClientId(savedClient.id);
      setShowClientForm(false);
      setClientDraft({ ...emptyClientDraft, datumVstupu: todayIso() });
      setSheetError('');
      setFlash('Klient byl ulo\u017een do Google Sheetu.');
    } catch (error) {
      console.error('Google Sheets client save error:', error);
      setFlash('Klienta se nepoda\u0159ilo ulo\u017eit do Google Sheetu.');
    } finally {
      setIsSaving(false);
    }
  };

  const openClientEditForm = () => {
    if (!selectedClient) return;
    setClientEditDraft({
      ...emptyClientDraft,
      ...selectedClient
    });
    setShowClientEditForm(true);
  };

  const handleClientUpdate = async () => {
    if (!selectedClient) return;
    if (!clientEditDraft.jmeno.trim() || !clientEditDraft.prijmeni.trim()) {
      setFlash('Vypl\u0148 alespo\u0148 jm\u00e9no a p\u0159\u00edjmen\u00ed klienta.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await postGoogleSheetAction({
        action: 'saveClient',
        client: mapClientDraftToSheetClient(clientEditDraft, selectedClient.id)
      });
      if (!result?.client?.klient_id) throw new Error('Google Sheet nevr\u00e1til ID klienta.');
      const savedClient = mapSheetRowToClient(result.client, clients.findIndex((client) => client.id === selectedClient.id));
      if (!savedClient) throw new Error('Upraven\u00e9ho klienta se nepoda\u0159ilo na\u010d\u00edst.');

      setClients((prev) => prev.map((client) => (client.id === selectedClient.id ? savedClient : client)));
      setShowClientEditForm(false);
      setSheetError('');
      setFlash('Klient byl upraven v Google Sheetu.');
    } catch (error) {
      console.error('Google Sheets client update error:', error);
      setFlash('Zm\u011bny klienta se nepoda\u0159ilo ulo\u017eit do Google Sheetu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateText = async () => {
    if (!generatorClient) {
      setFlash('Vyber klienta, pro kterého chceš výstup připravit.');
      return;
    }
    const selectedTpmRecord =
      generatorDraft.selectedKey === 'mentor'
        ? tpmRecords.find((record) => record.id === generatorDraft.tpmRecordId) || null
        : null;
    if (generatorDraft.selectedKey === 'mentor' && !selectedTpmRecord) {
      setFlash('Pro zprávu mentora nejprve vyber uložené TPM.');
      return;
    }

    setIsGenerating(true);
    setAiGenerationStatus('loading');
    setGeneratedText('');
    setGenerationNotice('Generuji text přes Gemini 2.5...');

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const aiModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
    const maxOutputTokens = generatorDraft.selectedKey === 'therapy' ? 8192 : 4096;
    if (!apiKey) {
      const fallback = buildFallbackGeneratedText(generatorConfig.label, generatorClient, generatorDraft);
      setGeneratedText(fallback);
      setLastGeneratedText(fallback);
      setGeneratorDraft((prev) => ({ ...prev, generatedText: fallback }));
      setGenerationNotice('Gemini API klíč není nastavený. Zobrazuji pracovní návrh z formuláře.');
      setFlash('AI klíč není nastavený. Vytvořil jsem bezpečný pracovní návrh textu z formuláře.');
      setAiGenerationStatus('warning');
      setIsGenerating(false);
      return;
    }

    const previousRecordContext = buildPreviousRecordContext(previousGeneratorRecord);
    const styleMemoryContext = buildStyleMemoryContext(records, {
      selectedKey: generatorDraft.selectedKey,
      worker: generatorDraft.worker,
      maxItems: generatorDraft.selectedKey === 'therapy' ? 1 : 3
    });
    const isPersonalDevelopmentPlan = generatorDraft.selectedKey === 'plan';
    const kaActivityContext = generatorConfig.ka === 'KA02'
      ? KA02_ACTIVITY_AI_CONTEXT
      : generatorConfig.ka === 'KA03'
        ? KA03_ACTIVITY_AI_CONTEXT
        : '';
    const kaContextInstruction = kaActivityContext
      ? `Metodický kontext ${generatorConfig.ka} pro pochopení podpory:\n${kaActivityContext}\n\nTento kontext použij k věcnému zaměření výstupu, ale neopisuj jej mechanicky do zápisu.`
      : '';
    const outputModeInstruction = isPersonalDevelopmentPlan
      ? 'Lehká výjimka: u Plánu osobního rozvoje může být výstup plánovým projektovým dokumentem s cíli, bariérami a navazujícími kroky podpory. I zde ale vycházej pouze ze zadaných údajů a z role zvoleného pracovníka.'
      : `Zásadní pravidlo: výstup musí být vždy zápis o poskytnuté projektové podpoře v ${generatorConfig.ka || 'příslušné KA'}, ne hotový dokument pro klienta k přímému použití. Zohledni zaměření zvolené podpory "${generatorConfig.label}" a roli zvoleného pracovníka "${generatorDraft.worker || 'Neuvedeno'}". Pokud je zvolená podpora CV a motivační dopis, popiš průběh podpory při tvorbě těchto dokumentů, ale nevytvářej samotný životopis ani samotný motivační dopis.`;
    const mentorContextInstruction = (() => {
      if (generatorDraft.selectedKey !== 'mentor' || !selectedTpmRecord) return '';
      const tpmPayload = selectedTpmRecord.payload || {};
      const ka02RecordsForClient = records
        .filter((record) => record.clientId === generatorClient.id && ['plans', 'consultations', 'debt_cases', 'therapy_sessions', 'cv_outputs', 'job_simulators'].includes(record.entityType))
        .sort((a, b) => (`${b.activityDate || ''}-${b.createdAt || 0}`).localeCompare(`${a.activityDate || ''}-${a.createdAt || 0}`))
        .slice(0, 8);
      const ka02Context = ka02RecordsForClient.length
        ? ka02RecordsForClient
            .map((record, index) => {
              const text = cleanGeneratedText(record.documentText || '').replace(/\s+/g, ' ').trim();
              const brief = text ? text.slice(0, 260) : '';
              return `${index + 1}. ${record.activityDate || 'Bez data'} | ${record.title || record.entityType}${brief ? ` | ${brief}` : ''}`;
            })
            .join('\n')
        : 'Nebyly nalezeny dřívější zápisy klienta v KA02.';

      return [
        'Důležité: při tvorbě zprávy mentora vycházej z konkrétního vybraného TPM a z historie podpory klienta v KA02.',
        `Vybrané TPM (ID: ${selectedTpmRecord.id}):`,
        `- Klient: ${selectedTpmRecord.clientName || generatorClient.fullName}`,
        `- Zaměstnavatel: ${tpmPayload.employer || 'Neuvedeno'}`,
        `- Začátek TPM: ${tpmPayload.startDate || selectedTpmRecord.activityDate || 'Neuvedeno'}`,
        `- Konec TPM: ${tpmPayload.endDate || 'Neuvedeno'}`,
        `- Plánované měsíce: ${tpmPayload.plannedMonths ?? 'Neuvedeno'}`,
        `- Skutečné měsíce: ${tpmPayload.actualMonths ?? 'Neuvedeno'}`,
        '',
        'Dřívější zápisy klienta v KA02 (kontext):',
        ka02Context,
        '',
        'Tyto informace použij jako kontext pro průběh TPM, dosažený pokrok a realistická doporučení. Nic si nevymýšlej.'
      ].join('\n');
    })();

    const exactGeneratorFacts = buildExactGeneratorFacts(generatorConfig, generatorDraft);
    const promptParts = [
      {
        text: exactGeneratorFacts
      },
      {
        text: generatorConfig.buildUserPrompt({
          client: generatorClient,
          fields: generatorDraft
        })
      },
      {
        text: outputModeInstruction
      },
      ...(kaContextInstruction ?[{ text: kaContextInstruction }] : []),
      {
        text: 'Registrační údaje klienta jako postavení na trhu práce, vzdělání a znevýhodnění používej jen jako tichý kontext pro pochopení situace. Nevypisuj je ve výstupu mechanicky jako samostatné řádky. Pokud je hodnota neuvedená nebo nepodstatná pro konkrétní podporu, úplně ji vynech. Nikdy nepiš formulace typu "Znevýhodnění: Neuvedeno (bude doplněno při další spolupráci)".'
      },
      {
        text: 'Při zpracování vstupu oprav překlepy, pravopis a drobné jazykové chyby do spisovné češtiny, ale neměň význam, nedoplňuj fakta a nic si nevymýšlej.'
      }
    ];
    if (generatorDraft.bulletNotes.trim()) {
      promptParts.push({
        text: `Poznámky pracovníka v bodech nebo heslech:\n${generatorDraft.bulletNotes.trim()}\n\nZ těchto bodů vytvoř souvislý, čistý a věcný zápis.`
      });
    }
    if (previousRecordContext) {
      promptParts.push({
        text: `${previousRecordContext}\n\nPokud je to podle aktuálních vstupů relevantní, stručně popiš návaznost a změnu od minulého zápisu. Pokud změna není doložena, nic si nedomýšlej.`
      });
    }
    if (styleMemoryContext) {
      promptParts.push({
        text: styleMemoryContext
      });
    }
    if (mentorContextInstruction) {
      promptParts.push({
        text: mentorContextInstruction
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
            text: `Závazná data z formuláře: datum aktivity je "${generatorDraft.date || todayIso()}" a délka podpory je "${formatSupportDuration(getGeneratorSupportMinutes(generatorDraft))}". Tyto hodnoty ve výstupu použij přesně, neměň je a nedoplňuj jiné datum ani jiný rozsah podpory.`
          },
          {
            text: `${generatorConfig.buildSystemPrompt()}${kaContextInstruction ?`\n\n${kaContextInstruction}` : ''}\n\nNadřazené pravidlo pro typ výstupu: ${
              isPersonalDevelopmentPlan
                ? 'u Plánu osobního rozvoje vytváříš plánový projektový dokument; nejde o běžný zápis z konzultace, ale pořád musí odpovídat zadaným údajům, zaměření podpory a zvolenému pracovníkovi.'
                : 'vytváříš zápis o poskytnuté podpoře a pracovní aktivitě v projektu. Nevytvářej finální externí dokument pro klienta, pokud by to odporovalo zápisu do klientské složky.'
            } Text musí odpovídat zaměření podpory "${generatorConfig.label}" a zvolenému pracovníkovi "${generatorDraft.worker || 'Neuvedeno'}".\n\nRegistrační údaje klienta jako postavení na trhu práce, vzdělání a znevýhodnění jsou pouze kontext. Nevkládej je automaticky do výstupu jako samostatné položky. Vypiš je jen tehdy, když jsou věcně důležité pro konkrétní podporu nebo u Plánu osobního rozvoje pro stručnou identifikaci klienta. Neuvedené hodnoty zcela vynech.\n\nFormát výstupu: používej pouze čistý prostý text bez Markdownu. Nepoužívej hvězdičky, tučné zvýraznění, markdown nadpisy, odrážky s pomlčkou ani kódové bloky. Nadpisy piš jako běžné řádky bez speciálních znaků.`
          }
        ]
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens
      }
    };

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
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
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(retryPayload)
        });
        const retryResult = await retryResponse.json();
        if (!retryResponse.ok) {
          throw new Error(retryResult?.error?.message || `AI opakovany pozadavek selhal se stavem ${retryResponse.status}.`);
        }
        finalResult = retryResult;
        finishReason = finalResult?.candidates?.[0]?.finishReason || '';
        usedRetry = true;
      }
      let cleanText = cleanGeneratedText(extractGeminiText(finalResult));
      let outputCheck = inspectAiOutputCompleteness(cleanText, { finishReason });
      let continuationCount = 0;

      while (outputCheck.isSuspicious && continuationCount < 3) {
        const continuationPayload = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Původní zadání dokumentu:\n${exactGeneratorFacts}\n\n${generatorConfig.buildUserPrompt({
                    client: generatorClient,
                    fields: generatorDraft
                  })}`
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
                text: `${generatorConfig.buildSystemPrompt()}\n\nVrať pouze pokračování již rozepsaného dokumentu. Neopakuj začátek, nepřidávej omluvu ani technické vysvětlení. Zachovej prostý text bez Markdownu a dokonči rozpracovanou myšlenku přirozeně česky.`
              }
            ]
          },
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: generatorDraft.selectedKey === 'therapy' ? 4096 : 2048
          }
        };

        const continuationResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(continuationPayload)
        });
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

  const handleSaveGeneratedOutput = async () => {
    const selectedTpmRecord =
      generatorDraft.selectedKey === 'mentor'
        ? tpmRecords.find((record) => record.id === generatorDraft.tpmRecordId) || null
        : null;
    if (generatorDraft.selectedKey === 'mentor' && !selectedTpmRecord) {
      setFlash('Pro zprávu mentora vyber uložené TPM.');
      return;
    }
    if (!generatorClient) {
      setFlash('Vyber klienta.');
      return;
    }
    const isOneTimeOrder = generatorDraft.linkedPlanGoalId === 'one-time-order';
    if (
      generatorDraft.selectedKey !== 'plan' &&
      (!generatorDraft.linkedPlanGoalId || (!isOneTimeOrder && !generatorPlanGoalOptions.some((goal) => goal.value === generatorDraft.linkedPlanGoalId)))
    ) {
      setFlash(generatorPlanGoalOptions.length ? 'Vyber cíl z plánu osobního rozvoje.' : 'Nejdřív doplň cíl v plánu osobního rozvoje klienta.');
      return;
    }
    if (!generatedText.trim()) {
      setFlash('Nejprve vygeneruj nebo doplň text výstupu.');
      return;
    }

    const payload = buildGeneratorRecord({
      client: generatorClient,
      generatorDraft,
      generatedText,
      selectedTpmRecord
    });

    let ok = false;
    if (editingGeneratedRecordId) {
      ok = await updateExistingRecord(editingGeneratedRecordId, payload);
    } else if (generatorDraft.selectedKey === 'mentor' && payload.payload?.tpmRecordId) {
      const existingMentorReport = records
        .filter((record) => record.entityType === 'mentor_report_document')
        .find((record) => record.payload?.tpmRecordId === payload.payload.tpmRecordId);

      if (existingMentorReport) {
        setIsSaving(true);
        try {
          const updatedRecord = {
            ...existingMentorReport,
            ...payload,
            id: existingMentorReport.id,
            createdAt: existingMentorReport.createdAt || Date.now(),
            updatedAt: Date.now()
          };

          if (!hasFirebaseConfig || !db) {
            const nextRecords = records.map((record) => (record.id === existingMentorReport.id ? updatedRecord : record));
            setRecords(nextRecords);
            saveLocalRecords(nextRecords);
            ok = true;
          } else {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projectRecords', existingMentorReport.id), {
              ...payload,
              createdAt: existingMentorReport.createdAt || Date.now(),
              updatedAt: Date.now()
            });
            ok = true;
          }
        } catch (error) {
          console.error('Mentor report update error:', error);
          setFlash('Aktualizace zprávy mentora selhala.');
          ok = false;
        } finally {
          setIsSaving(false);
        }
      } else {
        ok = await saveRecord(payload);
      }
    } else {
      ok = await saveRecord(payload);
    }
    if (!ok) return;

    if (editingGeneratedRecordId) {
      setEditingGeneratedRecordId('');
      setGeneratedText('');
      setLastGeneratedText('');
      setGeneratorDraft((prev) => ({ ...prev, generatedText: '' }));
      setGenerationNotice('');
      setAiGenerationStatus('idle');
      setFlash('Záznam byl upraven.');
      return;
    }

    const generatorPromptSnapshot = generatorConfig.buildUserPrompt({
      client: generatorClient,
      fields: generatorDraft
    });
    const styleMemoryRecord = buildAiStyleMemoryRecord({
      client: generatorClient,
      generatorDraft,
      generatedText,
      promptText: [generatorPromptSnapshot, generatorDraft.bulletNotes || ''].filter(Boolean).join('\n\n'),
      config: generatorConfig
    });
    const memoryOk = await saveRecord(styleMemoryRecord);
    setGeneratedText('');
    setLastGeneratedText('');
    setGeneratorDraft((prev) => ({ ...prev, generatedText: '' }));
    setGenerationNotice('');
    setAiGenerationStatus('idle');
    if (memoryOk) {
      setFlash('Strukturovaný záznam, dokument i anonymizovaná AI stylová paměť byly uloženy.');
      return;
    }
    setFlash('Záznam a dokument byly uloženy, ale AI stylová paměť se neuložila.');
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

  const renderAiDocumentPanel = ({ allowedKeys, title, description, hideStyleFeedback = false, panelClassName = '', lockClientSelection = false }) => (
    <AiDocumentPanel
      allowedKeys={allowedKeys}
      title={title}
      description={description}
      reportPrompts={REPORT_PROMPTS}
      generatorDraft={generatorDraft}
      setGeneratorDraft={setGeneratorDraft}
      clients={clients}
      tpmRecords={tpmRecords}
      workers={WORKERS}
      lockClientSelection={lockClientSelection}
      lockedClientId={generatorDraft.clientId}
      lockedClientName={clientIndex[generatorDraft.clientId]?.fullName || ''}
      generatedText={generatedText}
      setGeneratedText={setGeneratedText}
      lastGeneratedText={lastGeneratedText}
      generationNotice={generationNotice}
      aiGenerationStatus={aiGenerationStatus}
      isGenerating={isGenerating}
      isSaving={isSaving}
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

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const aiModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
    if (!apiKey) {
      setFlash('AI korektura aktivity tvorby s\u00edt\u011b nen\u00ed dostupn\u00e1, proto\u017ee nen\u00ed nastaven\u00fd Gemini API kl\u00ed\u010d. Aktivita nebyla ulo\u017eena.');
      return null;
    }

    const isTeamMeeting = String(ka01Draft.networkType || '').trim().toLocaleLowerCase('cs') === 'porada';
    const currentParticipantNames = (ka01Draft.networkActorEntries || [])
      .map((entry) => getKa01ActorDisplayName(entry))
      .filter(Boolean);
    const currentParticipants = currentParticipantNames.join(', ') || String(ka01Draft.networkParticipants || '').trim();
    const currentParticipantCount = currentParticipantNames.length || Number(ka01Draft.networkCount || 0);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: [
                    'Vytvo\u0159 souvisl\u00fd projektov\u00fd z\u00e1pis aktivity KA02-Tvorba s\u00edt\u011b.',
                    KA01_ACTIVITY_AI_CONTEXT,
                    KA01_AI_OUTPUT_RULES,
                    getKa01PhaseGuidance(),
                    getKa01ActivityTypeGuidance(ka01Draft.networkType),
                    '',
                    'Dostupn\u00e1 data:',
                    'Typ aktivity: ' + (ka01Draft.networkType || ''),
                    'Po\u010det \u00fa\u010dastn\u00edk\u016f: ' + currentParticipantCount,
                    'Zapojen\u00e9 osoby: ' + currentParticipants,
                    'M\u00edsto: ' + (ka01Draft.networkPlace || ''),
                    'Obsah jedn\u00e1n\u00ed: ' + (ka01Draft.networkNotes || ''),
                    (isTeamMeeting ? '\u00dakoly: ' : 'V\u00fdsledek jedn\u00e1n\u00ed: ') + (ka01Draft.networkOutcome || ''),
                    (isTeamMeeting ? 'Term\u00edn a t\u00e9mata dal\u0161\u00edho jedn\u00e1n\u00ed: ' : 'Dal\u0161\u00ed kroky: ') + (ka01Draft.networkNextSteps || '')
                  ].join('\n')
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || 'AI korektura selhala.');
      const finishReason = result?.candidates?.[0]?.finishReason || '';
      if (finishReason === 'MAX_TOKENS') {
        throw new Error('AI vrátila useknutý text kvůli limitu délky. Aktivita nebyla uložena, zkus text zkrátit nebo uložit znovu.');
      }
      const rawText = extractGeminiText(result);
      const aiDescription = cleanGeneratedText(rawText)
        .replace(/^```(?:text)?/i, '')
        .replace(/```$/i, '')
        .replace(/^json\s*/i, '')
        .replace(/^\{[\s\S]*\}$/i, '')
        .replace(/(?:^|\s)Typ aktivity:\s*/gi, ' ')
        .replace(/(?:^|\s)Počet účastníků:\s*/gi, ' ')
        .replace(/(?:^|\s)Zapojení aktéři(?:\s*\/\s*Místo setkání| nebo účastníci)?:\s*/gi, ' ')
        .replace(/(?:^|\s)Místo jednání:\s*/gi, ' ')
        .replace(/(?:^|\s)Obsah a výsledek aktivity:\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!aiDescription) {
        throw new Error('AI nevrátila ucelený popis aktivity. Aktivita nebyla uložena.');
      }
      if (!/[.!?]$/.test(aiDescription)) {
        throw new Error('AI vrátila nedokončený popis aktivity. Aktivita nebyla uložena, zkus ji uložit znovu.');
      }
      return {
        ...ka01Draft,
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
      setFlash('Nejprve vypl\u0148 obsah jedn\u00e1n\u00ed.');
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
      setKa01NetworkTimeError('Nutn\u00e9 doplnit \u010das od a do.');
      return;
    }
    if (!String(ka01Draft.networkNotes || '').trim()) {
      setFlash('Vypl\u0148 obsah jedn\u00e1n\u00ed.');
      return;
    }
    setKa01NetworkTimeError('');
    setIsSaving(true);
    const polishedDraft = await polishKa01NetworkDraft();
    setIsSaving(false);
    if (!polishedDraft) return;
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
      ? await updateExistingRecord(editingKa01NetworkRecordId, recordPayload)
      : await saveRecord(recordPayload);
    if (!ok) return;
    ka01NetworkPendingIdRef.current = '';

    try {
      const url = new URL(GOOGLE_SHEET_MACRO_URL);
      url.searchParams.set('action', 'listNetworkMeetings');
      const token = import.meta.env?.VITE_CLIENTS_API_TOKEN || '';
      if (token) url.searchParams.set('token', token);
      const response = await fetch(url.toString());
      const json = await response.json();
      if (!response.ok || json.ok === false) throw new Error(json.error || 'Na?ten? sch?zek selhalo.');
      const remoteNetworkRecords = mapSheetRecordsToAppRecords({ networkMeetings: json.networkMeetings || [] }, clientIndex);
      setRecords((previous) => {
        const otherRecords = previous.filter((record) => record.entityType !== 'network_activities');
        const merged = [...remoteNetworkRecords, ...otherRecords].sort(compareTimelineRecordsDesc);
        if (!hasFirebaseConfig || !db) saveLocalRecords(merged);
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

  const handleSaveKa01ActorRegistry = async () => {
    const name = String(ka01ActorDraft.name || '').trim();
    const origin = String(ka01ActorDraft.networkOrigin || '').trim();
    const contactName = String(ka01ActorDraft.contactName || '').trim();
    if (!name) { setFlash('Vypl\u0148 n\u00e1zev subjektu.'); return; }
    if (!ka01ActorDraft.actorType) { setFlash('Vyber typ akt\u00e9ra.'); return; }
    if (!origin) { setFlash('Vyber p\u016fvod s\u00edt\u011b.'); return; }
    if (origin.toLowerCase().includes('nov') && !ka01ActorDraft.joinedNetworkDate) {
      setFlash('U nov\u011b zapojen\u00e9ho akt\u00e9ra dopl\u0148 datum zapojen\u00ed.');
      return;
    }

    const editingId = ka01ActorDraft.id || '';
    const duplicate = records.find((record) =>
      record.entityType === 'actor_registry'
      && record.id !== editingId
      && String(record.payload?.name || '').trim().toLowerCase() === name.toLowerCase()
      && String(record.payload?.contactName || '').trim().toLowerCase() === contactName.toLowerCase()
    );
    if (duplicate) { setFlash('Tento subjekt a kontaktn\u00ed osoba u\u017e jsou v registru.'); return; }

    const tokens = contactName.split(/\s+/).filter(Boolean);
    const titlePattern = /^(Mgr\.?|Ing\.?|Bc\.?|JUDr\.?|MUDr\.?|PhDr\.?|doc\.?|prof\.?|DiS\.?)$/i;
    const contactTitle = tokens.length && titlePattern.test(tokens[0]) ? tokens.shift() : '';
    const contactFirstName = tokens.shift() || '';
    const contactLastName = tokens.join(' ');
    const actorRecord = {
      entityType: 'actor_registry',
      ka: 'KA2',
      title: 'Registr akt\u00e9ra - ' + name,
      activityDate: ka01ActorDraft.joinedNetworkDate || todayIso(),
      worker: ka01Draft.worker || '',
      clientIds: [],
      documentText: '',
      payload: {
        id: editingId,
        name,
        actorType: ka01ActorDraft.actorType,
        networkOrigin: origin,
        joinedNetworkDate: origin.toLowerCase().includes('nov') ? ka01ActorDraft.joinedNetworkDate : '',
        contactName,
        contactTitle,
        contactFirstName,
        contactLastName,
        contactRole: String(ka01ActorDraft.contactRole || '').trim(),
        phone: String(ka01ActorDraft.phone || '').trim(),
        email: String(ka01ActorDraft.email || '').trim(),
        cooperationStatus: 'aktivn\u011b zapojen'
      },
      indicatorFlags: { ka01NetworkSize: 1 }
    };

    const ok = editingId
      ? await updateExistingRecord(editingId, actorRecord)
      : await saveRecord(actorRecord);
    if (!ok) return;
    setFlash(editingId ? 'Akt\u00e9r byl upraven.' : 'Akt\u00e9r byl ulo\u017een do registru.');
    setKa01ActorDraft((previous) => ({
      ...previous,
      ...KA01_EMPTY_ACTOR_ROLES,
      id: '', name: '', networkOrigin: '', actorType: 'obec / m\u011bsto',
      ico: '', municipality: '', web: '', contactTitle: '', contactFirstName: '', contactLastName: '',
      contactName: '', contactRole: '', phone: '', email: '', joinedNetworkDate: '',
      communicationNote: '', lastContactDate: '', inactivityReason: ''
    }));
  };
  const handleEditKa01ActorRegistry = (record) => {
    const payload = record.payload || {};
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
      id: record.id
    });
    setFlash('Karta aktéra byla načtena k úpravě.');
  };

  const toggleKa01ActorAttendance = (recordId, checked) => {
    setKa01AttendanceSelection((prev) => ({
      ...prev,
      [recordId]: Boolean(checked)
    }));
  };

  const exportKa01AttendanceSheet = async () => {
    const selected = ka01ActorRegistryRecords.filter((record) => {
      if (!ka01AttendanceSelection[record.id]) return false;
      const payload = record.payload || {};
      const fullName = String(payload.contactName || '').trim();
      const fallbackTokens = fullName.split(/\s+/).filter(Boolean);
      const titleRegex = /^(Mgr\.?|Ing\.?|Bc\.?|JUDr\.?|MUDr\.?|PhDr\.?|doc\.?|prof\.?|DiS\.?)$/i;
      const title = String(payload.contactTitle || '').trim()
        || (fallbackTokens.length > 0 && titleRegex.test(fallbackTokens[0]) ? fallbackTokens[0] : '');
      const firstName = String(payload.contactFirstName || '').trim()
        || (fallbackTokens.length > 0 ? (title ? (fallbackTokens[1] || '') : fallbackTokens[0]) : '');
      const lastName = String(payload.contactLastName || '').trim()
        || (fallbackTokens.length > 0 ? fallbackTokens.slice(title ? 2 : 1).join(' ') : '');
      const subject = String(payload.name || '').trim();
      return Boolean(firstName && lastName && subject);
    });

    if (selected.length === 0) {
      setFlash('Označ alespoň jednoho aktéra s vyplněným jménem, příjmením a subjektem.');
      return;
    }

    const rows = selected.map((record, index) => {
      const payload = record.payload || {};
      const fullName = String(payload.contactName || '').trim();
      const fallbackTokens = fullName.split(/\s+/).filter(Boolean);
      const titleRegex = /^(Mgr\.?|Ing\.?|Bc\.?|JUDr\.?|MUDr\.?|PhDr\.?|doc\.?|prof\.?|DiS\.?)$/i;
      const title = String(payload.contactTitle || '').trim()
        || (fallbackTokens.length > 0 && titleRegex.test(fallbackTokens[0]) ? fallbackTokens[0] : '');
      const firstName = String(payload.contactFirstName || '').trim()
        || (fallbackTokens.length > 0 ? (title ? (fallbackTokens[1] || '') : fallbackTokens[0]) : '');
      const lastName = String(payload.contactLastName || '').trim()
        || (fallbackTokens.length > 0 ? fallbackTokens.slice(title ? 2 : 1).join(' ') : '');
      return {
        order: String(index + 1),
        firstName,
        lastName,
        organization: String(payload.name || '').trim(),
        role: String(payload.contactRole || '').trim()
      };
    });

    setFlash('Připravuji PDF prezenční listiny...');
    try {
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

      const wrapper = document.createElement('div');
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
            <h1 style="margin:0 0 8px 0;font-size:34px;line-height:1.2;">KA2 - Prezen\u010dn\u00ed listina akt\u00e9r\u016f s\u00edt\u011b</h1>
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
      document.body.removeChild(wrapper);

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
      setFlash(`Prezenční listina byla stažena do PDF pro ${selected.length} aktérů.`);
    } catch (error) {
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
      setFlash('Vyber klienta pro KA03 aktivitu.');
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
      setFlash(editingKa03RecordId ?'Záznam KA03 byl upraven.' : 'Záznam KA03 byl uložen.');
    }
  };

  const openClient = (clientId, nextView = 'clients') => {
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

  const formatHoursForExport = (hours) => {
    const safeHours = Number(hours || 0);
    const totalMinutes = Math.round(safeHours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const decimalHours = (totalMinutes / 60).toFixed(1).replace('.', ',');
    return `${decimalHours} hod (${String(wholeHours).padStart(2, '0')}hod${String(minutes).padStart(2, '0')}min)`;
  };

  const getClientDashboardExportStats = (clientId) => {
    const clientRecords = records.filter((record) => {
      const clientIds = Array.isArray(record.clientIds) ? record.clientIds : record.clientId ? [record.clientId] : [];
      return clientIds.includes(clientId);
    });

    const minutesFor = (predicate) => clientRecords
      .filter(predicate)
      .reduce((sum, record) => sum + Number(record.payload?.durationMinutes || 0), 0);

    const workCounselingMinutes = minutesFor((record) =>
      record.entityType === 'consultations' && String(record.payload?.consultationType || '').toLowerCase().includes('pracovn')
    );
    const debtCounselingMinutes = minutesFor((record) => {
      const consultationType = String(record.payload?.consultationType || '').toLowerCase();
      const title = String(record.title || '').toLowerCase();
      return record.entityType === 'debt_cases' ||
        (record.entityType === 'consultations' && (consultationType.includes('dluh') || consultationType.includes('mapov') || title.includes('mapov')));
    });
    const tpmMonths = clientRecords
      .filter((record) => record.entityType === 'tpm_records')
      .reduce((sum, record) => sum + Number(record.payload?.actualMonths || record.payload?.plannedMonths || 0), 0);
    const employmentMonths = clientRecords
      .filter((record) => record.entityType === 'employment_records')
      .reduce((sum, record) => sum + Number(record.payload?.employmentActualMonths || record.payload?.employmentPlannedMonths || 0), 0);

    return {
      workCounselingHours: workCounselingMinutes / 60,
      debtCounselingHours: debtCounselingMinutes / 60,
      tpmMonths,
      employmentMonths
    };
  };
  const exportActivitiesCsv = () => {
    const rows = filteredRecords.map((record) => [
      record.activityDate || '',
      record.ka || '',
      record.entityType || '',
      record.title || '',
      record.worker || '',
      record.clientName || '',
      truncate(record.documentText || '', 120)
    ]);

    downloadCsv(
      ['Datum', 'KA', 'Entita', 'Název', 'Pracovník', 'Klient', 'Text'],
      rows,
      'aktivity-projektu.csv'
    );
  };

  const exportClientsCsv = () => {
    const rows = clients.map((client) => {
      const clientStats = getClientStats(client.id, records);
      const dashboardStats = getClientDashboardExportStats(client.id);
      return [
        client.id,
        client.fullName,
        client.mesto,
        client.postaveniNaTrhu,
        client.vzdelani,
        client.znevyhodneni,
        client.projectStatusLabel,
        client.datumVstupu || '',
        client.datumVystupu || '',
        clientStats.activities,
        formatHoursForExport(clientStats.supportHours),
        formatHoursForExport(dashboardStats.workCounselingHours),
        formatHoursForExport(dashboardStats.debtCounselingHours),
        dashboardStats.tpmMonths,
        dashboardStats.employmentMonths
      ];
    });

    downloadCsv(
      [
        'Interní ID',
        'Klient',
        'Obec',
        'Postavení na trhu',
        'Vzdělání',
        'Znevýhodnění',
        'Status',
        'Datum vstupu',
        'Datum výstupu',
        'Počet aktivit',
        'Celková podpora',
        'z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed',
        'Dluhové poradenství',
        'TPM měsíce',
        'HPP měsíce'
      ],
      rows,
      'klienti-projektu.csv'
    );
  };

  const exportAllRecordsBackup = () => {
    const content = buildAllRecordsBackupHtml(records, clients);
    downloadHtmlDocument(content, `zaloha-vsech-zapisu-${todayIso()}.doc`);
  };
  const exportIndicatorsCsv = () => {
    const rows = computedIndicators.map((item) => [
      item.ka,
      item.label,
      item.current,
      item.target,
      item.currentIds.join(', ')
    ]);

    downloadCsv(['KA', 'Indikátor', 'Hodnota', 'Cíl', 'Zdroje'], rows, 'indikatory-projektu.csv');
  };

  const exportClientFolder = () => {
    if (!selectedClient) return;
    const content = buildClientFolderHtml(selectedClient, clientJourneyTimeline);
    downloadHtmlDocument(content, `slozka-klienta-${slugify(selectedClient.fullName)}.doc`);
  };

  const summarizeClientCase = async () => {
    if (!selectedClient) return;
    const fallbackSummary = buildClientCaseSummary(selectedClient, clientJourneyTimeline, selectedClientSupportBreakdown);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const aiModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      setClientCaseSummary(fallbackSummary);
      copyToClipboard(fallbackSummary, setCopied);
      setFlash('AI klíč není nastavený. Připravil jsem strukturovaný souhrn bez AI a zkopíroval ho do schránky.');
      return;
    }

    setIsSummarizingCase(true);
    setFlash('Připravuji AI souhrn zakázky klienta...');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildAiClientCaseSummaryPrompt(selectedClient, clientJourneyTimeline, selectedClientSupportBreakdown) }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192
          }
        })
      });
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
    'JSON musí mít klíče: strengthsAndLimits, identifiedBarriers, goals, finalEvaluation, acceptedPlanText.',
    'Pole goals musí být pole objektů se stejnými goalId jako ve vstupu. Neměň goalId, nemaž cíle, nepřidávej nové cíle a neměň termíny. Termín můžeš opsat pouze do acceptedPlanText.',
    'Smíš zlepšit a rozvést formulace v polích strengthsAndLimits, identifiedBarriers, goals[].goalDescription a goals[].actionSteps. Zachovej ale původní význam.',
    'acceptedPlanText vytvoř jako čitelný souvislý plán pro klientskou složku podle těchto stejných polí. Neuváděj věty typu "Žádná specifická data nebyla poskytnuta".',
    'Nepřidávej nová fakta, diagnózy, zaměstnavatele, termíny ani výsledky.',
    '',
    'Aktuální struktura formuláře KA02:',
    JSON.stringify(buildStructuredPlanForAi(record), null, 2)
  ].join('\n');

  const handleGenerateJourneyPlanDraft = async (record) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const aiModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
    if (!apiKey) {
      const fallbackRecord = buildPlanRecordWithStructuredDraft(record, buildStructuredPlanForAi(record), selectedClient);
      setJourneyPlanStructuredDrafts((prev) => ({ ...prev, [record.id]: buildStructuredPlanForAi(record) }));
      setJourneyPlanDrafts((prev) => ({ ...prev, [record.id]: buildPersonalDevelopmentPlanText(fallbackRecord, selectedClient) }));
      setFlash('AI klíč není nastavený. Vložil jsem strukturovaný návrh bez AI.');
      return;
    }

    setGeneratingJourneyPlanId(record.id);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildJourneyPlanAiPrompt(record) }] }],
          systemInstruction: {
            parts: [{ text: 'Jsi zkušený pracovní poradce v projektu OPZ+. Vylepšuješ strukturovaný individuální plán rozvoje, ale zachováváš vazby na cíle. Vracej pouze validní JSON podle požadovaného schématu.' }]
          },
          generationConfig: { temperature: 0.45, maxOutputTokens: 6144 }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || `AI požadavek selhal se stavem ${response.status}.`);
      const structuredDraft = parseStructuredPlanAiResult(extractGeminiText(result), record);
      const previewRecord = buildPlanRecordWithStructuredDraft(record, structuredDraft, selectedClient);
      const text = buildPersonalDevelopmentPlanText(previewRecord, selectedClient);
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
      job_simulators: 'simulator',
      mentor_report_document: 'mentor'
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
        supportSpecific: payload.supportSpecific || {},
        topics: payload.topics || '',
        outcome: payload.outcome || '',
        nextSteps: payload.nextSteps || payload.progressSummary || '',
        selectedPartnerIds: payload.selectedPartnerIds || [],
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
      setMainView(record.entityType === 'mentor_report_document' ? 'ka03' : 'ka02');
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
      setMainView('ka03');
      setFlash('Záznam KA03 byl načten k úpravě.');
      return;
    }

    setFlash('Tento typ záznamu zatím nemá editační formulář.');
  };

  const exportKa01NetworkDocx = async (record) => {
    if (!record) return;
    const description = record.payload?.description || record.payload?.notes || '';
    const filenameParts = [
      record.activityDate || todayIso(),
      'KA01',
      record.payload?.type || record.title || 'aktivita'
    ];

    try {
      const response = await fetch('/api/export-record-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: `${slugify(filenameParts.join('-'))}.docx`,
          title: record.title || 'KA2 - aktivita',
          activityDate: record.activityDate || '',
          ka: record.ka || 'KA01',
          worker: record.worker || '',
          text: description,
          rows: [
            { label: 'Datum', value: record.activityDate || '' },
            { label: 'Typ aktivity', value: record.payload?.type || record.payload?.networkType || record.title || '' },
            { label: 'Počet účastníků', value: record.payload?.count ?? '' },
            { label: 'OD', value: record.payload?.startTime || '' },
            { label: 'DO', value: record.payload?.endTime || '' },
            { label: 'Trvání', value: record.payload?.duration || formatDurationFromTimes(record.payload?.startTime, record.payload?.endTime) },
            { label: 'Pracovník', value: record.worker || '' },
            { label: 'Zapojení aktéři', value: record.payload?.participants || '' },
            { label: 'Místo jednání', value: record.payload?.place || '' },
            { label: 'Obsah a výsledek aktivity', value: record.payload?.notes || '' },
            { label: 'Popis aktivity', value: description }
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
      setFlash('Aktivita tvorby s\u00edt\u011b byla stažena do DOCX.');
    } catch (error) {
      console.error('KA01 DOCX export error:', error);
      setFlash(error.message || 'Export aktivity tvorby s\u00edt\u011b do DOCX selhal.');
    }
  };

  const exportKa01NetworkBulk = async () => {
    let exportRecords = ka01NetworkRecords;
    if (GOOGLE_SHEET_MACRO_URL) {
      try {
        const url = new URL(GOOGLE_SHEET_MACRO_URL);
        url.searchParams.set('action', 'listNetworkMeetings');
        const token = import.meta.env?.VITE_CLIENTS_API_TOKEN || '';
        if (token) url.searchParams.set('token', token);
        const response = await fetch(url.toString());
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

  const handleGenerateZorTexts = () => {
    if (!selectedReportingPeriod || selectedReportingPeriod.value === 'all') {
      setFlash('Nejprve vyber konkrétní vykazované období.');
      return;
    }

    const recordsByKa = {
      KA01: periodRecordsForZor.filter((record) => record.ka === 'KA01'),
      KA02: periodRecordsForZor.filter((record) => record.ka === 'KA02'),
      KA03: periodRecordsForZor.filter((record) => record.ka === 'KA03' || ['tpm_records', 'mentoring_records', 'employment_records', 'mentor_report_document'].includes(record.entityType))
    };

    setZorTexts({
      periodLabel: selectedReportingPeriod.label,
      generatedAt: new Date().toISOString(),
      texts: {
        KA01: buildKa01ZorText(recordsByKa.KA01),
        KA02: buildKa02ZorText(recordsByKa.KA02),
        KA03: buildKa03ZorText(recordsByKa.KA03)
      }
    });
    setFlash(`Texty pro ZOR byly připraveny za období ${selectedReportingPeriod.label}.`);
  };

  const viewTheme = VIEW_THEMES[mainView] || VIEW_THEMES.clients;

  return (
    <div className={`relative min-h-screen overflow-hidden text-slate-800 transition-colors duration-500 ${viewTheme.page}`}>
      <div className={`pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full blur-3xl ${viewTheme.accent}`} />
      <div className="pointer-events-none absolute right-[-8rem] top-[22rem] h-96 w-96 rounded-full bg-white/35 blur-3xl" />
      <header className={`sticky top-0 z-10 border-b shadow-sm shadow-black/5 backdrop-blur-xl transition-colors duration-500 ${viewTheme.header}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${viewTheme.label}`}>Projektové výkaznictví</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">PODPORA SOCIÁLNÍ PRÁCE V MORAVSKÉM BEROUNĚ II</h1>
            </div>
            <div className="text-sm">
              <TopMetric label="Klienti v registru" value={String(clients.length)} icon={Users} tone="indigo" />              {false && <TopMetric
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
                return (
                  <button
                    key={item.id}
                    onClick={() => setMainView(item.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ?viewTheme.navActive
                        : viewTheme.navIdle
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </button>
                );
              })}
            </nav>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Hledat klienta nebo profil..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              {statusMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-7xl px-4 py-6 md:px-6">
        {firebaseAuthError && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {firebaseAuthError}
          </div>
        )}
        {sheetError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {sheetError}
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
                      onClick={() => setShowClientForm((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <Plus className="h-4 w-4" />
                      {showClientForm ?'Zavřít formulář' : 'Přidat klienta'}
                    </button>
                  </div>
                }
              >
                {showClientForm && (
                  <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <ClientRegistrationFields draft={clientDraft} setDraft={setClientDraft} compact />
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleClientCreate}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        <Save className="h-4 w-4" />
                        Uložit klienta
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {isLoadingClients ?(
                    <LoadingCard text="Načítám klienty z registru..." />
                  ) : (
                    filteredClientList.map((client) => {
                      const stats = getClientStats(client.id, records);
                      const active = client.id === selectedClientId;
                      return (
                        <button
                          key={client.id}
                          onClick={() => openClient(client.id)}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                            active
                              ?'border-indigo-200 bg-indigo-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">{client.fullName}</div>
                              <div className="mt-0.5 truncate text-xs text-slate-500">{client.mesto || 'Bez obce'} · {client.projectStatusLabel}</div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                          </div>
                          <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
                            <MiniBadge icon={Database} label={`ID ${client.id}`} tone="slate" />
                            <MiniBadge icon={Clock} label={`${stats.supportHours.toFixed(1)} h`} tone="indigo" />
                          </div>
                        </button>
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
                    description="Klientský detail kombinuje data z registru a interní projektové evidence."
                    icon={User}
                    action={
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={summarizeClientCase}
                          disabled={isSummarizingCase}
                          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSummarizingCase ?<Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCopy className="h-4 w-4" />}
                          Shrnout zakázku AI
                        </button>
                        <button
                          onClick={() => provisionClientDriveFolder(selectedClient)}
                          disabled={isProvisioningClientFolder}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isProvisioningClientFolder ?<Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                          Vytvoř složku klienta
                        </button>
                        <button
                          onClick={openClientEditForm}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
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
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowClientEditForm(false)}
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
                        </div>
                      </div>
                    )}
                    {clientCaseSummary && (
                      <div className="mb-2 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="text-sm font-bold text-indigo-900">Souhrn zakázky klienta</div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(clientCaseSummary, setCopied)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          >
                            <ClipboardCopy className="h-3.5 w-3.5" />
                            Kopírovat
                          </button>
                        </div>
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{clientCaseSummary}</pre>
                      </div>
                    )}
                    <div className="grid gap-2 xl:grid-cols-[1.55fr_0.85fr]">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {[
                          { key: 'address', icon: MapPin, label: 'Adresa', value: buildAddress(selectedClient) },
                          { key: 'contact', icon: Phone, label: 'Kontakt', value: selectedClient.telefon || selectedClient.email || 'Neuvedeno' },
                          { key: 'city', icon: Home, label: 'Spádové město', value: selectedClient.spadoveMesto || 'Neuvedeno' },
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
                          <DetailRow label="Datum vstupu" value={selectedClient.datumVstupu || 'Neuvedeno'} />
                          <DetailRow label="Datum výstupu" value={selectedClient.datumVystupu || 'Neuvedeno'} />
                          <DetailRow label="Situace po ukončení" value={selectedClient.situacePoUkonceni || 'Neuvedeno'} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2">
                      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Google Drive složka klienta</div>
                          <p className="mt-0.5 text-xs text-emerald-900">
                            {selectedClientDriveBundle
                              ?'Složka klienta a monitorovací list už jsou připravené.'
                              : 'Pro tohoto klienta zatím není připravená sdílená složka na Google Drive.'}
                          </p>
                        </div>
                        {selectedClientDriveBundle?.payload?.clientFolderUrl && (
                          <a
                            href={selectedClientDriveBundle.payload.clientFolderUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <DownloadCloud className="h-3.5 w-3.5" />
                            Otevřít složku
                          </a>
                        )}
                      </div>

                      {selectedClientDriveBundle?.payload ?(
                        <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                          {[
                            {
                              key: 'folder',
                              title: 'Klientská složka',
                              url: selectedClientDriveBundle.payload.clientFolderUrl,
                              caption: selectedClientDriveBundle.payload.clientFolderName
                            },,
                            {
                              key: 'monlist',
                              title: 'MON list',
                              url: selectedClientDriveBundle.payload.monListFileUrl,
                              caption: selectedClientDriveBundle.payload.monListFileName
                            }
                          ].map((item) => (
                            <a
                              key={item.key}
                              href={item.url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 transition hover:border-emerald-300 hover:bg-emerald-50"
                            >
                              <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                              <div className="truncate text-[11px] text-slate-500">{item.caption || 'Bez odkazu'}</div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-emerald-800">
                          Po kliknutí na <strong>Vytvoř složku klienta</strong> se založí složka klienta
                          a vytvoří nebo aktualizuje monitorovací list.
                        </div>
                      )}
                    </div>
                  </Panel>

                  <div className="grid gap-4">
                    <Panel title="Podpory podle typu" description="Počet podpor a čas podpory za jednotlivé typy klientských aktivit." icon={BarChart3}>
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
                                  <th className="px-3 py-2 text-right">Hodiny</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selectedClientSupportBreakdown.byType.map((item) => (
                                  <tr key={item.key}>
                                    <td className="px-3 py-2 font-medium text-slate-900">{item.label}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{item.count}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{item.hours.toFixed(1)} h</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-50 font-semibold text-slate-800">
                                <tr>
                                  <td className="px-3 py-2">Celkem</td>
                                  <td className="px-3 py-2 text-right">{selectedClientSupportBreakdown.totalCount}</td>
                                  <td className="px-3 py-2 text-right">{selectedClientSupportBreakdown.totalHours.toFixed(1)} h</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </Panel>

                    <Panel title="Klientská osa" description="Přehled klientské cesty přes KA1, KA2 a dokumenty." icon={History}>
                      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="text-xs text-slate-500">
                          Zaškrtni zápisy, které chceš vytisknout společně. Podpis klienta bude jen jednou na konci dokumentu.
                        </div>
                        <button
                          type="button"
                          onClick={exportSelectedJourneyRecords}
                          disabled={selectedJourneyPrintIds.length === 0}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <Printer className="h-4 w-4" />
                          Tisk vybraných záznamů ({selectedJourneyPrintIds.length})
                        </button>
                      </div>
                      <div className="mb-3 grid gap-3 md:grid-cols-4">
                        <InfoCard icon={History} label="Položky na ose" value={String(clientJourneyTimeline.length)} />
                        <InfoCard icon={Clock} label="Čas podpory" value={`${getClientStats(selectedClient.id, clientJourneyTimeline).supportHours.toFixed(1)} h`} />
                        <InfoCard icon={Target} label="Dokumenty" value={String(clientJourneyTimeline.filter((record) => Boolean(record.documentText)).length)} />
                        <InfoCard icon={Briefcase} label="Aktuální stav" value={selectedClient.projectStatusLabel || 'Neuvedeno'} />
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
                                          <div className="mt-1 text-xs text-slate-500">
                                            {record.worker || 'Bez pracovníka'}
                                            {record.ka ?` · ${record.ka}` : ''}
                                            {record.entityType === 'mentor_report_document' ?' · dokument' : ''}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedJourneyRecordIds((prev) =>
                                            prev.includes(record.id) ?prev.filter((item) => item !== record.id) : [...prev, record.id]
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
                                      >
                                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ?'rotate-90' : ''}`} />
                                        {isExpanded ?'Skrýt' : 'Detail'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => exportJourneyRecord(record)}
                                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 transition hover:bg-blue-100"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                        Stáhnout zápis
                                      </button>
                                      {!record.isSynthetic && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => deleteRecord(record)}
                                            disabled={isSaving}
                                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                          >
                                            Smazat
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => editJourneyRecord(record)}
                                            disabled={isSaving}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Upravit
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3 rounded-xl border border-white/70 bg-white/80 p-3 text-sm leading-snug text-slate-700">
                                    {summary}
                                  </div>
                                  {record.entityType === 'mentor_report_document' && (
                                    <div className="mt-2 text-xs text-emerald-800">
                                      Zpráva k TPM: {record.payload?.tpmRecordId || 'bez vazby'}
                                    </div>
                                  )}
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
                                  {record.documentText && (
                                    <div className="mt-2 text-xs text-slate-500">
                                      Náhled dokumentu: {truncate(cleanGeneratedText(record.documentText), 160)}
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
                    <Panel title="Projektové aktivity klienta" description="Chronologická auditní stopa všech evidovaných kroků." icon={History}>
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

                        {generatorDraft.selectedKey === 'mentor' && (
                          <>
                            <InputField label="Pracoviště nebo TPM" value={generatorDraft.workplace} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, workplace: value }))} />
                            <TextAreaField label="Průběžný pokrok" value={generatorDraft.progressSummary} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, progressSummary: value }))} />
                            <TextAreaField label="Pozorované překážky" value={generatorDraft.barriers} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, barriers: value }))} />
                            <TextAreaField label="Další podpora" value={generatorDraft.nextSteps} onChange={(value) => setGeneratorDraft((prev) => ({ ...prev, nextSteps: value }))} />
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
                            <Save className="h-4 w-4" />
                            Uložit dokument i aktivitu
                          </button>
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
              clients={clients}
              records={records}
              onSaveRecord={saveRecord}
              onUpdateRecord={updateExistingRecord}
              ka02Draft={ka02Draft}
              setKa02Draft={setKa02Draft}
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
              clients={clients}
              handleSaveKa01Assessment={handleSaveKa01Assessment}
              isSaving={isSaving}
              ka01NetworkDuration={ka01NetworkDuration}
              ka01StartTimeSuggestions={ka01StartTimeSuggestions}
              ka01EndTimeSuggestions={ka01EndTimeSuggestions}
              editingKa01NetworkRecordId={editingKa01NetworkRecordId}
              handleGenerateKa01NetworkDescription={handleGenerateKa01NetworkDescription}
              handleSaveKa01Network={handleSaveKa01Network}
              handleSaveKa01ActorRegistry={handleSaveKa01ActorRegistry}
              toggleKa01ActorAttendance={toggleKa01ActorAttendance}
              ka01AttendanceSelection={ka01AttendanceSelection}
              exportKa01AttendanceSheet={exportKa01AttendanceSheet}
              handleEditKa01ActorRegistry={handleEditKa01ActorRegistry}
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
              computedIndicators={computedIndicators}
              formatDurationFromTimes={formatDurationFromTimes}
            />
          </React.Suspense>
        )}

        {mainView === 'ka02' && (
          <React.Suspense fallback={<LazyViewFallback />}>
            <Ka02View
              clients={clients}
              records={records}
              onSaveRecord={saveRecord}
              onUpdateRecord={updateExistingRecord}
              ka02Draft={ka02Draft}
              setKa02Draft={setKa02Draft}
              setGeneratorDraft={setGeneratorDraft}
              renderAiDocumentPanel={renderAiDocumentPanel}
              ka02AiDocumentKeys={KA02_AI_DOCUMENT_KEYS}
              computedIndicators={computedIndicators}
            />
          </React.Suspense>
        )}

        {mainView === 'dashboard' && (
          <React.Suspense fallback={<LazyViewFallback />}>
            <ReportingView
              dashboardOverview={dashboardOverview}
              exportClientsCsv={exportClientsCsv}
              exportAllRecordsBackup={exportAllRecordsBackup}
              dashboardFilters={dashboardFilters}
              setDashboardFilters={setDashboardFilters}
              filteredRecords={filteredRecords}
              handleGenerateZorTexts={handleGenerateZorTexts}
              zorTexts={zorTexts}
              copyToClipboard={copyToClipboard}
              setCopied={setCopied}
              copied={copied}
              deleteRecord={deleteRecord}
              isSaving={isSaving}
            />
          </React.Suspense>
        )}
      </main>
    </div>
  );
}

export default App;








