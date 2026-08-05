import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const appsScriptSource = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

function functionBody(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start + 1);
  assert.notEqual(start, -1, `chybí funkce ${functionName}`);
  assert.notEqual(end, -1, `chybí následující funkce ${nextFunctionName}`);
  return source.slice(start, end);
}

test('běžné uložení klienta už nepřeformátovává celé sloupce', () => {
  const body = functionBody(appsScriptSource, 'saveClient_', 'updateClientKeyWorker_');
  assert.doesNotMatch(body, /setColumnListValidation_/);
  assert.doesNotMatch(body, /setClientDateFormats_/);
  assert.match(appsScriptSource, /function configureWriteSheetFormats\(\)/);
  assert.match(appsScriptSource, /configureWriteSheetFormats_\(spreadsheet\)/);
});

test('zápisové funkce vrací právě zapsaná data bez následného čtení řádku', () => {
  const clientBody = functionBody(appsScriptSource, 'saveClient_', 'updateClientKeyWorker_');
  const partnerBody = functionBody(appsScriptSource, 'savePartner_', 'getIndividualPlanSheet_');
  const planBody = functionBody(appsScriptSource, 'saveIndividualPlan_', 'listPerformances_');
  assert.match(clientBody, /return rowToObject_\(headers, values\)/);
  assert.match(partnerBody, /return rowToObject_\(headers, values\)/);
  assert.match(planBody, /return rowToObject_\(headers, values\)/);
  assert.doesNotMatch(clientBody, /setValues\(\[values\]\)[\s\S]*getValues\(\)/);
});

test('výkon a case management pouze zařadí dokument do trvalé fronty', () => {
  const performanceBody = functionBody(appsScriptSource, 'savePerformance_', 'listStatistics_');
  const meetingBody = functionBody(appsScriptSource, 'saveMeeting_', 'listNetworkMeetings_');
  assert.match(performanceBody, /queueRecordDocument_\('performance', normalized\.vykon_id\)/);
  assert.match(meetingBody, /queueRecordDocument_\('meeting', normalized\.meeting_id\)/);
  assert.doesNotMatch(performanceBody, /upsertClientRecordDocument_/);
  assert.doesNotMatch(meetingBody, /upsertClientRecordDocument_/);
  assert.match(appsScriptSource, /const RECORD_DOCUMENT_MAX_ATTEMPTS_ = 3/);
  assert.match(appsScriptSource, /function runQueuedRecordDocuments\(\)/);
});

test('spuštění fronty dokumentů používá existující správu triggerů', () => {
  const runnerBody = functionBody(appsScriptSource, 'runQueuedRecordDocuments', 'upsertClientRecordDocument_');
  assert.match(runnerBody, /deleteTriggersByHandler_\(RECORD_DOCUMENT_TRIGGER_HANDLER_\)/);
  assert.doesNotMatch(runnerBody, /deleteTriggers_\(/);
  assert.match(appsScriptSource, /function deleteTriggersByHandler_\(handler\)/);
});

test('frontend potvrzuje Sheet bez čekání na Drive a sleduje dokument na pozadí', () => {
  assert.match(appSource, /action: 'updateClientKeyWorker'/);
  assert.match(appSource, /continueRecordSyncInBackground\(syncedRecord, \{ noticeKey, successText \}\)/);
  assert.doesNotMatch(appSource, /await syncRecordToGoogleDrive\(syncedRecord\)/);
  assert.match(appSource, /getRecordDocumentStatus/);
  assert.match(appSource, /Dokument se připravuje na pozadí/);
  assert.match(appSource, /Data v Sheetu jsou bezpečně uložená/);
});

test('serverová fronta sloučí opakovaný požadavek a uchová stav bez osobních údajů', () => {
  const properties = new Map();
  const triggers = [];
  const lock = { waitLock: () => {}, releaseLock: () => {} };
  const context = vm.createContext({
    console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key) || null,
        setProperty: (key, value) => properties.set(key, value)
      })
    },
    LockService: {
      getUserLock: () => lock,
      getScriptLock: () => lock
    },
    ScriptApp: {
      getProjectTriggers: () => triggers,
      newTrigger: (handler) => ({
        timeBased: () => ({
          after: () => ({
            create: () => triggers.push({ getHandlerFunction: () => handler })
          })
        })
      })
    }
  });
  vm.runInContext(appsScriptSource, context);

  context.queueRecordDocument_('performance', 'VYKON-0001');
  context.queueRecordDocument_('performance', 'VYKON-0001');

  const queue = JSON.parse(properties.get('record-document-queue-v1'));
  const status = context.getRecordDocumentStatus_('performance', 'VYKON-0001');
  assert.equal(queue.length, 1);
  assert.deepEqual(Object.keys(queue[0]).sort(), ['attempts', 'key', 'notBefore', 'recordId', 'recordType', 'requestedAt'].sort());
  assert.equal(status.state, 'queued');
  assert.equal(status.recordId, 'VYKON-0001');
  assert.equal(triggers.length, 1);
});

test('folder created by a document job is reflected in the open client card', () => {
  const statusBody = functionBody(appsScriptSource, 'getRecordDocumentStatus_', 'readRecordDocumentQueue_');
  const clientContextBody = functionBody(appsScriptSource, 'getClientDocumentContext_', 'readClientFolderState_');
  const ensureFolderBody = functionBody(appsScriptSource, 'ensureClientFolder_', 'getOrCreateClientFolder_');
  assert.match(statusBody, /readClientFolderState_\(snapshot\.record\.klient_id\)/);
  assert.match(clientContextBody, /ensureClientFolder_\(klientId\)/);
  assert.match(ensureFolderBody, /getOrCreateMonitoringList_/);
  assert.match(ensureFolderBody, /invalidateReadActions_\(\['listClients'\]\)/);
  assert.match(appSource, /const applyClientFolderState = \(status\) =>/);
  assert.match(appSource, /driveFolderUrl: clientFolderUrl \|\| client\.driveFolderUrl \|\| ''/);
  assert.match(appSource, /if \(status\.state === 'ready'\) \{\s*applyClientFolderState\(status\)/);
  assert.match(appSource, /void provisionClientDriveFolder\(savedClient, \{ silent: true \}\)/);
  assert.match(appSource, /clientDriveProvisionAttemptsRef\.current\.has\(selectedClient\.id\)/);
  assert.match(appSource, /void provisionClientDriveFolder\(selectedClient, \{ silent: true \}\)/);
  assert.match(appSource, /Složka klienta a monitorovací list se připravují automaticky/);
  assert.doesNotMatch(appSource, /Doplnit monitorovací list|Vytvoř složku klienta/);
  assert.doesNotMatch(appSource, /onClick=\{\(\) => provisionClientDriveFolder\(selectedClient\)\}/);
  assert.match(appSource, /15000, 15000, 15000, 15000/);
});
