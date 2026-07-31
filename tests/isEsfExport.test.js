import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSON_OUTPUT_HEADERS,
  buildIsEsfPersonExport,
  createAddressRegistry,
  loadRuianRegistryForClients,
  serializeIsEsfPersonCsv
} from '../src/lib/isEsfExport.js';

const manifest = {
  municipalities: {
    'divci hrad': {
      name: 'Dívčí Hrad',
      shards: ['551864']
    },
    ostrava: {
      name: 'Ostrava',
      shards: ['554821']
    },
    hrabuvka: {
      name: 'Hrabůvka',
      shards: ['513636']
    }
  },
  postalCodes: {
    '70030': ['Ostrava']
  }
};

const shards = new Map([
  ['551864', {
    code: '551864',
    name: 'Dívčí Hrad',
    zips: ['79399'],
    houses: ['100', '101'],
    defaultPart: 'Dívčí Hrad',
    streets: [
      ['hlavni', 'Hlavní', ['100']],
      ['vedlejsi', 'Vedlejší', ['101']]
    ]
  }],
  ['554821', {
    code: '554821',
    name: 'Ostrava',
    zips: ['70030'],
    houses: ['791'],
    parts: [
      ['hrabuvka', 'Hrabůvka', ['791']]
    ],
    streets: [
      ['horni', 'Horní', ['791']]
    ]
  }],
  ['513636', {
    code: '513636',
    name: 'Hrabůvka',
    zips: ['75301'],
    houses: ['10'],
    defaultPart: 'Hrabůvka',
    streets: []
  }]
]);

const baseClient = {
  id: 'client-1',
  fullName: 'Jana Nováková',
  jmeno: 'Jana',
  prijmeni: 'Nováková',
  datumNarozeni: '1980-02-01',
  mesto: 'Dívčí Hrad',
  ulice: 'Hlavní',
  cisloPopisne: '100/2A',
  psc: '793 99',
  email: 'jana@example.cz',
  telefon: '+420 777 123 456',
  datumVstupu: '2026-03-01',
  pohlavi: 'žena',
  postaveniNaTrhu: 'zaměstnanci',
  vzdelani: 'středoškolské vč. vyučení/maturity/pomaturitního studia – ISCED 3–4',
  znevyhodneni: 'bez znevýhodnění / neuvedeno'
};

test('vytvoří přesný 32sloupcový CSV formát PodporeneOsoby', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([baseClient], { registry });
  const csv = serializeIsEsfPersonCsv(result.rows);
  const lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n');

  assert.equal(PERSON_OUTPUT_HEADERS.length, 32);
  assert.equal(lines[0].split(';').length, 32);
  assert.equal(lines[1].split(';').length, 32);
  assert.equal(result.blockingIssues.length, 0);
  assert.equal(result.fullAddressCount, 1);
  assert.equal(result.rows[0].PodlePohlavi, 'POHZENY');
  assert.equal(result.rows[0].PodlePostaveniNaTrhuPrace_MonitorovaciList, 'TPZAMCI');
  assert.equal(result.rows[0].PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList, 'VZISCED3-4');
  assert.equal(result.rows[0].CisloPopisne_TrvaleBydlisteOsoby, '100');
  assert.equal(result.rows[0].CisloOrientacni_TrvaleBydlisteOsoby, '2');
  assert.equal(result.rows[0].ZnakCislaOrientacniho_TrvaleBydlisteOsoby, 'A');
  assert.equal(result.rows[0].CastObce_TrvaleBydlisteOsoby, '');
});

test('při neplatné adrese ponechá ve výstupu pouze obec', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    ulice: 'Neexistující',
    cisloPopisne: '999',
    psc: '11111'
  }], { registry });
  const row = result.rows[0];

  assert.equal(result.blockingIssues.length, 0);
  assert.equal(result.addressFallbacks.length, 1);
  assert.equal(row.Obec_TrvaleBydlisteOsoby, 'Dívčí Hrad');
  assert.equal(row.CastObce_TrvaleBydlisteOsoby, '');
  assert.equal(row.Ulice_TrvaleBydlisteOsoby, '');
  assert.equal(row.CisloPopisne_TrvaleBydlisteOsoby, '');
  assert.equal(row.CisloOrientacni_TrvaleBydlisteOsoby, '');
  assert.equal(row.ZnakCislaOrientacniho_TrvaleBydlisteOsoby, '');
  assert.equal(row.PSC_TrvaleBydlisteOsoby, '');
});

test('klient evidovaný pouze na úrovni obce dostane v CSV referenční adresu z RÚIAN', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    addressMode: 'municipalityOnly',
    ulice: '',
    cisloPopisne: '',
    psc: ''
  }], { registry });
  const row = result.rows[0];

  assert.equal(result.blockingIssues.length, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.addressFallbacks.length, 0);
  assert.equal(result.addressAdjustments.length, 1);
  assert.match(result.addressAdjustments[0].reason, /referenční adresu z RÚIAN/);
  assert.equal(row.Obec_TrvaleBydlisteOsoby, 'Dívčí Hrad');
  assert.equal(row.CastObce_TrvaleBydlisteOsoby, 'Dívčí Hrad');
  assert.equal(row.Ulice_TrvaleBydlisteOsoby, 'Hlavní');
  assert.equal(row.CisloPopisne_TrvaleBydlisteOsoby, '100');
  assert.equal(row.PSC_TrvaleBydlisteOsoby, '79399');
  assert.equal(result.fullAddressCount, 1);
});

test('referenční adresa obce bez ulic obsahuje obec, číslo domu a PSČ', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    mesto: 'Hrabůvka',
    addressMode: 'municipalityOnly',
    ulice: '',
    cisloPopisne: '',
    psc: ''
  }], { registry });
  const row = result.rows[0];

  assert.equal(result.addressFallbacks.length, 0);
  assert.equal(result.addressAdjustments.length, 1);
  assert.equal(row.Obec_TrvaleBydlisteOsoby, 'Hrabůvka');
  assert.equal(row.CastObce_TrvaleBydlisteOsoby, 'Hrabůvka');
  assert.equal(row.Ulice_TrvaleBydlisteOsoby, '');
  assert.equal(row.CisloPopisne_TrvaleBydlisteOsoby, '10');
  assert.equal(row.PSC_TrvaleBydlisteOsoby, '75301');
});

test('neznámá obec zůstane v CSV pouze jako obec s informačním upozorněním', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    mesto: 'Neznámá obec',
    addressMode: 'municipalityOnly',
    ulice: '',
    cisloPopisne: '',
    psc: ''
  }], { registry });
  const row = result.rows[0];

  assert.equal(result.addressFallbacks.length, 1);
  assert.equal(result.addressAdjustments.length, 0);
  assert.equal(row.Obec_TrvaleBydlisteOsoby, 'Neznámá obec');
  assert.equal(row.Ulice_TrvaleBydlisteOsoby, '');
  assert.equal(row.CisloPopisne_TrvaleBydlisteOsoby, '');
  assert.equal(row.PSC_TrvaleBydlisteOsoby, '');
});

test('nepotvrzenou ulici vynechá, ale zachová potvrzenou obec, číslo a PSČ', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    ulice: 'Dívčí Hrad',
    cisloPopisne: '100',
    psc: '79399'
  }], { registry });
  const row = result.rows[0];

  assert.equal(result.blockingIssues.length, 0);
  assert.equal(result.addressFallbacks.length, 0);
  assert.equal(result.addressAdjustments.length, 1);
  assert.equal(row.Obec_TrvaleBydlisteOsoby, 'Dívčí Hrad');
  assert.equal(row.Ulice_TrvaleBydlisteOsoby, '');
  assert.equal(row.CisloPopisne_TrvaleBydlisteOsoby, '100');
  assert.equal(row.PSC_TrvaleBydlisteOsoby, '79399');
});

test('část obce bezpečně převede na jedinou obec odpovídající PSČ a číslu domu', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    mesto: 'Hrabůvka',
    ulice: 'Horní',
    cisloPopisne: '791',
    psc: '70030'
  }], { registry });
  const row = result.rows[0];

  assert.equal(result.blockingIssues.length, 0);
  assert.equal(result.addressFallbacks.length, 0);
  assert.equal(row.Obec_TrvaleBydlisteOsoby, 'Ostrava');
  assert.equal(row.CastObce_TrvaleBydlisteOsoby, 'Hrabůvka');
  assert.equal(row.Ulice_TrvaleBydlisteOsoby, 'Horní');
});

test('část obce totožná s obcí se v identitě IS ESF zbytečně neopakuje', async () => {
  const localManifest = {
    municipalities: {
      tremesna: {
        name: 'Třemešná',
        shards: ['597911']
      }
    }
  };
  const localShards = new Map([[
    '597911',
    {
      code: '597911',
      name: 'Třemešná',
      zips: ['79382'],
      houses: ['437'],
      parts: [
        ['damasek', 'Damašek', ['2']],
        ['tremesna', 'Třemešná', ['437']]
      ],
      streets: []
    }
  ]]);
  const registry = createAddressRegistry(localManifest, localShards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    mesto: 'Třemešná',
    ulice: '',
    cisloPopisne: '437',
    psc: '79382'
  }], { registry });
  const row = result.rows[0];

  assert.equal(result.addressFallbacks.length, 0);
  assert.equal(row.Obec_TrvaleBydlisteOsoby, 'Třemešná');
  assert.equal(row.CastObce_TrvaleBydlisteOsoby, '');
  assert.equal(row.CisloPopisne_TrvaleBydlisteOsoby, '437');
  assert.equal(row.PSC_TrvaleBydlisteOsoby, '79382');
});

test('načte obec kandidáta také podle PSČ, když je v registru u klienta uvedena část obce', async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    if (url.endsWith('/manifest.json')) return { ok: true, json: async () => manifest };
    if (url.endsWith('/554821.json')) return { ok: true, json: async () => shards.get('554821') };
    if (url.endsWith('/513636.json')) return { ok: true, json: async () => shards.get('513636') };
    return { ok: false, json: async () => ({}) };
  };
  const registry = await loadRuianRegistryForClients([{
    mesto: 'Hrabůvka',
    psc: '70030'
  }], { fetchImpl });

  assert.equal(registry.byCity.get('ostrava')?.[0]?.name, 'Ostrava');
  assert.ok(requestedUrls.some((url) => url.endsWith('/554821.json')));
});

test('převede historické zkratky vzdělání na platné kódy IS ESF', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const aliases = [
    ['ZŠ', 'VZISCED1-2'],
    ['ZĹ ', 'VZISCED1-2'],
    ['základní', 'VZISCED1-2'],
    ['základní vč. nedokončeného 2. stupně ZŠ – ISCED 1–2', 'VZISCED1-2'],
    ['SOU', 'VZISCED3-4'],
    ['SŠ bez maturity', 'VZISCED3-4'],
    ['vyučen', 'VZISCED3-4'],
    ['VOŠ', 'VZISCED5-8'],
    ['VŠ', 'VZISCED5-8']
  ];

  for (const [education, expectedCode] of aliases) {
    const result = await buildIsEsfPersonExport([{
      ...baseClient,
      vzdelani: education
    }], { registry });
    assert.equal(result.blockingIssues.length, 0, education);
    assert.equal(
      result.rows[0].PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList,
      expectedCode,
      education
    );
  }
});

test('rozpozná i volné a starší slovní popisy vzdělání', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const aliases = [
    ['nedokončené základní vzdělání', 'VZ0'],
    ['ukončená základní škola', 'VZISCED1-2'],
    ['střední odborné učiliště', 'VZISCED3-4'],
    ['střední škola s maturitou', 'VZISCED3-4'],
    ['vyšší odborná škola', 'VZISCED5-8'],
    ['vysokoškolské magisterské', 'VZISCED5-8'],
    ['ISCED 2', 'VZISCED1-2'],
    ['ISCED 4', 'VZISCED3-4'],
    ['ISCED 6', 'VZISCED5-8']
  ];

  for (const [education, expectedCode] of aliases) {
    const result = await buildIsEsfPersonExport([{
      ...baseClient,
      vzdelani: education
    }], { registry });
    assert.equal(result.educationFallbacks.length, 0, education);
    assert.equal(
      result.rows[0].PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList,
      expectedCode,
      education
    );
  }
});

test('chybějící vzdělání neblokuje CSV a je transparentně vykázáno jako VZJN', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    vzdelani: ''
  }], { registry });

  assert.equal(result.blockingIssues.length, 0);
  assert.equal(result.educationFallbacks.length, 1);
  assert.equal(
    result.rows[0].PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList,
    'VZJN'
  );
});

test('nerozpoznané vzdělání použije VZJN a zůstane jen informačním upozorněním', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    vzdelani: 'neuvedeno'
  }], { registry });

  assert.equal(result.blockingIssues.length, 0);
  assert.equal(result.educationFallbacks.length, 1);
  assert.equal(
    result.rows[0].PodleNejvyssihoDosazenehoVzdelani_MonitorovaciList,
    'VZJN'
  );
});

test('chybějící povinné monitorovací údaje jsou vráceny pro informační varování', async () => {
  const registry = createAddressRegistry(manifest, shards);
  const result = await buildIsEsfPersonExport([{
    ...baseClient,
    pohlavi: 'neuvedeno',
    vzdelani: ''
  }], { registry });

  assert.equal(result.blockingIssues.length, 1);
  assert.match(result.blockingIssues[0].issues.join(' '), /pohlaví/);
  assert.equal(result.educationFallbacks.length, 1);
});
