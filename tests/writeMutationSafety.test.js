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

test('both client editing paths reject a second in-flight mutation', () => {
  const clientMutationKeys = source.match(/const mutationKey = `client:\$\{(?:client\.id|targetClientId)\}`;/g) || [];
  assert.equal(clientMutationKeys.length, 2);
  assert.match(source, /expected_updated_at: klientId \? draft\.expectedUpdatedAt \|\| draft\.updatedAt \|\| '' : ''/);
});

test('new records never send a browser-generated id as an existing Sheet row', () => {
  assert.match(source, /const persistedSheetId = hasExplicitExpectedVersion \? record\.id \|\| '' : ''/);
  const persistedIdAssignments = source.match(/(?:partner_id|schuzka_site_id|vzdelavani_id|sepervize_id|plan_id|meeting_id|vykon_id): persistedSheetId/g) || [];
  assert.equal(persistedIdAssignments.length, 7);
});
