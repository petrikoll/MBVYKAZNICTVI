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
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
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

function buildKa1Text(records) {
  const plans = records.filter((record) => record.entityType === 'plans' && canonicalKa(record.ka) === 'KA1');
  const support = records.filter((record) => record.entityType !== 'plans' && canonicalKa(record.ka) === 'KA1');
  const all = plans.concat(support);
  if (!all.length) return 'Ve sledovaném období nebyla v KA1 evidována individuální podpora ani práce s individuálními plány.';

  const areas = topValues(support, (record) => record.payload?.supportArea);
  const types = topValues(support, (record) => record.payload?.consultationType || record.title);
  const minutes = all.reduce((sum, record) => sum + recordMinutes(record), 0);
  return [
    `V KA1 byla ve sledovaném období poskytována individuální podpora ${uniqueClientCount(all)} klientům. Evidováno bylo ${support.length} výkonů individuální podpory a ${plans.length} vytvořených nebo aktualizovaných individuálních plánů v celkovém rozsahu ${formatHours(minutes)}`,
    areas.length ? `Podpora se nejčastěji zaměřovala na oblasti ${sentenceList(areas)}.` : '',
    types.length ? `Využívanými formami práce byly zejména ${sentenceList(types)}.` : '',
    'Podpora vycházela z evidovaných potřeb klientů a podle povahy zakázky navazovala na cíle individuálních plánů.'
  ].filter(Boolean).join(' ');
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
    `V části KA2 zaměřené na case management bylo realizováno ${caseRecords.length} aktivit pro ${uniqueClientCount(caseRecords)} klientů v celkovém rozsahu ${formatHours(minutes)}`,
    partnerNames.size ? `Do koordinace podpory bylo zapojeno ${partnerNames.size} různých aktérů nebo partnerských subjektů.` : '',
    areas.length ? `Řešené zakázky se nejčastěji týkaly oblastí ${sentenceList(areas)}.` : '',
    types.length ? `Evidované aktivity zahrnovaly zejména ${sentenceList(types)}.` : '',
    'Práce byla zaměřena na koordinaci návazné podpory, sdílení rolí zapojených aktérů a domlouvání doložených dalších kroků.'
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
    `V části KA2 zaměřené na tvorbu a rozvoj sítě bylo uskutečněno ${network.length} síťových a koordinačních aktivit${minutes ? ` v rozsahu ${formatHours(minutes)}` : ''}.`,
    partnerNames.size ? `V evidenci se objevilo ${partnerNames.size} různých partnerských subjektů.` : '',
    types.length ? `Realizované aktivity zahrnovaly zejména ${sentenceList(types)}.` : '',
    'Činnost směřovala k udržování spolupráce, koordinaci dostupné podpory a rozvoji funkční místní sítě.'
  ].filter(Boolean).join(' ');
}

export function buildZorTexts(records = []) {
  const safeRecords = Array.isArray(records) ? records.filter(Boolean) : [];
  return {
    'KA1 – Individuální podpora': buildKa1Text(safeRecords),
    'KA2 – Case management a tvorba sítě': [
      'a) Case management',
      buildKa2CaseText(safeRecords),
      '',
      'b) Tvorba a rozvoj sítě',
      buildKa2NetworkText(safeRecords)
    ].join('\n')
  };
}
