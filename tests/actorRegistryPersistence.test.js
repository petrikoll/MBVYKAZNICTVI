import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

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
  assert.match(source, /expectedUpdatedAt: existingRecord\.expectedUpdatedAt \|\| existingRecord\.updatedAt \|\| ''/);
  assert.match(source, /\.\.\.\(expectedUpdatedAt \? \{ expectedUpdatedAt \} : \{\}\)/);
});

test('actor save verifies the sheet after a damaged confirmation response', () => {
  assert.match(source, /error\?\.code !== 'INVALID_JSON_RESPONSE'/);
  assert.match(source, /fetchGoogleSheetAction\('listPartners'\)/);
  assert.match(source, /actorSheetRowMatchesPayload\(row, partnerToSave\)/);
  assert.match(source, /recoveredConfirmation: true/);
});
