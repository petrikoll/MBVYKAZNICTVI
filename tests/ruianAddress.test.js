import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findMunicipality,
  getAddressSuggestions,
  getMunicipalitySuggestions,
  validateClientAddress
} from '../src/lib/ruianAddress.js';

const manifest = {
  municipalities: {
    ostrava: { name: 'Ostrava', shards: ['554821'] },
    'divci hrad': { name: 'Dívčí Hrad', shards: ['551864'] }
  },
  postalCodes: {
    '70030': ['Ostrava'],
    '79399': ['Dívčí Hrad']
  }
};

const shardByCode = {
  554821: {
    code: '554821',
    name: 'Ostrava',
    zips: ['70030'],
    houses: ['791'],
    streets: [['horni', 'Horní', ['791']]]
  },
  551864: {
    code: '551864',
    name: 'Dívčí Hrad',
    zips: ['79399'],
    houses: ['100'],
    streets: []
  }
};

const fetchImpl = async (url) => {
  const code = String(url).match(/\/(\d+)\.json$/)?.[1];
  if (String(url).endsWith('/manifest.json')) {
    return { ok: true, json: async () => manifest };
  }
  if (code && shardByCode[code]) {
    return { ok: true, json: async () => shardByCode[code] };
  }
  return { ok: false, json: async () => ({}) };
};

test('nabízí obce, ulice, čísla domů a PSČ podle rozpracované adresy', () => {
  assert.equal(findMunicipality(manifest, 'ostrava')?.name, 'Ostrava');
  assert.deepEqual(
    getMunicipalitySuggestions(manifest, 'ost').map((item) => item.name),
    ['Ostrava']
  );

  const suggestions = getAddressSuggestions(
    { mesto: 'Ostrava', ulice: 'Hor', cisloPopisne: '79', psc: '700' },
    manifest,
    [shardByCode[554821]]
  );
  assert.deepEqual(suggestions.streets, ['Horní']);
  assert.deepEqual(suggestions.houses, ['791']);
  assert.deepEqual(suggestions.postalCodes, ['70030']);
});

test('potvrdí platnou úplnou adresu a zachová orientační číslo', async () => {
  const result = await validateClientAddress({
    mesto: 'ostrava',
    ulice: 'horni',
    cisloPopisne: '791/3',
    psc: '700 30',
    addressMode: 'full'
  }, { manifest, fetchImpl });

  assert.equal(result.valid, true);
  assert.deepEqual(result.normalizedAddress, {
    mesto: 'Ostrava',
    ulice: 'Horní',
    cisloPopisne: '791/3',
    psc: '70030',
    addressMode: 'full'
  });
});

test('neumožní uložit ulici, která neodpovídá číslu domu', async () => {
  const result = await validateClientAddress({
    mesto: 'Ostrava',
    ulice: 'Neplatná',
    cisloPopisne: '791/3',
    psc: '70030'
  }, { manifest, fetchImpl });

  assert.equal(result.valid, false);
  assert.match(result.reason, /Ulice neodpovídá/);
});

test('obec omylem zapsanou také do ulice u obce bez ulic bezpečně odstraní', async () => {
  const result = await validateClientAddress({
    mesto: 'Dívčí Hrad',
    ulice: 'Dívčí Hrad',
    cisloPopisne: '100',
    psc: '79399'
  }, { manifest, fetchImpl });

  assert.equal(result.valid, true);
  assert.deepEqual(result.normalizedAddress, {
    mesto: 'Dívčí Hrad',
    ulice: '',
    cisloPopisne: '100',
    psc: '79399',
    addressMode: 'full'
  });
});

test('u domu vedeného v ulici vyžaduje její doplnění', async () => {
  const result = await validateClientAddress({
    mesto: 'Ostrava',
    ulice: '',
    cisloPopisne: '791',
    psc: '70030'
  }, { manifest, fetchImpl });

  assert.equal(result.valid, false);
  assert.match(result.reason, /vedena ulice/);
});

test('režim pouze obec dovolí jen obec existující v RÚIAN a smaže zbytky adresy', async () => {
  const valid = await validateClientAddress({
    mesto: 'Dívčí Hrad',
    ulice: 'chybná',
    cisloPopisne: '999',
    psc: '00000',
    addressMode: 'municipalityOnly'
  }, { manifest, fetchImpl });
  const invalid = await validateClientAddress({
    mesto: 'Neexistující obec',
    addressMode: 'municipalityOnly'
  }, { manifest, fetchImpl });

  assert.equal(valid.valid, true);
  assert.deepEqual(valid.normalizedAddress, {
    mesto: 'Dívčí Hrad',
    ulice: '',
    cisloPopisne: '',
    psc: '',
    addressMode: 'municipalityOnly'
  });
  assert.equal(invalid.valid, false);
});

