import { GOAL_STATUS, normalizeGoalStatus } from './goalStatus.js';

function normalize(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function canonicalKa(value) {
  const compact = normalize(value).replace(/\s/g, '');
  if (compact === 'ka1' || compact === 'ka01') return 'KA1';
  if (compact === 'ka2' || compact === 'ka02') return 'KA2';
  return String(value || '').trim();
}

function recordMinutes(record) {
  const minutes = Number(record?.payload?.durationMinutes || 0);
  if (Number.isFinite(minutes) && minutes > 0) return minutes;
  const hoursText = String(record?.payload?.hours || '').trim().replace(',', '.');
  if (/^\d{1,3}:\d{2}$/.test(hoursText)) {
    const [hours, minutePart] = hoursText.split(':').map(Number);
    return hours * 60 + minutePart;
  }
  const hours = Number(hoursText);
  return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : 0;
}

function formatHours(minutes) {
  const hours = Math.round((Number(minutes || 0) / 60) * 10) / 10;
  return String(hours).replace('.', ',') + ' hod.';
}

function formatHoursInline(minutes) {
  return formatHours(minutes).replace(/\.$/, '');
}

function uniqueClientCount(records) {
  const ids = new Set();
  records.forEach((record) => {
    const recordIds = Array.isArray(record?.clientIds)
      ? record.clientIds
      : record?.clientId
        ? [record.clientId]
        : [];
    recordIds.filter(Boolean).forEach((id) => ids.add(String(id)));
  });
  return ids.size;
}

function countPhrase(count, one, few, many) {
  const value = Number(count || 0);
  const absolute = Math.abs(value);
  const form = absolute === 1 ? one : absolute >= 2 && absolute <= 4 ? few : many;
  return `${value} ${form}`;
}

function countCategory(count) {
  const absolute = Math.abs(Number(count || 0));
  if (absolute === 1) return 'one';
  if (absolute >= 2 && absolute <= 4) return 'few';
  return 'many';
}

function hasDocumentedValue(value) {
  const normalized = normalize(value);
  return Boolean(normalized && !['neuvedeno', 'neuveden', 'neuvedena', 'nezjisteno', 'bez vysledku'].includes(normalized));
}

function planGoals(record) {
  const candidates = [record?.goals, record?.payload?.goals, record?.payload?.structuredGoals];
  return candidates.find((value) => Array.isArray(value)) || [];
}

function goalProgressSummary(plans) {
  if (!plans.length) return '';
  const goals = plans.flatMap(planGoals);
  if (!goals.length) {
    return `U ${countPhrase(plans.length, 'individuálního plánu', 'individuálních plánů', 'individuálních plánů')} nejsou v dostupné strukturované evidenci uloženy jednotlivé stavy cílů, proto jejich plnění nelze číselně vyhodnotit.`;
  }

  const statusCounts = goals.reduce((counts, goal) => {
    const status = normalizeGoalStatus(goal);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const completed = statusCounts[GOAL_STATUS.COMPLETED] || 0;
  const partiallyCompleted = statusCounts[GOAL_STATUS.PARTIALLY_COMPLETED] || 0;
  const notCompleted = statusCounts[GOAL_STATUS.NOT_COMPLETED] || 0;
  const open = statusCounts[GOAL_STATUS.OPEN] || 0;
  const closed = completed + partiallyCompleted + notCompleted;
  const evaluated = goals.filter((goal) => (
    normalizeGoalStatus(goal) !== GOAL_STATUS.OPEN && hasDocumentedValue(goal?.goalEvaluation)
  )).length;

  return [
    `Stav cílů v individuálních plánech evidovaných nebo aktualizovaných ve sledovaném období: celkem ${countPhrase(goals.length, 'cíl', 'cíle', 'cílů')}; splněné ${completed}, částečně splněné ${partiallyCompleted}, nesplněné ${notCompleted} a otevřené ${open}.`,
    closed > 0
      ? `Slovní vyhodnocení bylo doloženo u ${evaluated} z ${closed} uzavřených cílů.`
      : 'Ve sledovaném období nebyl v těchto plánech evidován žádný uzavřený cíl.'
  ].join(' ');
}

function linkedGoalId(record) {
  return String(record?.linkedPlanGoalId || record?.payload?.linkedPlanGoalId || '').trim();
}

function supportEvidenceSummary(records) {
  if (!records.length) return '';
  const linkedToGoal = records.filter((record) => {
    const id = linkedGoalId(record);
    return id && id !== 'one-time-order';
  }).length;
  const oneTimeOrders = records.filter((record) => linkedGoalId(record) === 'one-time-order').length;
  const documentedOutcomes = records.filter((record) => hasDocumentedValue(documentedOutcome(record))).length;
  const documentedNextSteps = records.filter((record) => hasDocumentedValue(documentedNextStep(record))).length;
  const parts = [];
  if (linkedToGoal || oneTimeOrders) {
    parts.push(`Počet plnění navázaných na konkrétní cíl individuálního plánu: ${linkedToGoal}; počet jednorázových zakázek: ${oneTimeOrders}.`);
  }
  if (documentedOutcomes || documentedNextSteps) {
    parts.push(`Doložený výsledek byl zaznamenán u ${countPhrase(documentedOutcomes, 'plnění', 'plnění', 'plnění')} a navazující krok u ${countPhrase(documentedNextSteps, 'plnění', 'plnění', 'plnění')}.`);
  }
  return parts.join(' ');
}

function partnerNamesFromRecord(record) {
  const payload = record?.payload || {};
  return [payload.partnerNames, payload.registeredPartnerNames, payload.manualPartnerNames]
    .flatMap((value) => Array.isArray(value) ? value : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function addPartnerNames(target, records) {
  records.forEach((record) => {
    partnerNamesFromRecord(record).forEach((name) => target.add(normalize(name)));
  });
}

const SAFE_ACTIVITY_TYPE_BY_ENTITY = {
  debt_cases: 'Dluhová práce',
  therapy_sessions: 'Terapeutická podpora',
  cv_outputs: 'Podpora při tvorbě životopisu',
  job_simulators: 'Nácvik pracovního pohovoru',
  tpm_records: 'Tréninkové pracovní místo',
  employment_records: 'Podpora pracovního uplatnění'
};

const SAFE_SUPPORT_AREA_BY_ENTITY = {
  debt_cases: 'Finance/dluhy',
  therapy_sessions: 'Zdraví',
  cv_outputs: 'Zaměstnání',
  job_simulators: 'Zaměstnání',
  tpm_records: 'Zaměstnání',
  employment_records: 'Zaměstnání'
};

function activityType(record) {
  return record?.payload?.consultationType || SAFE_ACTIVITY_TYPE_BY_ENTITY[record?.entityType] || '';
}

function supportArea(record) {
  return record?.payload?.supportArea || SAFE_SUPPORT_AREA_BY_ENTITY[record?.entityType] || '';
}

function supportPlace(record) {
  const payload = record?.payload || {};
  const specific = payload.supportSpecific || {};
  return payload.place || specific.fieldWorkPlace || specific.contactPlace || specific.accompanimentPlace || '';
}

function documentedOutcome(record) {
  const payload = record?.payload || {};
  const specific = payload.supportSpecific || {};
  return payload.outcome || payload.solutionPlan || payload.recommendations || payload.developmentAreas || payload.progressSummary ||
    specific.accompanimentResult || specific.achievedProgress || specific.cooperationInterest || '';
}

function documentedNextStep(record) {
  const payload = record?.payload || {};
  const specific = payload.supportSpecific || {};
  return payload.nextSteps || payload.nextSupportSteps || payload.plannedSteps || specific.recommendedProcedure ||
    specific.followupHelp || specific.recommendation || '';
}

function topValues(records, selector, limit = 5) {
  const counts = new Map();
  records.forEach((record) => {
    const value = String(selector(record) || '').trim();
    if (!value) return;
    const key = normalize(value);
    const current = counts.get(key) || { label: value, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'cs'))
    .slice(0, limit)
    .map((item) => item.label);
}

function sentenceList(values) {
  if (!values.length) return '';
  if (values.length === 1) return values[0];
  return values.slice(0, -1).join(', ') + ' a ' + values[values.length - 1];
}

const PROJECT_ACTIVITY_AREA = 'území města Moravský Beroun a jeho přilehlé části (Ondrášov, Sedm Dvorů, Čabová, Nové Valteřice, Norberčany, Stará Libavá, Trhavice a Nová Véska)';

const KA01_METHOD_FRAMEWORK = 'sociální depistáž, terénní sociální práce, pravidelná přítomnost v lokalitách, kde se cílová skupina pohybuje, základní sociální poradenství a podle povahy zakázky také case management a koordinace služeb společně s klientem';

const KA02_METHOD_FRAMEWORK = 'aktivní komunikace a setkávání, navazování a rozvíjení partnerských vztahů se spolupracujícími organizacemi, multioborová případová setkávání, zapojení klienta do řešení vlastní situace a přístup zaměřený na řešení';

function buildKa1Text(records) {
  const plans = records.filter((record) => record.entityType === 'plans' && canonicalKa(record.ka) === 'KA1');
  const support = records.filter((record) => record.entityType !== 'plans' && canonicalKa(record.ka) === 'KA1');
  const all = plans.concat(support);
  if (!all.length) return 'Ve sledovaném období nebyla v KA1 evidována individuální podpora ani práce s individuálními plány.';

  const areas = topValues(support, supportArea);
  const types = topValues(support, activityType);
  const places = topValues(support, supportPlace, 4);
  const supportMinutes = support.reduce((sum, record) => sum + recordMinutes(record), 0);
  const planMinutes = plans.reduce((sum, record) => sum + recordMinutes(record), 0);
  const minutes = all.reduce((sum, record) => sum + recordMinutes(record), 0);
  return [
    `Průběh realizace ve sledovaném období: V KA01 byla poskytována přímá práce a individuální podpora ${countPhrase(uniqueClientCount(all), 'klientovi', 'klientům', 'klientům')}. Evidence obsahovala ${countPhrase(support.length, 'výkon podpory', 'výkony podpory', 'výkonů podpory')} a ${countPhrase(plans.length, 'vytvořený nebo aktualizovaný individuální plán', 'vytvořené nebo aktualizované individuální plány', 'vytvořených nebo aktualizovaných individuálních plánů')} v celkovém rozsahu ${formatHours(minutes)}`,
    supportMinutes > 0 && planMinutes > 0 ? `Z celkového času připadalo ${formatHoursInline(supportMinutes)} na přímou podporu a ${formatHoursInline(planMinutes)} na práci s individuálními plány.` : '',
    areas.length ? `Podpora se nejčastěji zaměřovala na oblasti ${sentenceList(areas)}.` : '',
    types.length ? `V evidenci jsou doloženy zejména formy práce ${sentenceList(types)}.` : '',
    places.length ? `Nejčastěji evidované formy nebo místa poskytování byly ${sentenceList(places)}.` : '',
    goalProgressSummary(plans),
    supportEvidenceSummary(support),
    'Vazba na účel a cíl aktivity: Doložené činnosti směřovaly k prevenci sociálního vyloučení a zhoršování situace klientů, ke zvýšení dostupnosti sociální podpory a k posilování soběstačnosti a odpovědnosti klientů. Podpora vycházela z evidovaných potřeb klientů a podle povahy zakázky navazovala na cíle individuálních plánů.',
    `Metodický rámec KA01 podle právního aktu zahrnuje ${KA01_METHOD_FRAMEWORK}. Výše uvedené počty a formy zachycují pouze činnosti skutečně doložené v evidenci za zvolené období.`,
    `Místo realizace podle právního aktu: ${PROJECT_ACTIVITY_AREA}.`
  ].filter(Boolean).join('\n\n');
}

function buildKa2CaseText(records) {
  const caseRecords = records.filter(
    (record) => canonicalKa(record.ka) === 'KA2' && record.entityType !== 'network_activities'
  );
  if (!caseRecords.length) return 'Ve sledovaném období nebyly v KA2 evidovány aktivity case managementu.';

  const areas = topValues(caseRecords, supportArea);
  const types = topValues(caseRecords, activityType);
  const places = topValues(caseRecords, supportPlace, 4);
  const partnerNames = new Set();
  addPartnerNames(partnerNames, caseRecords);
  const minutes = caseRecords.reduce((sum, record) => sum + recordMinutes(record), 0);
  const activityCountCategory = countCategory(caseRecords.length);
  const partnerCountCategory = countCategory(partnerNames.size);
  return [
    `V části KA02 zaměřené na case management ${activityCountCategory === 'one' ? 'byla realizována' : activityCountCategory === 'few' ? 'byly realizovány' : 'bylo realizováno'} ${countPhrase(caseRecords.length, 'aktivita', 'aktivity', 'aktivit')} pro ${countPhrase(uniqueClientCount(caseRecords), 'klienta', 'klienty', 'klientů')} v celkovém rozsahu ${formatHours(minutes)}`,
    partnerNames.size ? `Do koordinace podpory se ${partnerCountCategory === 'one' ? 'zapojil' : partnerCountCategory === 'few' ? 'zapojili' : 'zapojilo'} ${countPhrase(partnerNames.size, 'různý spolupracující aktér nebo subjekt', 'různí spolupracující aktéři nebo subjekty', 'různých spolupracujících aktérů nebo subjektů')}.` : '',
    areas.length ? `Řešené zakázky se nejčastěji týkaly oblastí ${sentenceList(areas)}.` : '',
    types.length ? `Evidované aktivity zahrnovaly zejména ${sentenceList(types)}.` : '',
    places.length ? `Nejčastěji evidované formy nebo místa jednání byly ${sentenceList(places)}.` : '',
    supportEvidenceSummary(caseRecords),
    'Doložená práce byla zaměřena na komplexní plánování a realizaci podpory klienta za účasti návazných služeb, institucí a odborníků, na koordinaci rolí zapojených aktérů a na domlouvání dalších kroků.'
  ].filter(Boolean).join(' ');
}

function buildKa2NetworkText(records) {
  const network = records.filter((record) => record.entityType === 'network_activities');
  if (!network.length) return 'Ve sledovaném období nebyly v KA2 evidovány aktivity tvorby a rozvoje sítě.';

  const types = topValues(network, (record) => record.payload?.type || record.title);
  const places = topValues(network, (record) => record.payload?.place, 4);
  const partnerNames = new Set();
  addPartnerNames(partnerNames, network);
  const minutes = network.reduce((sum, record) => sum + recordMinutes(record), 0);
  const documentedOutcomes = network.filter((record) => hasDocumentedValue(documentedOutcome(record))).length;
  const documentedNextSteps = network.filter((record) => hasDocumentedValue(documentedNextStep(record))).length;
  const activityCountCategory = countCategory(network.length);
  const partnerCountCategory = countCategory(partnerNames.size);
  return [
    `V části KA02 zaměřené na tvorbu a rozvoj sítě ${activityCountCategory === 'one' ? 'byla uskutečněna' : activityCountCategory === 'few' ? 'byly uskutečněny' : 'bylo uskutečněno'} ${countPhrase(network.length, 'síťová nebo koordinační aktivita', 'síťové nebo koordinační aktivity', 'síťových nebo koordinačních aktivit')}${minutes ? ` v rozsahu ${formatHours(minutes)}` : '.'}`,
    partnerNames.size ? `V evidenci se ${partnerCountCategory === 'one' ? 'objevil' : partnerCountCategory === 'few' ? 'objevily' : 'objevilo'} ${countPhrase(partnerNames.size, 'různý spolupracující subjekt', 'různé spolupracující subjekty', 'různých spolupracujících subjektů')}.` : '',
    types.length ? `Realizované aktivity zahrnovaly zejména ${sentenceList(types)}.` : '',
    places.length ? `Nejčastěji evidovaná místa nebo formy setkání byly ${sentenceList(places)}.` : '',
    documentedOutcomes || documentedNextSteps ? `Doložený výstup byl zaznamenán u ${countPhrase(documentedOutcomes, 'setkání', 'setkání', 'setkání')} a další krok u ${countPhrase(documentedNextSteps, 'setkání', 'setkání', 'setkání')}.` : '',
    'Činnost probíhala prostřednictvím aktivní komunikace a setkávání, navazování a rozvíjení vztahů se spolupracujícími organizacemi a směřovala k vytvoření a udržování funkční místní sítě.'
  ].filter(Boolean).join(' ');
}

function buildKa3Text(records) {
  const education = records.filter((record) => record.entityType === 'education_records');
  const supervision = records.filter((record) => record.entityType === 'supervision_records');
  if (!education.length && !supervision.length) {
    return 'Ve sledovaném období nebyly v KA03 evidovány aktivity profesního vzdělávání ani supervize týmu.';
  }

  const educationMinutes = education.reduce((sum, record) => sum + recordMinutes(record), 0);
  const supervisionMinutes = supervision.reduce((sum, record) => sum + recordMinutes(record), 0);
  const educationTopics = topValues(education, (record) => record.payload?.topic || record.payload?.title || record.title);
  const supervisionTypes = topValues(supervision, (record) => record.payload?.type || record.title);
  return [
    `Průběh realizace ve sledovaném období: V KA03 bylo evidováno ${education.length} vzdělávacích aktivit v rozsahu ${formatHours(educationMinutes)} a ${supervision.length} supervizních setkání v rozsahu ${formatHours(supervisionMinutes)}`,
    educationTopics.length ? `Vzdělávání bylo zaměřeno zejména na témata ${sentenceList(educationTopics)}.` : '',
    supervisionTypes.length ? `Supervize zahrnovala zejména formy ${sentenceList(supervisionTypes)}.` : '',
    'Vazba na účel a cíl aktivity: Doložené aktivity směřovaly k průběžnému zvyšování odborných kompetencí a profesní kvality týmu, podpoře týmové spolupráce, sdílení zkušeností a reflexe praxe a k prevenci pracovního stresu a syndromu vyhoření.',
    'Metodický rámec KA03 podle právního aktu zahrnuje cílené profesní vzdělávání a pravidelná skupinová i individuální supervizní setkání zaměřená na reflexi pracovní praxe, řešení konkrétních případů a podporu profesního růstu. Výše uvedené údaje zachycují pouze aktivity skutečně doložené v evidenci za zvolené období.'
  ].filter(Boolean).join('\n\n');
}

export function buildZorTexts(records = []) {
  const safeRecords = Array.isArray(records) ? records.filter(Boolean) : [];
  return {
    'KA01 – Přímá práce s klienty – terénní práce': buildKa1Text(safeRecords),
    'KA02 – Koordinace a síťování služeb': [
      'Účel a cíl aktivity: zajištění provázaného, koordinovaného a efektivního systému pomoci osobám v nepříznivé sociální situaci prostřednictvím case managementu, komplexního plánování podpory a funkční sítě spolupracujících subjektů.',
      '',
      'a) Case management',
      buildKa2CaseText(safeRecords),
      '',
      'b) Koordinace a síťování služeb',
      buildKa2NetworkText(safeRecords),
      '',
      `Metodický rámec KA02 podle právního aktu zahrnuje ${KA02_METHOD_FRAMEWORK}. Výše uvedené počty a formy zachycují pouze činnosti skutečně doložené v evidenci za zvolené období.`,
      '',
      `Místo realizace podle právního aktu: ${PROJECT_ACTIVITY_AREA}.`
    ].join('\n'),
    'KA03 – Profesní vzdělávání a supervize týmu': buildKa3Text(safeRecords)
  };
}

export const ZOR_TEXT_MAX_LENGTH = 2000;

export function buildHorizontalPrinciplesTexts() {
  return {
    'Rovné příležitosti a nediskriminace': 'Rovné příležitosti a nediskriminace byly při realizaci projektu uplatňovány jako průřezový princip. Přímá terénní práce, case management a koordinace služeb vycházely z individuální nepříznivé sociální situace, skutečných potřeb a cílů klienta, nikoli z osobních charakteristik nebo stereotypních předpokladů. Přístup k sociální pomoci byl zajišťován bez rozdílu věku, pohlaví, zdravotního stavu, rodinného a sociálního postavení, národnosti, etnického původu, náboženství nebo jiného znevýhodnění. Důraz byl kladen na srozumitelnou komunikaci, respekt k důstojnosti klienta, jeho zapojení do plánování řešení a koordinaci návazných služeb. Terénní forma práce na území Moravského Berouna a jeho přilehlých částí podporovala místní dostupnost pomoci. Realizované činnosti tak přispívaly k odstraňování bariér v přístupu k podpoře, aktivnímu začleňování a posilování soběstačnosti a odpovědnosti klientů.',
    'Rovné příležitosti žen a mužů': 'Rovné příležitosti žen a mužů byly při realizaci projektu zohledňovány průřezově. Ženám i mužům byl zajišťován rovný přístup k terénní sociální práci, sociálnímu poradenství, case managementu a návazným službám. Podpora byla plánována podle individuální situace, potřeb a cílů konkrétního klienta bez stereotypních představ o rolích žen a mužů. Při volbě formy a termínu spolupráce byly zohledňovány pracovní, rodičovské a pečovatelské povinnosti tak, aby nepředstavovaly zbytečnou překážku pro využití podpory. Klienti byli bez ohledu na pohlaví zapojováni do rozhodování o řešení své situace a spolupráce byla vedena s respektem k jejich důstojnosti a odpovědnosti. Projekt tím podporoval rovné podmínky pro aktivní účast, využití dostupné pomoci a zlepšení sociální situace žen i mužů.'
  };
}

export function buildHorizontalPrincipleAiPrompt({ periodLabel, title, text, contextText = '' } = {}) {
  return [
    `Uprav pracovní text do zprávy o realizaci projektu pro horizontální princip „${title || 'neuvedeno'}“.`,
    'Závazný kontext právního aktu: projekt Podpora sociální práce v Moravském Berouně II, registrační číslo CZ.03.02.01/00/25_106/0006125, podporuje aktivní začleňování, rovné příležitosti, nediskriminaci, aktivní účast a zlepšení zaměstnatelnosti zejména znevýhodněných skupin.',
    `Vykazované období: ${periodLabel || 'neuvedeno'}.`,
    'Zachovej význam schváleného pracovního textu a použij profesionální hodnoticí tón. Kontext evidovaných aktivit využij pouze kvalitativně.',
    'Nevymýšlej konkrétní opatření, školení, stížnosti, bezbariérové úpravy, kvóty, personální pravidla ani dosažené dopady, které nejsou doloženy.',
    'Text označený jako metodický rámec nebo místo realizace podle právního aktu je pouze kontext projektu. Nepopisuj jednotlivé metody z tohoto rámce jako skutečně provedené, pokud nejsou samostatně uvedeny mezi doloženými činnostmi za období.',
    'Neopakuj statistiky ani číselné údaje. Neuváděj jména, interní identifikátory, nadpis, odrážky ani markdown.',
    `Vrať jeden souvislý český odstavec o délce přibližně 1100 až 1300 znaků, nejvýše ${ZOR_TEXT_MAX_LENGTH} znaků, ukončený celou větou.`,
    '',
    'SCHVÁLENÝ PRACOVNÍ TEXT:',
    String(text || '').trim() || 'Pracovní text není k dispozici.',
    '',
    'ANONYMIZOVANÉ SOUHRNY AKTIVIT:',
    String(contextText || '').trim() || 'Za období nejsou k dispozici evidované aktivity.'
  ].join('\n');
}
