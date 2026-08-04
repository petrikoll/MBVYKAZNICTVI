import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');
const viewSource = readFileSync(new URL('../src/app/Ka01View.jsx', import.meta.url), 'utf8');

test('actor updates are applied immediately after the sheet save', () => {
  assert.match(source, /record\.id === recordId \? syncedRecord : record/);
});

test('editing a generated actor creates a persisted replacement', () => {
  assert.match(source, /const isPersistedEdit = Boolean\(editingId && records\.some/);
  assert.match(source, /seedSourceId: editingId/);
  assert.match(source, /const ok = isPersistedEdit/);
});

test('actor save preserves the complete draft payload', () => {
  assert.match(source, /payload: \{\s*\.\.\.ka01ActorDraft,\s*id: isPersistedEdit/);
});

test('actor update preserves the exact sheet version token for conflict checks', () => {
  assert.match(source, /entityType: 'actor_registry',[\s\S]*?expectedUpdatedAt: asSheetText\(row\.updated_at\)/);
  assert.match(source, /ka01ActorEditVersionRef\.current = record\.expectedUpdatedAt \|\| record\.updatedAt \|\| ''/);
  assert.match(source, /expectedUpdatedAt: ka01ActorEditVersionRef\.current/);
  assert.match(source, /Object\.prototype\.hasOwnProperty\.call\(payload, 'expectedUpdatedAt'\)/);
  assert.match(source, /\.\.\.\(expectedUpdatedAt \? \{ expectedUpdatedAt \} : \{\}\)/);
});

test('actor save verifies the sheet after a damaged confirmation response', () => {
  assert.match(source, /error\?\.code !== 'INVALID_JSON_RESPONSE'/);
  assert.match(source, /fetchGoogleSheetAction\('listPartners'\)/);
  assert.match(source, /actorSheetRowMatchesPayload\(row, partnerToSave\)/);
  assert.match(source, /verifiedPartners\.length !== 1/);
  assert.match(source, /recoveredConfirmation: true/);
});

test('actor update ignores a rapid duplicate submission and merges into fresh local state', () => {
  assert.match(source, /pendingRecordMutationIdsRef\.current\.has\(mutationKey\)/);
  assert.match(source, /pendingRecordMutationIdsRef\.current\.add\(mutationKey\)/);
  assert.match(source, /setRecords\(\(previousRecords\) => \{[\s\S]*?previousRecords\.map/);
  assert.match(source, /pendingRecordMutationIdsRef\.current\.delete\(mutationKey\)/);
});

test('actor edit mode is visible and can be cancelled safely', () => {
  assert.match(source, /const cancelKa01ActorRegistryEdit = \(\) =>/);
  assert.match(source, /resetKa01ActorRegistryDraft\(\)/);
  assert.match(viewSource, /Upravujete aktéra:/);
  assert.match(viewSource, /Zrušit úpravu/);
});
