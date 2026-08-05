const manifestCache = new Map();
const shardCache = new Map();

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

function descriptiveHouseNumber(value) {
  return normalizeText(value).split('/', 1)[0].replace(/\D/g, '');
}

function ruianPrefix(baseUrl = '') {
  return `${String(baseUrl || '').replace(/\/$/, '')}/ruian-index`;
}

async function loadRuianManifest({ baseUrl = '', fetchImpl = fetch } = {}) {
  const prefix = ruianPrefix(baseUrl);
  const useSharedCache = fetchImpl === globalThis.fetch;
  if (useSharedCache && manifestCache.has(prefix)) return manifestCache.get(prefix);

  const request = (async () => {
    const response = await fetchImpl(`${prefix}/manifest.json`, { cache: 'force-cache' });
    if (!response.ok) throw new Error('Registr RÚIAN pro ověření adres není dostupný.');
    return response.json();
  })();
  if (useSharedCache) {
    manifestCache.set(prefix, request);
    request.catch(() => manifestCache.delete(prefix));
  }
  return request;
}

function municipalityEntries(manifest) {
  return Object.entries(manifest?.municipalities || {}).map(([key, item]) => ({
    key: normalizeKey(key),
    name: normalizeText(item?.name || key),
    shards: Array.isArray(item?.shards) ? item.shards.map(String) : []
  }));
}

function findMunicipality(manifest, city) {
  const cityKey = normalizeKey(city);
  if (!cityKey) return null;
  const direct = manifest?.municipalities?.[cityKey];
  if (direct) {
    return {
      key: cityKey,
      name: normalizeText(direct.name || city),
      shards: Array.isArray(direct.shards) ? direct.shards.map(String) : []
    };
  }
  return municipalityEntries(manifest).find((entry) => normalizeKey(entry.name) === cityKey) || null;
}

function getMunicipalitySuggestions(manifest, query, zip = '', limit = 10) {
  const queryKey = normalizeKey(query);
  const normalizedZip = normalizeZip(zip);
  const zipNames = new Set(
    (manifest?.postalCodes?.[normalizedZip] || []).map(normalizeKey).filter(Boolean)
  );
  return municipalityEntries(manifest)
    .filter((entry) => (zipNames.size && zipNames.has(entry.key))
      || (queryKey.length >= 2 && entry.key.includes(queryKey)))
    .map((entry) => {
      let score = 3;
      if (entry.key === queryKey) score = 0;
      else if (entry.key.startsWith(queryKey)) score = 1;
      else if (zipNames.has(entry.key)) score = 2;
      return { ...entry, score };
    })
    .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name, 'cs'))
    .slice(0, limit);
}

async function loadRuianMunicipalityShards(municipality, {
  baseUrl = '',
  fetchImpl = fetch
} = {}) {
  if (!municipality?.shards?.length) return [];
  const prefix = ruianPrefix(baseUrl);
  const useSharedCache = fetchImpl === globalThis.fetch;

  return Promise.all(municipality.shards.map(async (code) => {
    const url = `${prefix}/${encodeURIComponent(code)}.json`;
    if (useSharedCache && shardCache.has(url)) return shardCache.get(url);
    const request = (async () => {
      const response = await fetchImpl(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Adresní data obce nelze načíst (${code}).`);
      return response.json();
    })();
    if (useSharedCache) {
      shardCache.set(url, request);
      request.catch(() => shardCache.delete(url));
    }
    return request;
  }));
}

function uniqueSorted(values, limit = 100) {
  return [...new Set(values.map(normalizeText).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'cs', { numeric: true }))
    .slice(0, limit);
}

function getAddressSuggestions(draft, manifest, shards = []) {
  const streetKey = normalizeKey(draft?.ulice);
  const house = descriptiveHouseNumber(draft?.cisloPopisne);
  const streetRows = shards.flatMap((shard) => Array.isArray(shard?.streets) ? shard.streets : []);
  const streets = uniqueSorted(
    streetRows
      .filter(([normalized, display, houses]) => {
        const candidateKey = normalizeKey(normalized || display);
        return (!streetKey || candidateKey.includes(streetKey))
          && (!house || (Array.isArray(houses) && houses.map(String).some((item) => item.startsWith(house))));
      })
      .map(([, display]) => display),
    12
  );
  const exactStreetRows = streetRows.filter(([normalized, display]) =>
    normalizeKey(normalized || display) === streetKey
  );
  const housePool = exactStreetRows.length
    ? exactStreetRows.flatMap(([, , houses]) => Array.isArray(houses) ? houses : [])
    : shards.flatMap((shard) => Array.isArray(shard?.houses) ? shard.houses : []);
  const houseQuery = descriptiveHouseNumber(draft?.cisloPopisne);
  const houses = uniqueSorted(
    housePool.map(String).filter((candidate) => !houseQuery || candidate.startsWith(houseQuery)),
    20
  );
  const zipQuery = normalizeText(draft?.psc).replace(/\D/g, '').slice(0, 5);
  const postalCodes = uniqueSorted(
    shards
      .flatMap((shard) => Array.isArray(shard?.zips) ? shard.zips : [])
      .map(String)
      .filter((candidate) => !zipQuery || candidate.startsWith(zipQuery)),
    10
  );

  return {
    municipalities: getMunicipalitySuggestions(manifest, draft?.mesto, draft?.psc),
    streets,
    houses,
    postalCodes
  };
}

function municipalityCandidatesFromZip(manifest, zip) {
  return (manifest?.postalCodes?.[normalizeZip(zip)] || [])
    .map((name) => findMunicipality(manifest, name))
    .filter(Boolean);
}

async function resolveMunicipalityForDraft(draft, manifest, options) {
  const direct = findMunicipality(manifest, draft?.mesto);
  if (direct) return { municipality: direct, enteredPart: '' };

  const house = descriptiveHouseNumber(draft?.cisloPopisne);
  const inferred = [];
  for (const candidate of municipalityCandidatesFromZip(manifest, draft?.psc)) {
    const shards = await loadRuianMunicipalityShards(candidate, options);
    if (!house || shards.some((shard) => (shard?.houses || []).map(String).includes(house))) {
      inferred.push({ municipality: candidate, shards });
    }
  }
  if (inferred.length !== 1) return null;
  return { ...inferred[0], enteredPart: normalizeText(draft?.mesto) };
}

async function validateClientAddress(draft, options = {}) {
  const manifest = options.manifest || await loadRuianManifest(options);
  const city = normalizeText(draft?.mesto);
  if (!city) return { valid: false, reason: 'Vyberte obec z nabídky RÚIAN.' };

  const mode = draft?.addressMode === 'municipalityOnly' ? 'municipalityOnly' : 'full';
  if (mode === 'municipalityOnly') {
    const municipality = findMunicipality(manifest, city);
    if (!municipality) {
      return { valid: false, reason: 'Obec nebyla nalezena v RÚIAN. Vyberte ji z nabídky.' };
    }
    return {
      valid: true,
      mode,
      normalizedAddress: {
        mesto: municipality.name,
        ulice: '',
        cisloPopisne: '',
        psc: '',
        addressMode: mode
      }
    };
  }

  const house = descriptiveHouseNumber(draft?.cisloPopisne);
  const zip = normalizeZip(draft?.psc);
  if (!house || !zip) {
    return {
      valid: false,
      reason: 'Pro úplnou adresu vyplňte číslo popisné a PSČ, případně zvolte „Pouze obec“.'
    };
  }

  const resolved = await resolveMunicipalityForDraft(draft, manifest, options);
  if (!resolved) return { valid: false, reason: 'Obec nebyla jednoznačně nalezena v RÚIAN.' };
  const shards = resolved.shards || await loadRuianMunicipalityShards(resolved.municipality, options);
  const houseShards = shards.filter((shard) => (shard?.houses || []).map(String).includes(house));
  if (!houseShards.length) {
    return { valid: false, reason: 'Číslo popisné nebylo v obci nalezeno.' };
  }
  const zipShards = houseShards.filter((shard) => (shard?.zips || []).map(String).includes(zip));
  if (!zipShards.length) {
    return { valid: false, reason: 'PSČ neodpovídá obci a číslu popisnému.' };
  }

  const street = normalizeText(draft?.ulice);
  const mappedStreetRows = zipShards
    .flatMap((shard) => Array.isArray(shard?.streets) ? shard.streets : [])
    .filter(([, , houses]) => (Array.isArray(houses) ? houses.map(String) : []).includes(house));
  const duplicatedMunicipalityAsStreet = Boolean(
    street
    && !mappedStreetRows.length
    && normalizeKey(street) === normalizeKey(resolved.municipality.name)
  );
  if (!street && mappedStreetRows.length) {
    return {
      valid: false,
      reason: 'K tomuto číslu domu je v RÚIAN vedena ulice. Vyberte ji z nabídky.'
    };
  }
  let canonicalStreet = '';
  if (street && !duplicatedMunicipalityAsStreet) {
    const streetKey = normalizeKey(street);
    const matchingStreet = mappedStreetRows.find(([normalized, display, houses]) =>
      normalizeKey(normalized || display) === streetKey
      && (Array.isArray(houses) ? houses.map(String) : []).includes(house)
    );
    if (!matchingStreet) {
      return { valid: false, reason: 'Ulice neodpovídá číslu popisnému v dané obci.' };
    }
    canonicalStreet = normalizeText(matchingStreet[1] || street);
  }

  return {
    valid: true,
    mode,
    normalizedAddress: {
      mesto: resolved.municipality.name,
      ulice: canonicalStreet,
      cisloPopisne: normalizeText(draft?.cisloPopisne),
      psc: zip,
      addressMode: mode
    }
  };
}

export {
  descriptiveHouseNumber,
  findMunicipality,
  getAddressSuggestions,
  getMunicipalitySuggestions,
  loadRuianManifest,
  loadRuianMunicipalityShards,
  normalizeKey,
  normalizeZip,
  validateClientAddress
};
