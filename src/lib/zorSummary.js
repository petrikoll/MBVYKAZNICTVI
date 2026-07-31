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

  const areas = topValues(support, (record) => record.payload?.supportArea);
  const types = topValues(support, (record) => record.payload?.consultationType || record.title);
  const minutes = all.reduce((sum, record) => sum + recordMinutes(record), 0);
  return [
    `Průběh realizace ve sledovaném období: V KA01 byla poskytována přímá práce a individuální podpora ${uniqueClientCount(all)} klientům. Evidováno bylo ${support.length} výkonů podpory a ${plans.length} vytvořených nebo aktualizovaných individuálních plánů v celkovém rozsahu ${formatHours(minutes)}`,
    areas.length ? `Podpora se nejčastěji zaměřovala na oblasti ${sentenceList(areas)}.` : '',
    types.length ? `V evidenci jsou doloženy zejména formy práce ${sentenceList(types)}.` : '',
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

  const areas = topValues(caseRecords, (record) => record.payload?.supportArea);
  const types = topValues(caseRecords, (record) => record.payload?.consultationType || record.title);
  const partnerNames = new Set();
  caseRecords.forEach((record) => {
    const names = Array.isArray(record.payload?.partnerNames) ? record.payload.partnerNames : [];
    names.filter(Boolean).forEach((name) => partnerNames.add(normalize(name)));
  });
  const minutes = caseRecords.reduce((sum, record) => sum + recordMinutes(record), 0);
  return [
    `V části KA02 zaměřené na case management bylo realizováno ${caseRecords.length} aktivit pro ${uniqueClientCount(caseRecords)} klientů v celkovém rozsahu ${formatHours(minutes)}`,
    partnerNames.size ? `Do koordinace podpory bylo zapojeno ${partnerNames.size} různých spolupracujících aktérů nebo subjektů.` : '',
    areas.length ? `Řešené zakázky se nejčastěji týkaly oblastí ${sentenceList(areas)}.` : '',
    types.length ? `Evidované aktivity zahrnovaly zejména ${sentenceList(types)}.` : '',
    'Doložená práce byla zaměřena na komplexní plánování a realizaci podpory klienta za účasti návazných služeb, institucí a odborníků, na koordinaci rolí zapojených aktérů a na domlouvání dalších kroků.'
  ].filter(Boolean).join(' ');
}

function buildKa2NetworkText(records) {
  const network = records.filter((record) => record.entityType === 'network_activities');
  if (!network.length) return 'Ve sledovaném období nebyly v KA2 evidovány aktivity tvorby a rozvoje sítě.';

  const types = topValues(network, (record) => record.payload?.type || record.title);
  const partnerNames = new Set();
  network.forEach((record) => {
    const names = Array.isArray(record.payload?.partnerNames) ? record.payload.partnerNames : [];
    names.filter(Boolean).forEach((name) => partnerNames.add(normalize(name)));
  });
  const minutes = network.reduce((sum, record) => sum + recordMinutes(record), 0);
  return [
    `V části KA02 zaměřené na tvorbu a rozvoj sítě bylo uskutečněno ${network.length} síťových a koordinačních aktivit${minutes ? ` v rozsahu ${formatHours(minutes)}` : ''}.`,
    partnerNames.size ? `V evidenci se objevilo ${partnerNames.size} různých spolupracujících subjektů.` : '',
    types.length ? `Realizované aktivity zahrnovaly zejména ${sentenceList(types)}.` : '',
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

export function buildHorizontalPrinciplesFallbackText() {
  return 'Při realizaci projektu byly rovné příležitosti žen a mužů a zásada nediskriminace uplatňovány jako průřezové principy. Přístup k podpoře vycházel z individuální nepříznivé sociální situace a evidovaných potřeb klientů. Poskytovaná podpora směřovala k rovnému přístupu k sociální pomoci, návazným službám a možnostem aktivního začlenění. Způsob práce byl zaměřen na zapojení klienta do řešení vlastní situace, posilování jeho soběstačnosti a respektování individuálních potřeb bez rozdílu pohlaví nebo jiné osobní charakteristiky.';
}

export function buildHorizontalPrinciplesAiPrompt({ periodLabel, kaTexts } = {}) {
  const sourceTexts = Object.entries(kaTexts || {})
    .map(([title, text]) => `${title}:\n${text}`)
    .join('\n\n');
  return [
    'Vytvoř jeden souvislý odstavec do zprávy o realizaci projektu k naplňování horizontálních principů: rovné příležitosti žen a mužů a nediskriminace.',
    'Závazný kontext právního aktu: projekt Podpora sociální práce v Moravském Berouně II, registrační číslo CZ.03.02.01/00/25_106/0006125, podporuje aktivní začleňování, rovné příležitosti, nediskriminaci, aktivní účast a zlepšení zaměstnatelnosti zejména znevýhodněných skupin.',
    `Vykazované období: ${periodLabel || 'neuvedeno'}.`,
    'Pracuj pouze s níže uvedenými anonymizovanými souhrny aktivit. Nevymýšlej konkrétní opatření, školení, stížnosti, bezbariérové úpravy, kvóty, personální pravidla ani dosažené dopady, které ve vstupu nejsou doloženy.',
    'Text označený jako metodický rámec nebo místo realizace podle právního aktu je pouze kontext projektu. Nepopisuj jednotlivé metody z tohoto rámce jako skutečně provedené, pokud nejsou samostatně uvedeny mezi doloženými činnostmi za období.',
    'Popiš věcně, jak individuální přístup podle potřeb, rovný přístup k podpoře, zapojení klienta do řešení situace a spolupráce služeb přispívaly k těmto principům. Neuváděj jména ani identifikátory. Piš česky, bez markdownu, v rozsahu přibližně 80 až 140 slov.',
    '',
    'ANONYMIZOVANÉ SOUHRNY AKTIVIT:',
    sourceTexts || 'Za období nejsou k dispozici evidované aktivity.'
  ].join('\n');
}
