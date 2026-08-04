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
