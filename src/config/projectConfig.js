import { BarChart3, Network, Target, Users, Workflow } from 'lucide-react';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const GOOGLE_SHEET_MACRO_URL = import.meta.env?.VITE_CLIENTS_API_URL || '';
const GOOGLE_DRIVE_UPLOAD_URL = import.meta.env?.VITE_GOOGLE_DRIVE_UPLOAD_URL || '';

const TARGETS = {
  ka01Meetings: 0,
  ka01Materials: 0,
  ka01TeamMeetings: 0,
  ka01NetworkSize: 0,
  ka02Plans: 0,
  ka02Consultations: 0,
  ka02SupportedClients: 0,
  ka02SimulatorRuns: 0,
  ka02TherapyClients: 0,
  ka02CvOutputs: 0,
  ka02DebtMappedClients: 0,
  ka02RepaymentArrangements: 0,
  ka03TpmRecords: 0,
  ka03EmploymentRecords: 0,
  ka03MentorReports: 0
};

const WORKERS = [
  'Soci\u00e1ln\u00ed pracovn\u00edk',
  'Case manager',
  'Odborn\u00fd garant'
];

const CLIENT_GENDER_OPTIONS = ['mu\u017e', '\u017eena', 'neuvedeno'];

const CLIENT_EMPLOYMENT_OPTIONS = [
  'zam\u011bstnanci',
  'osoby samostatn\u011b v\u00fdd\u011ble\u010dn\u011b \u010dinn\u00e9',
  'osoby na mate\u0159sk\u00e9 dovolen\u00e9 (p\u0159ed MD zam\u011bstnan\u00e9)',
  'osoby na mate\u0159sk\u00e9 dovolen\u00e9 (p\u0159ed MD OSV\u010c)',
  'kr\u00e1tkodob\u011b nezam\u011bstnan\u00ed \u2013 registrovan\u00ed na \u00daP \u010cR (<12 m\u011bs\u00edc\u016f)',
  'dlouhodob\u011b nezam\u011bstnan\u00ed \u2013 registrovan\u00ed na \u00daP \u010cR (\u226512 m\u011bs\u00edc\u016f)',
  '\u017e\u00e1ci / studenti / u\u010dni (denn\u00ed studium)',
  'osoby ve starobn\u00edm d\u016fchodu, neregistrovan\u00e9 na \u00daP',
  'osoby v invalidn\u00edm d\u016fchodu, neregistrovan\u00e9 na \u00daP',
  'osoby na rodi\u010dovsk\u00e9 dovolen\u00e9',
  'ostatn\u00ed neaktivn\u00ed osoby'
];

const CLIENT_EDUCATION_OPTIONS = [
  'bez vzd\u011bl\u00e1n\u00ed (nedokon\u010den\u00e9 z\u00e1kladn\u00ed vzd\u011bl\u00e1n\u00ed) \u2013 ISCED 0',
  'z\u00e1kladn\u00ed vzd\u011bl\u00e1n\u00ed v\u010d. nedokon\u010den\u00e9ho 2. stupn\u011b Z\u0160 \u2013 ISCED 1\u20132',
  'st\u0159edo\u0161kolsk\u00e9 v\u010d. vyu\u010den\u00ed/maturity/pomaturitn\u00edho studia \u2013 ISCED 3\u20134',
  'vy\u0161\u0161\u00ed odborn\u00e9 / Bc. / Mgr. / Ph.D. \u2013 ISCED 5\u20138',
  'vzd\u011bl\u00e1n\u00ed jinde neuveden\u00e9'
];

const CLIENT_DISADVANTAGE_OPTIONS = [
  'osoby se zdravotn\u00edm posti\u017een\u00edm',
  'n\u00e1rodnostn\u00ed men\u0161iny',
  'st\u00e1tn\u00ed p\u0159\u00edslu\u0161n\u00edci t\u0159et\u00edch zem\u00ed',
  '\u00fa\u010dastn\u00edci zahrani\u010dn\u00edho p\u016fvodu',
  'osoby bez domova nebo osoby vylou\u010den\u00e9 z p\u0159\u00edstupu k bydlen\u00ed',
  'osoby s jin\u00fdm znev\u00fdhodn\u011bn\u00edm',
  'osoby po v\u00fdkonu trestu',
  'osoby ohro\u017een\u00e9 z\u00e1vislost\u00ed',
  'bez znev\u00fdhodn\u011bn\u00ed / neuvedeno'
];

const CLIENT_STATUS_OPTIONS = ['Aktivn\u00ed', 'Ukon\u010den\u00fd', 'Rozpracovan\u00fd', 'Stornovan\u00fd'];
const YES_NO_OPTIONS = ['Ano', 'Ne'];

const COMMON_AI_QUALITY_RULES = [
  'Pou\u017e\u00edvej pouze fakta ze zad\u00e1n\u00ed a projektov\u00e9ho kontextu.',
  'Neodes\u00edlej ani neopakuj jm\u00e9no, p\u0159\u00edjmen\u00ed ani datum narozen\u00ed klienta.',
  'Nevym\u00fd\u0161lej diagn\u00f3zy, v\u00fdsledky jedn\u00e1n\u00ed, dluhy, zam\u011bstn\u00e1n\u00ed ani motivaci klienta.',
  'Kdy\u017e \u00fadaj chyb\u00ed nebo nen\u00ed podstatn\u00fd, vynech ho m\u00edsto psan\u00ed \u0159\u00e1dk\u016f typu Neuvedeno.',
  'Pi\u0161 \u010desky, v\u011bcn\u011b, auditn\u011b obhajiteln\u011b, bez Markdownu a bez k\u00f3dov\u00fdch blok\u016f.'
].join('\n');

const SUPPORT_SPECIFIC_LABELS = {
  contactPlace: 'Misto depistaze',
  contactMethod: 'Zpusob kontaktu',
  contactReason: 'Duvod osloveni',
  helpOffered: 'Pomoc nabidnuta',
  counsellingProvided: 'Poradenstvi poskytnuto',
  contactsGiven: 'Kontakty predany',
  cooperationInterest: 'Zajem o dalsi spolupraci',
  mappedAreas: 'Hlavni zjistene oblasti',
  risks: 'Rizika',
  clientResources: 'Zdroje klienta',
  clientNeeds: 'Potreby klienta',
  agreedProcedure: 'Dohoda na dalsim postupu',
  counsellingTopic: 'Tema poradenstvi',
  providedInformation: 'Poskytnute informace',
  recommendedProcedure: 'Doporuceny postup',
  fieldWorkPlace: 'Misto vykonu',
  visitPurpose: 'Ucel navstevy',
  clientReaction: 'Reakce klienta',
  nextContactAgreement: 'Dohoda na dalsim kontaktu',
  problemType: 'Druh problemu',
  solutionStatus: 'Orientacni stav reseni',
  agreedStep: 'Domluveny krok',
  recommendedService: 'Doporucena navazna sluzba',
  housingSituation: 'Typ bytove situace',
  housingProblem: 'Problem v bydleni',
  contactedSubject: 'Kontaktovany subjekt',
  workStatus: 'Pracovni status',
  workTopic: 'Resene tema',
  performedStep: 'Provedeny krok',
  followupSubject: 'Navazny subjekt',
  benefitType: 'Druh davky/rizeni',
  applicationStatus: 'Stav zadosti',
  neededDocuments: 'Potrebne doklady',
  nextStep: 'Dalsi krok',
  familyArea: 'Resena oblast',
  involvedPersons: 'Zapojene osoby',
  followupNeed: 'Potreba navazne podpory',
  clientAgreement: 'Dohoda s klientem',
  healthNeed: 'Resena potreba',
  recommendedContact: 'Doporuceny kontakt',
  orderingAssistance: 'Asistence pri objednani',
  nextProcedure: 'Dalsi postup',
  accompanimentPlace: 'Kam doprovod probehl',
  accompanimentPurpose: 'Ucel doprovodu',
  meetingResult: 'Vysledek jednani',
  institution: 'Instituce',
  contactForm: 'Forma kontaktu',
  meetingTopic: 'Tema jednani',
  clientPresent: 'Klient byl pritomen',
  crisisType: 'Typ krize',
  urgency: 'Mira akutnosti',
  measures: 'Prijata opatreni',
  followupHelp: 'Predani navazne pomoci',
  contactResult: 'Vysledek kontaktu',
  adminType: 'Typ administrativy',
  documentAction: 'Dokument/ukon',
  withClient: 'Provedeno s klientem',
  evaluationReason: 'Duvod vyhodnoceni/ukonceni',
  achievedProgress: 'Dosazeny posun',
  unresolvedAreas: 'Nedoresene oblasti',
  recommendation: 'Doporuceni'
};

function formatSupportSpecificForPrompt(values = {}) {
  const lines = Object.entries(values)
    .filter(([, value]) => String(value || '').trim())
    .map(([key, value]) => (SUPPORT_SPECIFIC_LABELS[key] || key) + ': ' + String(value).trim());
  return lines.length ? lines.join('\n') : 'Nebyla vyplnena zadna specificka pole.';
}

const KA1_CONTEXT = [
  'KA1-Individu\u00e1ln\u00ed podpora je p\u0159\u00edm\u00e1 pr\u00e1ce s klientem v ter\u00e9nn\u00ed nebo ambulantn\u00ed form\u011b.',
  'C\u00edlem je prevence soci\u00e1ln\u00edho vylou\u010den\u00ed, stabilizace situace klienta, pos\u00edlen\u00ed sob\u011bsta\u010dnosti a dostupnosti soci\u00e1ln\u00ed podpory.',
  'Podpora m\u016f\u017ee zahrnovat depist\u00e1\u017e, soci\u00e1ln\u00ed \u0161et\u0159en\u00ed, z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed, doprovod, n\u00e1cvik dovednost\u00ed, jedn\u00e1n\u00ed s institucemi a n\u00e1vazn\u00e9 kroky dle individu\u00e1ln\u00edho pl\u00e1nu.',
  'M\u00edstem realizace je Moravsk\u00fd Beroun a p\u0159ilehl\u00e9 \u010d\u00e1sti: Ondr\u00e1\u0161ov, Sedm Dvor\u016f, \u010cabov\u00e1, Nov\u00e9 Valte\u0159ice, Norber\u010dany, Star\u00e1 Libav\u00e1, Trhavice a Nov\u00e1 V\u00e9ska.'
].join('\n');

const KA2_CASE_CONTEXT = [
  'KA2-Case management je koordinovan\u00e1 podpora klienta, u kter\u00e9 je zapojeno v\u00edce slu\u017eeb, instituc\u00ed nebo odborn\u00edk\u016f.',
  'Z\u00e1pis m\u00e1 zachytit zak\u00e1zku klienta, zapojen\u00e9 akt\u00e9ry, koordinaci postupu, domluven\u00e9 kroky a v\u00fdsledek jedn\u00e1n\u00ed.',
  'Individu\u00e1ln\u00ed pl\u00e1n z KA1 je kontextem pro n\u00e1vazn\u00e9 kroky, ale case management nem\u00e1 opisovat cel\u00fd pl\u00e1n.'
].join('\n');

const REPORT_PROMPTS = {
  plan: {
    label: 'Individu\u00e1ln\u00ed pl\u00e1n',
    ka: 'KA1',
    entityType: 'plans',
    buildSystemPrompt: () => [
      'Jsi soci\u00e1ln\u00ed pracovn\u00edk v projektu Podpora soci\u00e1ln\u00ed pr\u00e1ce v Moravsk\u00e9m Beroun\u011b.',
      'Vytv\u00e1\u0159\u00ed\u0161 nebo upravuje\u0161 individu\u00e1ln\u00ed pl\u00e1n klienta jako intern\u00ed projektov\u00fd dokument.',
      'Struktura m\u00e1 odpov\u00eddat formul\u00e1\u0159i: siln\u00e9 str\u00e1nky a limity, identifikovan\u00e9 bari\u00e9ry/pot\u0159eby, c\u00edle, ak\u010dn\u00ed kroky, term\u00edny a z\u00e1v\u011bre\u010dn\u00e9 vyhodnocen\u00ed.',
      KA1_CONTEXT,
      COMMON_AI_QUALITY_RULES
    ].join('\n\n'),
    buildUserPrompt: ({ client, fields }) => [
      'Klient je v evidenci projektu. Osobn\u00ed identifika\u010dn\u00ed \u00fadaje neopakuj.',
      'Datum: ' + (fields.date || todayIso()),
      'Siln\u00e9 str\u00e1nky a limity: ' + (fields.currentSituation || ''),
      'Identifikovan\u00e9 bari\u00e9ry / pot\u0159eby: ' + (fields.barriers || ''),
      'C\u00edle: ' + (fields.goals || ''),
      'Ak\u010dn\u00ed kroky: ' + (fields.plannedSteps || ''),
      'Postaven\u00ed na trhu pr\u00e1ce jako tich\u00fd kontext: ' + (client.postaveniNaTrhu || ''),
      'Vzd\u011bl\u00e1n\u00ed jako tich\u00fd kontext: ' + (client.vzdelani || ''),
      'Znev\u00fdhodn\u011bn\u00ed jako tich\u00fd kontext: ' + (client.znevyhodneni || '')
    ].join('\n')
  },
  consultation: {
    label: 'Z\u00e1pis podpory',
    ka: 'KA1',
    entityType: 'consultations',
    buildSystemPrompt: ({ fields } = {}) => [
      fields?.caseManagementMode ? KA2_CASE_CONTEXT : KA1_CONTEXT,
      'Vytv\u00e1\u0159\u00ed\u0161 profesion\u00e1ln\u00ed z\u00e1pis poskytnut\u00e9 podpory do klientsk\u00e9 slo\u017eky.',
      'Z\u00e1pis m\u00e1 zachytit datum a rozsah podpory, typ podpory, n\u00e1vaznost na c\u00edl IP, pr\u016fb\u011bh, v\u00fdsledek a dal\u0161\u00ed krok.',
      'Neopisuj registra\u010dn\u00ed \u00fadaje klienta. Osobn\u00ed \u00fadaje klienta nepou\u017e\u00edvej.',
      'Zvoleny typ podpory je zavazny. Nemen ho, nenahrazuj jinym typem a nezamenuj ho s oblasti podpory.',
      'Povinne zohledni vyplnena specificka pole daneho typu podpory. Neignoruj je.',
      COMMON_AI_QUALITY_RULES
    ].join('\n\n'),
    buildUserPrompt: ({ client, fields }) => [
      'Typ podpory: ' + (fields.consultationType || 'Z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed'),
      'Oblast podpory: ' + (fields.supportArea || ''),
      'Specificka pole podle typu podpory:\n' + formatSupportSpecificForPrompt(fields.supportSpecific || {}),
      'Datum: ' + (fields.date || todayIso()),
      '\u010cas / d\u00e9lka: ' + (fields.durationMinutes || 0) + ' minut',
      'Forma nebo m\u00edsto poskytov\u00e1n\u00ed: ' + (fields.place || fields.ka02Place || ''),
      'Cil IP / zakazka: ' + (fields.linkedPlanGoalLabel || ''),
      fields.caseManagementMode ? 'Zapojeni akteri: ' + ((fields.partnerNames || []).join('; ') || 'bez zapojenych akteru') : '',
      'Popis prubehu / zadani pracovnika: ' + (fields.topics || ''),
      'V\u00fdsledek / vyhodnocen\u00ed: ' + (fields.outcome || ''),
      'Dal\u0161\u00ed kroky: ' + (fields.nextSteps || ''),
      'Postaven\u00ed na trhu pr\u00e1ce jako tich\u00fd kontext: ' + (client.postaveniNaTrhu || ''),
      'Znev\u00fdhodn\u011bn\u00ed jako tich\u00fd kontext: ' + (client.znevyhodneni || '')
    ].join('\n')
  },
  debt: { label: 'Z\u00e1znam dluhov\u00e9ho poradenstv\u00ed', ka: 'KA1', entityType: 'debt_cases', buildSystemPrompt: () => COMMON_AI_QUALITY_RULES, buildUserPrompt: ({ fields }) => JSON.stringify(fields) },
  therapy: { label: 'Terapeutick\u00e1 zpr\u00e1va', ka: 'KA1', entityType: 'therapy_sessions', buildSystemPrompt: () => COMMON_AI_QUALITY_RULES, buildUserPrompt: ({ fields }) => JSON.stringify(fields) },
  cv: { label: 'CV a motiva\u010dn\u00ed dopis', ka: 'KA1', entityType: 'cv_outputs', buildSystemPrompt: () => COMMON_AI_QUALITY_RULES, buildUserPrompt: ({ fields }) => JSON.stringify(fields) },
  simulator: { label: 'Zp\u011btn\u00e1 vazba z pracovn\u00edho simul\u00e1toru', ka: 'KA1', entityType: 'job_simulators', buildSystemPrompt: () => COMMON_AI_QUALITY_RULES, buildUserPrompt: ({ fields }) => JSON.stringify(fields) },
  mentor: { label: 'Zpr\u00e1va mentora', ka: 'KA2', entityType: 'mentoring_records', buildSystemPrompt: () => COMMON_AI_QUALITY_RULES, buildUserPrompt: ({ fields }) => JSON.stringify(fields) }
};

const APP_VIEWS = [
  { id: 'clients', name: 'Klienti', icon: Users, tone: 'indigo' },
  { id: 'ka02', name: 'KA1-Individu\u00e1ln\u00ed podpora', icon: Target, tone: 'emerald' },
  { id: 'ka2case', name: 'KA2-Case management', icon: Network, tone: 'blue' },
  { id: 'ka01', name: 'KA2-Tvorba s\u00edt\u011b', icon: Workflow, tone: 'blue' },
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3, tone: 'slate' }
];

const REPORTING_PERIODS = [
  { value: 'all', label: 'V\u0161echna data', start: '', end: '' },
  { value: '2026-03_2026-08', label: '03/2026 - 08/2026', start: '2026-03-01', end: '2026-08-31' },
  { value: '2026-09_2027-02', label: '09/2026 - 02/2027', start: '2026-09-01', end: '2027-02-28' },
  { value: '2027-03_2027-08', label: '03/2027 - 08/2027', start: '2027-03-01', end: '2027-08-31' },
  { value: '2027-09_2028-02', label: '09/2027 - 02/2028', start: '2027-09-01', end: '2028-02-29' }
];

const emptyClientDraft = {
  jmeno: '', prijmeni: '', datumNarozeni: '', ulice: '', cisloPopisne: '', mesto: '', psc: '', spadoveMesto: '',
  email: '', datovaSchranka: '', telefon: '', pohlavi: '', postaveniNaTrhu: '', vzdelani: '', znevyhodneni: '',
  datumVstupu: todayIso(), datumVystupu: '', stavKlienta: 'Aktivn\u00ed', caseManagementPotreba: 'Ne',
  caseManagementDuvod: '', caseManagementOd: '', poznamka: '', situacePoUkonceni: '', projectStatus: 'active'
};

const emptyGeneratorDraft = {
  selectedKey: 'plan', clientId: '', tpmRecordId: '', linkedPlanGoalId: '', linkedPlanGoalLabel: '',
  worker: 'Soci\u00e1ln\u00ed pracovn\u00edk', date: todayIso(), ka02StartTime: '', ka02EndTime: '', ka02Place: '', bulletNotes: '',
  currentSituation: '', goals: '', barriers: '', plannedSteps: '', planDurationMinutes: '60',
  consultationType: 'Z\u00e1kladn\u00ed soci\u00e1ln\u00ed poradenstv\u00ed', supportArea: '', supportSpecific: {}, topics: '', outcome: '', nextSteps: '', durationMinutes: '',
  debtSummary: '', debtCauses: '', debtStage: 'Mapov\u00e1n\u00ed', solutionPlan: '', educationTopic: '', sessionOrder: '1',
  themes: '', mentalState: '', recommendations: '', targetJob: '', cvDurationMinutes: '', experience: '', skills: '',
  position: '', feedback: '', strengths: '', developmentAreas: '', workplace: '', progressSummary: '', aiStyleRating: '3',
  aiStyleFeedback: '', generatedText: '', caseManagementMode: false, selectedPartnerIds: [], partnerNames: [], participantCount: 0
};

const emptyFilters = { period: 'all', ka: 'all', worker: 'all' };

export {
  GOOGLE_SHEET_MACRO_URL,
  GOOGLE_DRIVE_UPLOAD_URL,
  TARGETS,
  WORKERS,
  CLIENT_GENDER_OPTIONS,
  CLIENT_EMPLOYMENT_OPTIONS,
  CLIENT_EDUCATION_OPTIONS,
  CLIENT_DISADVANTAGE_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  YES_NO_OPTIONS,
  REPORT_PROMPTS,
  APP_VIEWS,
  REPORTING_PERIODS,
  emptyClientDraft,
  emptyGeneratorDraft,
  emptyFilters
};
