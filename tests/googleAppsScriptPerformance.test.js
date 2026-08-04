import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');

function createContext() {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return context;
}

function createCachedContext() {
  const values = new Map();
  const cache = {
    get: (key) => values.has(key) ? values.get(key) : null,
    getAll: (keys) => Object.fromEntries(keys.filter((key) => values.has(key)).map((key) => [key, values.get(key)])),
    put: (key, value) => values.set(key, String(value)),
    putAll: (entries) => Object.entries(entries).forEach(([key, value]) => values.set(key, String(value))),
    removeAll: (keys) => keys.forEach((key) => values.delete(key))
  };
  let uuid = 0;
  const Utilities = {
    newBlob: (input) => {
      const bytes = Array.isArray(input) ? Buffer.from(input) : Buffer.from(String(input), 'utf8');
      return {
        getBytes: () => [...bytes],
        getDataAsString: () => bytes.toString('utf8')
      };
    },
    base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64url'),
    base64DecodeWebSafe: (encoded) => [...Buffer.from(encoded, 'base64url')],
    getUuid: () => `uuid-${++uuid}`
  };
  const context = vm.createContext({ CacheService: { getScriptCache: () => cache }, Utilities });
  vm.runInContext(source, context);
  return context;
}

test('doplnění hlaviček používá jedno čtení a jeden dávkový zápis', () => {
  const context = createContext();
  let headerReads = 0;
  const writes = [];
  const sheet = {
    getLastColumn: () => 2,
    getMaxColumns: () => 4,
    getRange: (_row, column, _rowCount, columnCount) => ({
      getValues: () => {
        headerReads += 1;
        return [['a', 'b']];
      },
      setValues: (values) => writes.push({ column, columnCount, values })
    })
  };

  const headers = context.ensureHeaders_(sheet, ['a', 'b', 'c', 'd']);

  assert.equal(headerReads, 1);
  assert.deepEqual(Array.from(headers), ['a', 'b', 'c', 'd']);
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), [{ column: 3, columnCount: 2, values: [['c', 'd']] }]);
});

test('bootstrap používá jednu otevřenou tabulku pro všechny datové sady', () => {
  const context = createContext();
  const spreadsheet = { id: 'shared-spreadsheet' };
  let spreadsheetOpens = 0;
  context.getSpreadsheet_ = () => {
    spreadsheetOpens += 1;
    return spreadsheet;
  };

  const loaders = {
    listClients_: 'clients',
    listPerformances_: 'performances',
    listMeetings_: 'meetings',
    listIndividualPlans_: 'individualPlans',
    listNetworkMeetings_: 'networkMeetings',
    listPartners_: 'partners',
    listEducation_: 'education',
    listSupervision_: 'supervision',
    listStatistics_: 'statistics'
  };
  Object.entries(loaders).forEach(([loaderName, resultKey]) => {
    context[loaderName] = (receivedSpreadsheet) => {
      assert.equal(receivedSpreadsheet, spreadsheet);
      return [{ source: resultKey }];
    };
  });

  const payload = context.buildBootstrapPayload_();

  assert.equal(spreadsheetOpens, 1);
  assert.equal(payload.ok, true);
  assert.deepEqual(Array.from(payload.errors), []);
  Object.values(loaders).forEach((resultKey) => {
    assert.equal(payload[resultKey][0].source, resultKey);
  });
});

test('dílčí bootstrap načte jen vyžádané oblasti', () => {
  const context = createContext();
  let opens = 0;
  context.getSpreadsheet_ = () => {
    opens += 1;
    return { id: 'shared-spreadsheet' };
  };
  context.listPerformances_ = () => [{ vykon_id: 'VYKON-1' }];
  context.listPartners_ = () => [{ partner_id: 'PARTNER-1' }];

  const payload = context.buildBootstrapPayload_(['listPerformances', 'listPartners']);

  assert.equal(opens, 1);
  assert.equal(payload.performances[0].vykon_id, 'VYKON-1');
  assert.equal(payload.partners[0].partner_id, 'PARTNER-1');
  assert.equal('clients' in payload, false);
  assert.equal('supervision' in payload, false);
});

test('malý list individuálních plánů obchází poruchovou segmentovanou cache', () => {
  assert.match(source, /individualPlans: listIndividualPlans_\(\)/);
  assert.match(source, /action === 'listIndividualPlans'[\s\S]*loader\(sharedSpreadsheet\(\)\)/);
});

test('Apps Script cache zvládne i datovou sadu větší než limit jednoho klíče', () => {
  const context = createCachedContext();
  const dataset = [{ id: 'VYKON-1', text: 'Příliš žluťoučký kůň '.repeat(7000) }];
  let loads = 0;
  const load = () => {
    loads += 1;
    return dataset;
  };

  const first = context.readCachedDataset_('listPerformances', load);
  const second = context.readCachedDataset_('listPerformances', load);

  assert.equal(loads, 1);
  assert.equal(first[0].text, dataset[0].text);
  assert.equal(second[0].text, dataset[0].text);
});

test('zápisová invalidace vynutí nové načtení pouze dotčené oblasti', () => {
  const context = createCachedContext();
  let loads = 0;
  const load = () => [{ version: ++loads }];

  assert.equal(context.readCachedDataset_('listPartners', load)[0].version, 1);
  assert.equal(context.readCachedDataset_('listPartners', load)[0].version, 1);
  context.invalidateReadActions_(['listPartners']);
  assert.equal(context.readCachedDataset_('listPartners', load)[0].version, 2);
});

test('výsledek načtený souběžně se zápisem se nevrátí zpět do cache', () => {
  const context = createCachedContext();
  let loads = 0;
  const first = context.readCachedDataset_('listPerformances', () => {
    loads += 1;
    context.invalidateReadActions_(['listPerformances']);
    return [{ version: 'stará' }];
  });
  const second = context.readCachedDataset_('listPerformances', () => {
    loads += 1;
    return [{ version: 'nová' }];
  });

  assert.equal(first[0].version, 'stará');
  assert.equal(second[0].version, 'nová');
  assert.equal(loads, 2);
});

test('čtecí akce nemění strukturu listů', () => {
  [
    'listClients_',
    'listIndividualPlans_',
    'listPerformances_',
    'listStatistics_',
    'listMeetings_',
    'listNetworkMeetings_',
    'listEducation_',
    'listSupervision_'
  ].forEach((functionName) => {
    const start = source.indexOf(`function ${functionName}(spreadsheet)`);
    const end = source.indexOf('\nfunction ', start + 1);
    const body = source.slice(start, end === -1 ? source.length : end);
    assert.ok(start >= 0, `${functionName} musí existovat`);
    assert.doesNotMatch(body, /getOrCreateSheet_|ensureHeaders_|getIndividualPlanSheet_/);
  });
});
