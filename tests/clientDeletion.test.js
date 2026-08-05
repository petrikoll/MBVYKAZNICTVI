import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { mapSheetRowToClient } from '../src/lib/projectUtils.js';

const appsScriptSource = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

function createContext() {
  const context = vm.createContext({});
  vm.runInContext(appsScriptSource, context);
  return context;
}

function createSheet(headers, initialRows) {
  const rows = initialRows.map((row) => [...row]);
  const columnNumberFromLabel = (label) => [...label].reduce((number, character) => (
    number * 26 + character.charCodeAt(0) - 64
  ), 0);
  return {
    headers,
    rows,
    getLastColumn: () => headers.length,
    getLastRow: () => rows.length + 1,
    getMaxColumns: () => headers.length,
    getRange: (rowNumber, column = 1, rowCount = 1, columnCount = 1) => ({
      getValues: () => Array.from({ length: rowCount }, (_, offset) => {
        if (rowNumber + offset === 1) return headers.slice(column - 1, column - 1 + columnCount);
        const row = rows[rowNumber + offset - 2] || [];
        return row.slice(column - 1, column - 1 + columnCount);
      }),
      setValues: (values) => {
        values.forEach((valueRow, offset) => {
          if (rowNumber + offset === 1) {
            valueRow.forEach((value, index) => { headers[column - 1 + index] = value; });
            return;
          }
          const targetIndex = rowNumber + offset - 2;
          const target = rows[targetIndex] || [];
          valueRow.forEach((value, index) => { target[column - 1 + index] = value; });
          rows[targetIndex] = target;
        });
      },
      setValue: (value) => {
        if (rowNumber === 1) headers[column - 1] = value;
        else {
          rows[rowNumber - 2] = rows[rowNumber - 2] || [];
          rows[rowNumber - 2][column - 1] = value;
        }
      }
    }),
    getRangeList: (notations) => ({
      setValue: (value) => {
        notations.forEach((notation) => {
          const match = /^([A-Z]+)(\d+)$/.exec(notation);
          if (!match) throw new Error(`Invalid A1 notation: ${notation}`);
          const column = columnNumberFromLabel(match[1]);
          const rowNumber = Number(match[2]);
          rows[rowNumber - 2] = rows[rowNumber - 2] || [];
          rows[rowNumber - 2][column - 1] = value;
        });
      }
    })
  };
}

test('only Radka Vyslouzilova can delete an entire client', () => {
  const context = createContext();

  assert.doesNotThrow(() => context.assertClientDeletionManager_('Mgr. Radka Vysloužilová'));
  assert.throws(
    () => context.assertClientDeletionManager_('Bc. Josef Jakubec'),
    (error) => error.code === 'FORBIDDEN'
  );
});

test('client deletion soft-deletes the client and all linked records', () => {
  const context = createContext();
  const clientHeaders = [
    'klient_id', 'stav_klienta', 'stav_pred_smazanim', 'status', 'drive_folder_url',
    'created_at', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by'
  ];
  const childHeaders = [
    'id', 'klient_id', 'status', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by'
  ];
  const current = new Date('2026-08-04T12:00:00.000Z');
  const clientSheet = createSheet(clientHeaders, [[
    'KLIENT-0001', 'Aktivní', '', 'Platný', 'folder-url', current, current, 'Lea', '', ''
  ]]);
  const performanceSheet = createSheet(['vykon_id', ...childHeaders.slice(1)], [[
    'VYKON-0001', 'KLIENT-0001', 'Platný', current, 'Lea', '', ''
  ]]);
  const meetingSheet = createSheet(['meeting_id', ...childHeaders.slice(1)], [[
    'SETKANI-0001', 'KLIENT-0001', 'Platný', current, 'Lea', '', ''
  ]]);
  const planSheet = createSheet(['plan_id', ...childHeaders.slice(1)], [[
    'PLAN-0001', 'KLIENT-0001', 'Platný', current, 'Lea', '', ''
  ]]);
  const sheets = {
    Klienti: clientSheet,
    Vykony_KA1: performanceSheet,
    Case_management_zapisy: meetingSheet,
    Individualni_plany: planSheet
  };
  const spreadsheet = { getSheetByName: (name) => sheets[name] || null };
  const deactivated = [];
  const cancelled = [];
  context.getSpreadsheet_ = () => spreadsheet;
  context.deactivatePerformanceStatistics_ = (id) => deactivated.push(id);
  context.cancelRecordDocument_ = (type, id) => cancelled.push(`${type}:${id}`);
  context.archiveDeletedClientFolder_ = () => ({ url: 'archive-url', warning: '' });

  const result = context.deleteClient_({
    klient_id: 'KLIENT-0001',
    expected_updated_at: current.toISOString()
  }, 'Mgr. Radka Vysloužilová');

  assert.equal(result.deleted, true);
  assert.equal(result.performances, 1);
  assert.equal(result.meetings, 1);
  assert.equal(result.individual_plans, 1);
  assert.equal(clientSheet.rows[0][clientHeaders.indexOf('status')], 'Smazaný');
  assert.equal(clientSheet.rows[0][clientHeaders.indexOf('stav_klienta')], 'Neaktivní');
  assert.equal(clientSheet.rows[0][clientHeaders.indexOf('stav_pred_smazanim')], 'Aktivní');
  assert.equal(performanceSheet.rows[0][performanceSheet.headers.indexOf('status')], 'Smazaný');
  assert.equal(meetingSheet.rows[0][meetingSheet.headers.indexOf('status')], 'Smazaný');
  assert.equal(planSheet.rows[0][planSheet.headers.indexOf('status')], 'Smazaný');
  assert.deepEqual(deactivated, ['VYKON-0001']);
  assert.deepEqual(cancelled, ['performance:VYKON-0001', 'meeting:SETKANI-0001']);
});

test('derived statistic cleanup cannot interrupt the main client deletion', () => {
  const section = appsScriptSource.match(/function deleteClient_\(request, requestedBy\)[\s\S]*?function assertClientDeletionManager_\(/)?.[0] || '';
  assert.ok(section);
  assert.match(section, /try\s*\{\s*deactivatePerformanceStatistics_\(id\)/);
  assert.match(section, /cleanupWarnings\.push/);
  assert.match(section, /archive_warning: cleanupWarnings\.join/);
});

test('linked record deletion changes only technical columns instead of rewriting validated data', () => {
  const section = appsScriptSource.match(/function softDeleteClientRows_\(spreadsheet, sheetName, idHeader, clientId, now, updatedBy\)[\s\S]*?function findUniqueClientFolderById_\(/)?.[0] || '';
  assert.ok(section);
  assert.match(section, /setRowsColumnValue_\(sheet, rowsToDelete/);
  assert.match(section, /sheet\.getRangeList/);
  assert.doesNotMatch(section, /getRange\(CONFIG\.headerRow \+ 1 \+ index, 1, 1, headers\.length\)\.setValues/);
});

test('client deletion finds and archives an unlinked folder by klient_id', () => {
  const context = createContext();
  const archive = { id: 'archive' };
  const moved = [];
  const folder = {
    getName: () => 'KLIENT-0053 - LaĹˇtovica - Petr',
    getUrl: () => 'folder-url-0053',
    moveTo: (target) => moved.push(target)
  };
  const folders = [folder];
  const root = {
    getFolders: () => {
      let index = 0;
      return {
        hasNext: () => index < folders.length,
        next: () => folders[index++]
      };
    }
  };
  context.getClientFolderParent_ = () => root;
  context.getDeletedClientsArchiveFolder_ = () => archive;
  context.DriveApp = { getFolderById: () => { throw new Error('stale link'); } };

  const result = context.archiveDeletedClientFolder_('', 'KLIENT-0053');

  assert.equal(result.warning, '');
  assert.equal(result.url, 'folder-url-0053');
  assert.deepEqual(moved, [archive]);
});

test('folder provisioning reuses a unique existing folder when the Sheet link is missing', () => {
  const context = createContext();
  const existing = { getName: () => 'KLIENT-0053 - LaĹˇtovica Petr' };
  let created = 0;
  const root = {
    getFolders: () => {
      let delivered = false;
      return {
        hasNext: () => !delivered,
        next: () => { delivered = true; return existing; }
      };
    },
    createFolder: () => { created += 1; return {}; }
  };
  context.getClientFolderParent_ = () => root;

  const result = context.getOrCreateClientFolder_({ klient_id: 'KLIENT-0053', jmeno: 'Petr', prijmeni: 'LaĹˇtovica' }, '');

  assert.equal(result, existing);
  assert.equal(created, 0);
});

test('manual KLIENT-0053 cleanup verifies identity before finishing deletion', () => {
  const section = appsScriptSource.match(/function finishLastovica0053DeletionAfterPartialFailure\(\)[\s\S]*?function getDeletedClientsArchiveFolder_\(/)?.[0] || '';
  assert.match(section, /KLIENT-0053 musi mit prave jeden radek/);
  assert.match(section, /KLIENT-0053 neni Petr Lastovica/);
  assert.match(section, /expected_updated_at: client\.updated_at/);
  assert.match(section, /deleteClient_\(\{/);
});

test('statistics use the Ano Ne values required by the Sheet validation', () => {
  const upsertSection = appsScriptSource.match(/function upsertPerformanceStatistics_\(performance\)[\s\S]*?function parseJsonObject_\(/)?.[0] || '';
  const deactivateSection = appsScriptSource.match(/function deactivatePerformanceStatistics_\(performanceId\)[\s\S]*?function buildStatisticsPeriod_\(/)?.[0] || '';
  assert.match(upsertSection, /status: 'Ano'/);
  assert.match(upsertSection, /updateStatisticStatus_\(sheet, headers, existingRow, 'Ne'\)/);
  assert.match(deactivateSection, /updateStatisticStatus_\(sheet, headers, rowNumber, 'Ne'\)/);
});

test('deleted clients are not mapped back into the application', () => {
  assert.equal(mapSheetRowToClient({
    klient_id: 'KLIENT-0001',
    jmeno: 'Test',
    prijmeni: 'Klient',
    stav_klienta: 'Aktivní',
    status: 'Smazaný'
}, 0), null);
});

test('client deletion rejects a stale concurrent version before cascading', () => {
  const context = createContext();
  const headers = [
    'klient_id', 'stav_klienta', 'stav_pred_smazanim', 'status', 'drive_folder_url',
    'updated_at', 'updated_by', 'deleted_at', 'deleted_by'
  ];
  const current = new Date('2026-08-04T12:00:00.000Z');
  const clientSheet = createSheet(headers, [[
    'KLIENT-0001', 'Aktivní', '', 'Platný', '', current, 'Lea', '', ''
  ]]);
  context.getSpreadsheet_ = () => ({ getSheetByName: (name) => (name === 'Klienti' ? clientSheet : null) });
  context.archiveDeletedClientFolder_ = () => assert.fail('folder must not move after a stale request');

  assert.throws(() => context.deleteClient_({
    klient_id: 'KLIENT-0001',
    expected_updated_at: '2026-08-04T11:00:00.000Z'
  }, 'Mgr. Radka Vysloužilová'), (error) => error.code === 'CONFLICT');
  assert.equal(clientSheet.rows[0][headers.indexOf('status')], 'Platný');
});

test('client list exposes a mini delete button only for the guarantor and requires exact id confirmation', () => {
  const listStart = appSource.indexOf("{mainView === 'clients'");
  const listEnd = appSource.indexOf("{mainView === 'ka01'", listStart);
  const clientView = appSource.slice(listStart, listEnd === -1 ? undefined : listEnd);
  const handlerStart = appSource.indexOf('const handleClientDelete = async');
  const handlerEnd = appSource.indexOf('const handleGenerateText = async', handlerStart);
  const handler = appSource.slice(handlerStart, handlerEnd);

  assert.match(clientView, /isGarantWorker\(currentWorker\)/);
  assert.match(clientView, />\s*Smazat\s*</);
  assert.match(clientView, /handleClientDelete\(client, event\)/);
  assert.match(handler, /window\.confirm/);
  assert.match(handler, /window\.prompt/);
  assert.match(handler, /typedId[\s\S]*client\.id/);
  assert.match(handler, /action: 'deleteClient'/);
});

test('client deletion requires the current uncached backend before the first write', () => {
  const handlerStart = appSource.indexOf('const handleClientDelete = async');
  const handlerEnd = appSource.indexOf('const handleGenerateText = async', handlerStart);
  const handler = appSource.slice(handlerStart, handlerEnd);
  const preflightIndex = handler.indexOf("'verifyClientDeletion'");
  const deletePostIndex = handler.indexOf("action: 'deleteClient'");

  assert.ok(preflightIndex >= 0);
  assert.ok(deletePostIndex > preflightIndex);
  assert.match(handler, /currentDeletionState\.inactive/);
  assert.match(handler, /Mazání bylo zablokováno/);
});

test('deleteClient invalidates every affected cached dataset', () => {
  assert.match(appsScriptSource, /deleteClient:\s*\['listClients', 'listIndividualPlans', 'listPerformances', 'listMeetings', 'listStatistics'\]/);
  assert.match(appsScriptSource, /payload\.action === 'deleteClient'/);
});

test('outdated Apps Script deployment produces an actionable client deletion message', () => {
  assert.match(appSource, /unknown action\|nezn\[aá\]m\[aá\] akce/);
  assert.match(appSource, /vytvořte novou verzi nasazení webové aplikace/);
});

test('ambiguous deletion response is verified against the authoritative client registry', () => {
  const handlerStart = appSource.indexOf('const handleClientDelete = async');
  const handlerEnd = appSource.indexOf('const handleGenerateText = async', handlerStart);
  const handler = appSource.slice(handlerStart, handlerEnd);
  assert.match(handler, /platnou JSON odpověď\|uložení nelze potvrdit/);
  assert.match(handler, /fetchGoogleSheetAction\([\s\S]*?'verifyClientDeletion'/);
  assert.match(handler, /verificationDelays = \[0, 800, 1800, 3200\]/);
  assert.match(handler, /for \(const delayMs of verificationDelays\)/);
  assert.match(handler, /verification\?\.deletion\?\.found === true && verification\?\.deletion\?\.deleted === true/);
  assert.match(handler, /applyConfirmedDeletion\(\{ deleted: true, archive_warning: '' \}, true\)/);
});

test('client deletion verification bypasses the cached client list', () => {
  assert.match(appsScriptSource, /e\.parameter\.action === 'verifyClientDeletion'/);
  const section = appsScriptSource.match(/function verifyClientDeletion_\(clientId\)[\s\S]*?function saveClient_\(/)?.[0] || '';
  assert.ok(section);
  assert.match(section, /getSpreadsheet_\(\)\.getSheetByName/);
  assert.doesNotMatch(section, /readCachedDataset_/);
});

test('doPost cleanup cannot replace a JSON response with an uncaught cleanup error', () => {
  assert.match(appsScriptSource, /doPost cache invalidation failed/);
  assert.match(appsScriptSource, /doPost lock release failed/);
  assert.match(appsScriptSource, /console\.error\('doPost ' \+ \(requestedAction \|\| 'unknown'\) \+ ' failed:/);
});
