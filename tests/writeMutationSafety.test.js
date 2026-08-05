import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('record update and delete share one synchronous mutation guard', () => {
  const sharedMutationKeys = source.match(/const mutationKey = `record:\$\{record(?:Id|\.id)\}`;/g) || [];
  assert.equal(sharedMutationKeys.length, 2);
  assert.match(source, /pendingRecordMutationIdsRef\.current\.has\(mutationKey\)/);
  assert.match(source, /pendingRecordMutationIdsRef\.current\.add\(mutationKey\)/);
  assert.match(source, /pendingRecordMutationIdsRef\.current\.delete\(mutationKey\)/);
});

test('delete uses the exact Sheet version and never restores a stale full list', () => {
  assert.match(source, /expected_updated_at: record\.expectedUpdatedAt \|\| record\.updatedAt \|\| ''/);
  assert.match(source, /setRecords\(\(previousRecords\) => previousRecords\.filter\(\(item\) => item\.id !== record\.id\)\)/);
  assert.doesNotMatch(source, /setRecords\(previousRecords\)/);
});

test('all client mutation paths reject a second in-flight mutation', () => {
  const clientMutationKeys = source.match(/const mutationKey = `client:\$\{(?:client\.id|targetClientId)\}`;/g) || [];
  assert.equal(clientMutationKeys.length, 3);
  assert.match(source, /expected_updated_at: klientId \? draft\.expectedUpdatedAt \|\| draft\.updatedAt \|\| '' : ''/);
});

test('open client detail locks the duplicate key-worker control in the client list', () => {
  assert.match(source, /const workerEditLocked = active && showClientEditForm/);
  assert.match(source, /disabled=\{isSaving \|\| workerEditLocked\}/);
  assert.match(source, /if \(showClientEditForm && selectedClientId === client\.id\)/);
  assert.match(source, /Změnu proveďte v otevřeném detailu klienta\./);
  assert.match(source, /const mutationKey = `client:\$\{selectedClient\.id\}`;[\s\S]*pendingRecordMutationIdsRef\.current\.has\(mutationKey\)/);
});

test('new records never send a browser-generated id as an existing Sheet row', () => {
  assert.match(source, /const persistedSheetId = hasExplicitExpectedVersion \? record\.id \|\| '' : ''/);
  const persistedIdAssignments = source.match(/(?:partner_id|schuzka_site_id|vzdelavani_id|sepervize_id|plan_id|meeting_id|vykon_id): persistedSheetId/g) || [];
  assert.equal(persistedIdAssignments.length, 7);
});

test('client create and delete reuse an idempotent request id until confirmed', () => {
  const createStart = source.indexOf('const handleClientCreate = async');
  const createEnd = source.indexOf('const openClientEditForm =', createStart);
  const deleteStart = source.indexOf('const handleClientDelete = async');
  const deleteEnd = source.indexOf('const handleGenerateText = async', deleteStart);
  const createHandler = source.slice(createStart, createEnd);
  const deleteHandler = source.slice(deleteStart, deleteEnd);

  assert.match(source, /function createClientMutationRequestId/);
  assert.match(source, /clientCreateMutationIdsRef = useRef\(new Map\(\)\)/);
  assert.match(source, /clientDeleteMutationIdsRef = useRef\(new Map\(\)\)/);
  assert.match(createHandler, /request_id: mutationRequestId/);
  assert.match(createHandler, /clientCreateMutationIdsRef\.current\.get\(pendingSignature\)/);
  assert.match(createHandler, /saveMayAlreadyExist = error\?\.code === 'MUTATION_PENDING'/);
  assert.match(deleteHandler, /request_id: mutationRequestId/);
  assert.match(deleteHandler, /clientDeleteMutationIdsRef\.current\.get\(client\.id\)/);
  assert.match(deleteHandler, /ambiguousResponse = error\?\.code === 'MUTATION_PENDING'/);
  assert.match(deleteHandler, /časový limit\|trvá příliš dlouho/);
});
