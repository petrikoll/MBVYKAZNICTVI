const PERSON_OUTPUT_HEADERS = Object.freeze([
  'Jmeno_Osoby',
  'Prijmeni_Osoby',
  'DatumNarozeni_Osoby',
  'Obec_TrvaleBydlisteOsoby',
  'CastObce_TrvaleBydlisteOsoby',
  'Ulice_TrvaleBydlisteOsoby',
  'CisloPopisne_TrvaleBydlisteOsoby',
  'CisloOrientacni_TrvaleBydlisteOsoby',
  'ZnakCislaOrientacniho_TrvaleBydlisteOsoby',
  'PSC_TrvaleBydlisteOsoby',
  'TitulPredJmenem_Osoby',
  'TitulZaJmenem_Osoby',
  'DatumVystupuZProjektu_Osoby',
  'DatumUmrti_Osoby',
  'Email_KontaktOsoby',
  'Telefon_KontaktOsoby',
  'VstupuDoProjektu_Osoby',
  'PodlePohlavi',
  'PodlePostaveniNaTrhuPrace_MonitorovaciList',
  'PodlePostaveniOsobyVProjektu_MonitorovaciList',
  'PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList',
  'PodlePristupuKBydleni_MonitorovaciList',
  'PodleAktivityVSektoruEkonomiky_MonitorovaciList',
  'PodleSpecifikacePusobeniVeVerejnemSektoru_MonitorovaciList',
  'PodleTypuZnevyhodneni_MonitorovaciList',
  'PodleOsobSdilejicichStejnouDomacnost_MonitorovaciList',
  'PodleDruhuObdrzenePodpory_MonitorovaciList',
  'PodlePostaveniDaneOsoby_MonitorovaciList',
  'PodleVysledkuUcasti_MonitorovaciList',
  'PodleSituacePoUkonceniUcastiVProjektu_MonitorovaciList',
  'ProhlaseniPodporeneOsobyOUzemniZpusobilosti_MonitorovaciList',
  'Partner'
]);

const GENDER_CODES = Object.freeze({
  m: 'POHMUZI',
  muž: 'POHMUZI',
  muži: 'POHMUZI',
  muz: 'POHMUZI',
  muzi: 'POHMUZI',
  mužské: 'POHMUZI',
  male: 'POHMUZI',
  pohmuzi: 'POHMUZI',
  ž: 'POHZENY',
  žena: 'POHZENY',
  ženy: 'POHZENY',
  zena: 'POHZENY',
  zeny: 'POHZENY',
  ženské: 'POHZENY',
  female: 'POHZENY',
  pohzeny: 'POHZENY'
});

const LABOUR_CODES = Object.freeze({
  zaměstnanci: 'TPZAMCI',
  zaměstnanec: 'TPZAMCI',
  zaměstnaný: 'TPZAMCI',
  zaměstnaná: 'TPZAMCI',
  pracující: 'TPZAMCI',
  tpzamci: 'TPZAMCI',
  'osoby samostatně výdělečně činné': 'TPOSVC',
  osvč: 'TPOSVC',
  tposvc: 'TPOSVC',
  'osoby na mateřské dovolené (před md zaměstnané)': 'TPMATZ',
  tpmatz: 'TPMATZ',
  'osoby na mateřské dovolené (před md osvč)': 'TPMATO',
  tpmato: 'TPMATO',
  'krátkodobě nezaměstnaní – registrovaní na úp čr (<12 měsíců)': 'TNKNEZ',
  'krátkodobě nezaměstnaní - registrovaní na úp čr (<12 měsíců)': 'TNKNEZ',
  'krátkodobě nezaměstnaný': 'TNKNEZ',
  'krátkodobě nezaměstnaná': 'TNKNEZ',
  tnknez: 'TNKNEZ',
  'dlouhodobě nezaměstnaní – registrovaní na úp čr (≥12 měsíců)': 'TPDNEZ',
  'dlouhodobě nezaměstnaní - registrovaní na úp čr (>=12 měsíců)': 'TPDNEZ',
  'dlouhodobě nezaměstnaný': 'TPDNEZ',
  'dlouhodobě nezaměstnaná': 'TPDNEZ',
  tpdnez: 'TPDNEZ',
  'žáci / studenti / učni (denní studium)': 'TPSTUD',
  'žáci, studenti, učni (denní studium)': 'TPSTUD',
  student: 'TPSTUD',
  studentka: 'TPSTUD',
  tpstud: 'TPSTUD',
  'osoby ve starobním důchodu, neregistrované na úp': 'TPSTD',
  'osoby ve starobním důchodu, neregistrované na úp čr': 'TPSTD',
  tpstd: 'TPSTD',
  'osoby v invalidním důchodu, neregistrované na úp': 'TPINV',
  'osoby v invalidním důchodu, neregistrované na úp čr': 'TPINV',
  tpinv: 'TPINV',
  'osoby na rodičovské dovolené': 'TPRODI',
  'rodičovská dovolená': 'TPRODI',
  tprodi: 'TPRODI',
  'ostatní neaktivní osoby': 'TPNEAKO',
  neaktivní: 'TPNEAKO',
  tpneako: 'TPNEAKO'
});

const EDUCATION_CODES = Object.freeze({
  'bez vzdělání': 'VZ0',
  'bez vzdělání (nedokončené základní vzdělání) – isced 0': 'VZ0',
  'bez vzdělání (nedokončené základní vzdělání) - isced 0': 'VZ0',
  vz0: 'VZ0',
  zš: 'VZISCED1-2',
  zs: 'VZISCED1-2',
  zl: 'VZISCED1-2',
  základní: 'VZISCED1-2',
  'základní vzdělání': 'VZISCED1-2',
  'bez ukončeného základního vzdělání': 'VZ0',
  'základní vč. nedokončeného 2. stupně zš – isced 1–2': 'VZISCED1-2',
  'základní vč. nedokončeného 2. stupně zš - isced 1-2': 'VZISCED1-2',
  'základní vzdělání vč. nedokončeného 2. stupně zš – isced 1–2': 'VZISCED1-2',
  'základní vzdělání vč. nedokončeného 2. stupně zš - isced 1-2': 'VZISCED1-2',
  'základní vzdělání včetně nedokončeného 2. stupně zš': 'VZISCED1-2',
  'vzisced1-2': 'VZISCED1-2',
  sou: 'VZISCED3-4',
  sš: 'VZISCED3-4',
  ss: 'VZISCED3-4',
  sl: 'VZISCED3-4',
  středoškolské: 'VZISCED3-4',
  'střední vzdělání': 'VZISCED3-4',
  vyučen: 'VZISCED3-4',
  vyučena: 'VZISCED3-4',
  vyučený: 'VZISCED3-4',
  vyučená: 'VZISCED3-4',
  maturita: 'VZISCED3-4',
  'sš s maturitou': 'VZISCED3-4',
  'sš bez maturity': 'VZISCED3-4',
  'středoškolské vč. vyučení/maturity/pomaturitního studia – isced 3–4': 'VZISCED3-4',
  'středoškolské vč. vyučení/maturity/pomaturitního studia - isced 3-4': 'VZISCED3-4',
  'středoškolské vzdělání vč. vyučení, maturity anebo pomaturitního studia': 'VZISCED3-4',
  'vzisced3-4': 'VZISCED3-4',
  voš: 'VZISCED5-8',
  vš: 'VZISCED5-8',
  vl: 'VZISCED5-8',
  vysokoškolské: 'VZISCED5-8',
  bakalář: 'VZISCED5-8',
  magistr: 'VZISCED5-8',
  phd: 'VZISCED5-8',
  'vyšší odborné / bc. / mgr. / ph.d. – isced 5–8': 'VZISCED5-8',
  'vyšší odborné / bc. / mgr. / ph.d. - isced 5-8': 'VZISCED5-8',
  'vyšší odborné, bakalářské, magisterské, doktorské studium': 'VZISCED5-8',
  'vzisced5-8': 'VZISCED5-8',
  jiné: 'VZJN',
  'vzdělání jinde neuvedené': 'VZJN',
  vzjn: 'VZJN'
});

const EDUCATION_CODE_PATTERN = /^VZ(?:0|ISCED1-2|ISCED3-4|ISCED5-8|JN)$/;

const DISADVANTAGE_CODES = Object.freeze({
  'osoby se zdravotním postižením': 'ZNZP',
  znzp: 'ZNZP',
  'národnostní menšiny': 'ZNMIG',
  'národnostní menšiny (včetně marginalizovaných komunit jako jsou romové)': 'ZNMIG',
  znmig: 'ZNMIG',
  'státní příslušníci třetích zemí': 'ZNPTZ',
  znptz: 'ZNPTZ',
  'účastníci zahraničního původu': 'ZNUZP',
  znuzp: 'ZNUZP',
  'osoby bez domova nebo osoby vyloučené z přístupu k bydlení': 'PBOBP',
  pbobp: 'PBOBP',
  'osoby po výkonu trestu': 'SPPVT',
  sppvt: 'SPPVT',
  'osoby ohrožené závislostí': 'SPOZ',
  spoz: 'SPOZ',
  'osoby s jiným znevýhodněním': 'SPZSV',
  spzsv: 'SPZSV',
  'bez znevýhodnění / neuvedeno': ''
});

const EXIT_SITUATION_CODES = Object.freeze({
  'osoba v procesu vzdělávání nebo odborné přípravy': 'SPVZD',
  spvzd: 'SPVZD',
  'osoba, která po svém zapojení do projektu získala kvalifikaci': 'SPUKV',
  spukv: 'SPUKV',
  'osoba, u které intervence formou sociální práce naplnila svůj účel': 'SPUINU',
  spuinu: 'SPUINU',
  'osoba, která obdržela podporu v oblasti digitálních dovedností': 'SPDIG',
  spdig: 'SPDIG',
  'znevýhodněná osoba, která byla umístěna na pracovním místě podpořeném z projektu': 'SPZOUM',
  spzoum: 'SPZOUM'
});

function normalizeText(value) {
  return String(value ?? '').replace(/\u0000/g, '').trim().replace(/\s+/g, ' ');
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLocaleLowerCase('cs-CZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeZip(value) {
  const digits = normalizeText(value).replace(/\D/g, '');
  return digits ? digits.padStart(5, '0').slice(-5) : '';
}

function normalizePhone(value) {
  const text = normalizeText(value);
  if (!text) return '';
  return text.startsWith('+') ? `+${text.slice(1).replace(/\D/g, '')}` : text.replace(/\D/g, '');
}

function toCzechDate(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${Number(iso[3])}.${Number(iso[2])}.${iso[1]}`;
  const czech = text.match(/^(\d{1,2})[./-]\s*(\d{1,2})[./-]\s*(\d{2}|\d{4})$/);
  if (!czech) return text;
  const shortYear = Number(czech[3]);
  const year = czech[3].length === 2 ? (shortYear <= 49 ? 2000 + shortYear : 1900 + shortYear) : shortYear;
  return `${Number(czech[1])}.${Number(czech[2])}.${year}`;
}

function isValidCzechDate(value) {
  const match = String(value || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return false;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return date.getFullYear() === Number(match[3])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[1]);
}

function resolveCode(value, map) {
  const text = normalizeText(value);
  if (!text) return '';
  const normalized = normalizeKey(text);
  const matchedEntry = Object.entries(map).find(([candidate]) => normalizeKey(candidate) === normalized);
  if (matchedEntry) return matchedEntry[1];
  const alreadyCode = text.toUpperCase();
  if (Object.values(map).includes(alreadyCode)) return alreadyCode;
  return alreadyCode;
}

function resolveEducationCode(value) {
  const code = resolveCode(value, EDUCATION_CODES);
  if (EDUCATION_CODE_PATTERN.test(code)) return code;

  const normalized = normalizeKey(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized) return '';

  if (/\bisced\s*0\b/.test(normalized)) return 'VZ0';
  if (/\bisced\s*(?:1\s*(?:az|-)?\s*2|1|2)\b/.test(normalized)) return 'VZISCED1-2';
  if (/\bisced\s*(?:3\s*(?:az|-)?\s*4|3|4)\b/.test(normalized)) return 'VZISCED3-4';
  if (/\bisced\s*(?:5\s*(?:az|-)?\s*8|5|6|7|8)\b/.test(normalized)) return 'VZISCED5-8';

  if (/\b(?:bez\s+vzdelani|bez\s+ukonceneho\s+zakladniho|nedokoncene\s+zakladni)\b/.test(normalized)) {
    return 'VZ0';
  }
  if (/\b(?:vyssi\s+odborn\w*|vos|vysokoskol\w*|vs|bakalar\w*|magistr\w*|doktor\w*|ph\s*d)\b/.test(normalized)) {
    return 'VZISCED5-8';
  }
  if (/\b(?:stredoskol\w*|stredni|sou|ss|vyucen\w*|ucnov\w*|maturit\w*|pomaturit\w*)\b/.test(normalized)) {
    return 'VZISCED3-4';
  }
  if (/\b(?:zakladni|zs)\b/.test(normalized)) return 'VZISCED1-2';
  if (/\b(?:jinde\s+neuveden\w*|jine)\b/.test(normalized)) return 'VZJN';

  return '';
}

function resolveMultipleCodes(value, map) {
  return normalizeText(value)
    .split(/\||;|\n/)
    .map((item) => resolveCode(item, map))
    .filter(Boolean)
    .join('|');
}

function splitHouseNumber(value) {
  const text = normalizeText(value);
  if (!text) return ['', '', ''];
  const [descriptive, orientation = ''] = text.split('/', 2);
  const match = orientation.match(/^(\d+)([A-Za-zÁ-ž]*)$/);
  if (!match) return [descriptive, orientation, ''];
  return [descriptive, match[1], match[2]];
}

function emptyPersonOutput() {
  return Object.fromEntries(PERSON_OUTPUT_HEADERS.map((header) => [header, '']));
}

function buildPersonOutput(client) {
  const values = emptyPersonOutput();
  const [houseNumber, orientationNumber, orientationLetter] = splitHouseNumber(client.cisloPopisne);
  values.Jmeno_Osoby = normalizeText(client.jmeno);
  values.Prijmeni_Osoby = normalizeText(client.prijmeni);
  values.DatumNarozeni_Osoby = toCzechDate(client.datumNarozeni);
  values.Obec_TrvaleBydlisteOsoby = normalizeText(client.mesto);
  values.Ulice_TrvaleBydlisteOsoby = normalizeText(client.ulice);
  values.CisloPopisne_TrvaleBydlisteOsoby = houseNumber;
  values.CisloOrientacni_TrvaleBydlisteOsoby = orientationNumber;
  values.ZnakCislaOrientacniho_TrvaleBydlisteOsoby = orientationLetter;
  values.PSC_TrvaleBydlisteOsoby = normalizeZip(client.psc);
  values.DatumVystupuZProjektu_Osoby = toCzechDate(client.datumVystupu);
  values.Email_KontaktOsoby = normalizeText(client.email || client.datovaSchranka);
  values.Telefon_KontaktOsoby = normalizePhone(client.telefon);
  values.VstupuDoProjektu_Osoby = toCzechDate(client.datumVstupu);
  values.PodlePohlavi = resolveCode(client.pohlavi, GENDER_CODES);
  values.PodlePostaveniNaTrhuPrace_MonitorovaciList = resolveCode(client.postaveniNaTrhu, LABOUR_CODES);
  values.PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList =
    resolveEducationCode(client.vzdelani) || 'VZJN';
  values.PodleTypuZnevyhodneni_MonitorovaciList = resolveMultipleCodes(client.znevyhodneni, DISADVANTAGE_CODES);
  values.PodleSituacePoUkonceniUcastiVProjektu_MonitorovaciList = resolveMultipleCodes(
    client.situacePoUkonceni,
    EXIT_SITUATION_CODES
  );
  values.Partner = normalizeText(client.partner);
  return values;
}

function validateNonAddressFields(values) {
  const issues = [];
  const required = [
    ['Jmeno_Osoby', 'jméno'],
    ['Prijmeni_Osoby', 'příjmení'],
    ['DatumNarozeni_Osoby', 'datum narození'],
    ['Obec_TrvaleBydlisteOsoby', 'obec'],
    ['VstupuDoProjektu_Osoby', 'datum vstupu do projektu'],
    ['PodlePohlavi', 'pohlaví'],
    ['PodlePostaveniNaTrhuPrace_MonitorovaciList', 'postavení na trhu práce'],
    ['PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList', 'nejvyšší dosažené vzdělání']
  ];
  required.forEach(([field, label]) => {
    if (!values[field]) issues.push(`chybí ${label}`);
  });
  [
    ['DatumNarozeni_Osoby', 'datum narození'],
    ['VstupuDoProjektu_Osoby', 'datum vstupu'],
    ['DatumVystupuZProjektu_Osoby', 'datum výstupu']
  ].forEach(([field, label]) => {
    if (values[field] && !isValidCzechDate(values[field])) issues.push(`${label} nemá formát d.m.rrrr`);
  });
  if (values.PodlePohlavi && !['POHMUZI', 'POHZENY'].includes(values.PodlePohlavi)) {
    issues.push('neznámý kód pohlaví');
  }
  if (
    values.PodlePostaveniNaTrhuPrace_MonitorovaciList
    && !/^(?:TP|TN)[A-Z]+$/.test(values.PodlePostaveniNaTrhuPrace_MonitorovaciList)
  ) {
    issues.push('neznámý kód postavení na trhu práce');
  }
  if (
    values.PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList
    && !EDUCATION_CODE_PATTERN.test(values.PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList)
  ) {
    issues.push('neznámý kód vzdělání');
  }
  return issues;
}

function deserializeMunicipalityShard(shard) {
  const streetEntries = (Array.isArray(shard.streets) ? shard.streets : []).map(
    ([normalized, display, houses]) => ({
      normalized: normalizeKey(normalized),
      display: normalizeText(display),
      houses: new Set(Array.isArray(houses) ? houses.map(String) : [])
    })
  );
  return {
    code: String(shard.code || ''),
    name: String(shard.name || ''),
    zips: new Set(Array.isArray(shard.zips) ? shard.zips.map(String) : []),
    houses: new Set(Array.isArray(shard.houses) ? shard.houses.map(String) : []),
    defaultPart: normalizeText(shard.defaultPart),
    partHouses: new Map(
      (Array.isArray(shard.parts) ? shard.parts : []).map(([normalized, display, houses]) => [
        normalizeKey(normalized),
        {
          display: normalizeText(display),
          houses: new Set(Array.isArray(houses) ? houses.map(String) : [])
        }
      ])
    ),
    streetEntries,
    streetHouses: new Map(streetEntries.map((street) => [street.normalized, street.houses]))
  };
}

function createAddressRegistry(manifest, shards) {
  const deserializedShards = new Map(
    [...shards.entries()].map(([code, shard]) => [String(code), deserializeMunicipalityShard(shard)])
  );
  const byCity = new Map();
  Object.entries(manifest?.municipalities || {}).forEach(([cityKey, item]) => {
    const candidates = (item.shards || [])
      .map((code) => deserializedShards.get(String(code)))
      .filter(Boolean);
    if (candidates.length) byCity.set(normalizeKey(cityKey), candidates);
  });
  const byZip = new Map();
  deserializedShards.forEach((candidate) => {
    candidate.zips.forEach((zip) => {
      const existing = byZip.get(zip) || [];
      if (!existing.some((item) => item.code === candidate.code)) existing.push(candidate);
      byZip.set(zip, existing);
    });
  });
  return { byCity, byZip, manifest };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadRuianRegistryForClients(clients, {
  baseUrl = '',
  fetchImpl = fetch,
  onProgress = () => {}
} = {}) {
  const prefix = `${String(baseUrl || '').replace(/\/$/, '')}/ruian-index`;
  onProgress({ phase: 'manifest', current: 0, total: 1 });
  const manifestResponse = await fetchImpl(`${prefix}/manifest.json`, { cache: 'no-cache' });
  if (!manifestResponse.ok) {
    throw new Error('Index RÚIAN pro kontrolu adres není dostupný.');
  }
  const manifest = await manifestResponse.json();
  const cityKeys = [...new Set(clients.map((client) => normalizeKey(client.mesto)).filter(Boolean))];
  const zipCityKeys = [...new Set(
    clients.flatMap((client) => {
      const zip = normalizeZip(client.psc);
      return (manifest?.postalCodes?.[zip] || manifest?.citiesByZip?.[zip] || []).map(normalizeKey);
    })
  )];
  const shardCodes = [...new Set(
    [...cityKeys, ...zipCityKeys].flatMap((cityKey) => manifest?.municipalities?.[cityKey]?.shards || [])
  )].map(String);
  const shards = new Map();
  let completed = 0;
  await mapWithConcurrency(shardCodes, 6, async (code) => {
    const response = await fetchImpl(`${prefix}/${encodeURIComponent(code)}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Nelze načíst adresní data obce (${code}).`);
    shards.set(code, await response.json());
    completed += 1;
    onProgress({ phase: 'municipalities', current: completed, total: shardCodes.length });
  });
  onProgress({ phase: 'done', current: shardCodes.length, total: shardCodes.length });
  return createAddressRegistry(manifest, shards);
}

function validateAddress(values, registry) {
  const city = normalizeText(values.Obec_TrvaleBydlisteOsoby);
  const cityKey = normalizeKey(city);
  const house = normalizeText(values.CisloPopisne_TrvaleBydlisteOsoby);
  const zip = normalizeZip(values.PSC_TrvaleBydlisteOsoby);
  const street = normalizeText(values.Ulice_TrvaleBydlisteOsoby);
  let candidates = registry?.byCity?.get(cityKey) || [];
  let partOfMunicipality = '';

  const cityMatchesZip = !zip || candidates.some((candidate) => candidate.zips.has(zip));
  if (!candidates.length || !cityMatchesZip) {
    const inferredCandidates = (registry?.byZip?.get(zip) || [])
      .filter((candidate) => !house || candidate.houses.has(house));
    const uniqueCandidates = [...new Map(
      inferredCandidates.map((candidate) => [candidate.code, candidate])
    ).values()];
    if (uniqueCandidates.length === 1) {
      candidates = uniqueCandidates;
      partOfMunicipality = city;
    } else if (!candidates.length) {
      return { valid: false, reason: 'Obec nebyla nalezena v RÚIAN.' };
    }
  }
  if (!house || !zip) {
    return { valid: false, reason: 'Chybí číslo popisné nebo PSČ.' };
  }
  const houseCandidates = candidates.filter((candidate) => candidate.houses.has(house));
  if (!houseCandidates.length) {
    return { valid: false, reason: 'Číslo popisné nebylo v obci nalezeno.' };
  }
  const zipCandidates = houseCandidates.filter((candidate) => candidate.zips.has(zip));
  if (!zipCandidates.length) {
    return { valid: false, reason: 'PSČ neodpovídá obci a číslu popisnému.' };
  }
  const matchedParts = [...new Set(
    zipCandidates.flatMap((candidate) =>
      [
        ...(candidate.defaultPart && candidate.houses.has(house) ? [candidate.defaultPart] : []),
        ...[...candidate.partHouses.values()]
          .filter((part) => part.houses.has(house))
          .map((part) => part.display)
      ].filter(Boolean)
    )
  )];
  const canonicalCity = normalizeText(zipCandidates[0]?.name || city);
  if (matchedParts.length === 1) {
    const matchedPart = matchedParts[0];
    partOfMunicipality = normalizeKey(matchedPart) === normalizeKey(canonicalCity)
      ? ''
      : matchedPart;
  }
  if (street) {
    const streetKey = normalizeKey(street);
    const streetMatches = zipCandidates.some((candidate) => candidate.streetHouses.get(streetKey)?.has(house));
    if (!streetMatches) {
      return {
        valid: true,
        canonicalCity: normalizeText(zipCandidates[0]?.name || city),
        partOfMunicipality,
        omitStreet: true,
        reason: 'Ulice nebyla potvrzena; podle pravidla původního generátoru ji dohledá IS ESF.'
      };
    }
  }
  return { valid: true, canonicalCity, partOfMunicipality };
}

function keepMunicipalityOnly(values) {
  return {
    ...values,
    CastObce_TrvaleBydlisteOsoby: '',
    Ulice_TrvaleBydlisteOsoby: '',
    CisloPopisne_TrvaleBydlisteOsoby: '',
    CisloOrientacni_TrvaleBydlisteOsoby: '',
    ZnakCislaOrientacniho_TrvaleBydlisteOsoby: '',
    PSC_TrvaleBydlisteOsoby: ''
  };
}

function findPartForHouse(candidate, house) {
  if (candidate.defaultPart && candidate.houses.has(house)) return candidate.defaultPart;
  return [...candidate.partHouses.values()].find((part) => part.houses.has(house))?.display || '';
}

function selectMunicipalityReferenceAddress(values, registry) {
  const city = normalizeText(values.Obec_TrvaleBydlisteOsoby);
  const candidates = registry?.byCity?.get(normalizeKey(city)) || [];
  for (const candidate of candidates) {
    const house = candidate.houses.values().next().value || '';
    const zip = candidate.zips.values().next().value || '';
    if (!house || !zip) continue;
    const street = candidate.streetEntries.find((item) => item.houses.has(house))?.display || '';
    return {
      city: normalizeText(candidate.name || city),
      partOfMunicipality: findPartForHouse(candidate, house),
      street,
      house,
      zip
    };
  }
  return null;
}

function applyMunicipalityReferenceAddress(values, referenceAddress) {
  return {
    ...keepMunicipalityOnly(values),
    Obec_TrvaleBydlisteOsoby: referenceAddress.city,
    CastObce_TrvaleBydlisteOsoby: referenceAddress.partOfMunicipality,
    Ulice_TrvaleBydlisteOsoby: referenceAddress.street,
    CisloPopisne_TrvaleBydlisteOsoby: referenceAddress.house,
    PSC_TrvaleBydlisteOsoby: referenceAddress.zip
  };
}

function validateMunicipalityOnly(values, registry) {
  const city = normalizeText(values.Obec_TrvaleBydlisteOsoby);
  const candidates = registry?.byCity?.get(normalizeKey(city)) || [];
  if (!candidates.length) {
    return {
      valid: false,
      canonicalCity: city,
      reason: 'Obec nebyla nalezena v RÚIAN; v CSV je přesto ponechána pro dohledání v IS ESF.'
    };
  }
  const referenceAddress = selectMunicipalityReferenceAddress(values, registry);
  if (!referenceAddress) {
    return {
      valid: false,
      canonicalCity: normalizeText(candidates[0]?.name || city),
      reason: 'Obec byla nalezena v RÚIAN, ale neobsahuje použitelné adresní místo; v CSV je ponechána pouze obec.'
    };
  }
  return {
    valid: true,
    canonicalCity: normalizeText(candidates[0]?.name || city),
    referenceAddress,
    reason: `Klient je evidován pouze na úrovni obce; CSV automaticky použilo referenční adresu z RÚIAN: ${[
      referenceAddress.street,
      referenceAddress.house,
      referenceAddress.city,
      referenceAddress.zip
    ].filter(Boolean).join(', ')}.`
  };
}

async function buildIsEsfPersonExport(clients, options = {}) {
  const sourceClients = Array.isArray(clients) ? clients : [];
  if (!sourceClients.length) throw new Error('V aktuálním projektu nejsou žádní klienti k exportu.');
  const registry = options.registry || await loadRuianRegistryForClients(sourceClients, options);
  const rows = [];
  const addressFallbacks = [];
  const addressAdjustments = [];
  const educationFallbacks = [];
  const blockingIssues = [];
  const identities = new Map();

  sourceClients.forEach((client, index) => {
    if (!resolveEducationCode(client.vzdelani)) {
      educationFallbacks.push({
        clientId: client.id || '',
        clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim(),
        reason: 'Vzdělání není uvedeno nebo nemá rozpoznanou hodnotu; CSV používá platný obecný kód VZJN.'
      });
    }
    let values = buildPersonOutput(client);
    const municipalityOnly = client?.addressMode === 'municipalityOnly'
      || client?.address_mode === 'municipalityOnly'
      || (
        !normalizeText(client?.ulice)
        && !normalizeText(client?.cisloPopisne)
        && !normalizeZip(client?.psc)
      );
    const addressResult = municipalityOnly
      ? validateMunicipalityOnly(values, registry)
      : validateAddress(values, registry);
    if (municipalityOnly) {
      if (addressResult.valid && addressResult.referenceAddress) {
        values = applyMunicipalityReferenceAddress(values, addressResult.referenceAddress);
        addressAdjustments.push({
          clientId: client.id || '',
          clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim(),
          reason: addressResult.reason
        });
      } else {
        values = keepMunicipalityOnly(values);
        values.Obec_TrvaleBydlisteOsoby =
          addressResult.canonicalCity || values.Obec_TrvaleBydlisteOsoby;
        addressFallbacks.push({
          clientId: client.id || '',
          clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim(),
          reason: addressResult.reason
        });
      }
    } else if (addressResult.valid) {
      values.Obec_TrvaleBydlisteOsoby = addressResult.canonicalCity || values.Obec_TrvaleBydlisteOsoby;
      if (addressResult.partOfMunicipality) {
        values.CastObce_TrvaleBydlisteOsoby = addressResult.partOfMunicipality;
      }
      if (addressResult.omitStreet) {
        values.Ulice_TrvaleBydlisteOsoby = '';
        addressAdjustments.push({
          clientId: client.id || '',
          clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim(),
          reason: addressResult.reason
        });
      }
    } else {
      values = keepMunicipalityOnly(values);
      addressFallbacks.push({
        clientId: client.id || '',
        clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim(),
        reason: addressResult.reason
      });
    }
    const issues = validateNonAddressFields(values);
    if (issues.length) {
      blockingIssues.push({
        clientId: client.id || '',
        clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim() || `Řádek ${index + 1}`,
        issues
      });
    }
    const identity = [
      values.Jmeno_Osoby,
      values.Prijmeni_Osoby,
      values.DatumNarozeni_Osoby
    ].map(normalizeKey).join('|');
    if (identities.has(identity)) {
      blockingIssues.push({
        clientId: client.id || '',
        clientName: client.fullName || `${client.jmeno || ''} ${client.prijmeni || ''}`.trim(),
        issues: ['duplicitní osoba v exportu']
      });
    } else {
      identities.set(identity, index);
    }
    rows.push(values);
  });

  return {
    headers: PERSON_OUTPUT_HEADERS,
    rows,
    blockingIssues,
    addressFallbacks,
    addressAdjustments,
    educationFallbacks,
    fullAddressCount: rows.length - addressFallbacks.length
  };
}

function escapeCsv(value) {
  const clean = String(value ?? '').replace(/\u0000/g, '');
  return /[;"\r\n]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
}

function serializeIsEsfPersonCsv(rows) {
  const allRows = [
    PERSON_OUTPUT_HEADERS,
    ...(Array.isArray(rows) ? rows : []).map((row) => PERSON_OUTPUT_HEADERS.map((header) => row[header] || ''))
  ];
  return `\uFEFF${allRows.map((row) => row.map(escapeCsv).join(';')).join('\r\n')}\r\n`;
}

export {
  PERSON_OUTPUT_HEADERS,
  buildIsEsfPersonExport,
  buildPersonOutput,
  createAddressRegistry,
  keepMunicipalityOnly,
  loadRuianRegistryForClients,
  selectMunicipalityReferenceAddress,
  validateMunicipalityOnly,
  serializeIsEsfPersonCsv,
  validateAddress,
  validateNonAddressFields
};
