import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');
const fieldsSource = readFileSync(new URL('../src/components/RuianAddressFields.jsx', import.meta.url), 'utf8');
const appsScriptSource = readFileSync(new URL('../google-apps-script-clients-api.js', import.meta.url), 'utf8');

test('formulář klienta používá RÚIAN našeptávání v obou rozloženích', () => {
  assert.match(appSource, /<RuianAddressFields draft=\{draft\} setDraft=\{setDraft\} compact \/>/);
  assert.match(appSource, /<RuianAddressFields draft=\{draft\} setDraft=\{setDraft\} \/>/);
  assert.match(fieldsSource, /<datalist id=\{listId\}>/);
  assert.match(fieldsSource, /Evidovat pouze obec/);
});

test('nový i upravený klient se před uložením ověří a normalizuje podle RÚIAN', () => {
  const createStart = appSource.indexOf('const handleClientCreate = async');
  const updateStart = appSource.indexOf('const handleClientUpdate = async');
  const deleteStart = appSource.indexOf('const handleClientDelete = async');
  const createHandler = appSource.slice(createStart, updateStart);
  const updateHandler = appSource.slice(updateStart, deleteStart);

  assert.match(createHandler, /await validateClientAddress\(clientDraft\)/);
  assert.match(createHandler, /\.\.\.addressValidation\.normalizedAddress/);
  assert.match(updateHandler, /await validateClientAddress\(clientEditDraft\)/);
  assert.match(updateHandler, /normalizedClientEditDraft/);
});

test('režim adresy se ukládá do samostatného sloupce Sheetu', () => {
  assert.match(appSource, /address_mode: draft\.addressMode === 'municipalityOnly'/);
  assert.match(appsScriptSource, /ensureHeaders_\(sheet, \['klicovy_pracovnik', 'rodina', 'address_mode'\]\)/);
});
