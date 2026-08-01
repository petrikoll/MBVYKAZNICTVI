import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../src/app/ReportingView.jsx', import.meta.url)), 'utf8');

test('sekce sestav nabízí každý dokončený výstup právě jednou', () => {
  const expectedActions = [
    'Stáhnout XLSX',
    'Stáhnout DOC',
    'Stáhnout osoby',
    'Stáhnout podpory',
    'Vytvořit texty ZOR'
  ];

  expectedActions.forEach((label) => {
    assert.equal(source.split(label).length - 1, 1, `Akce ${label} musí být v rozhraní právě jednou.`);
  });
});

test('starý duplicitní panel a souhrnné tlačítko XLSX už nejsou v rozhraní', () => {
  assert.doesNotMatch(source, /Základní sestavy XLSX/);
  assert.doesNotMatch(source, /Stáhnout sestavy XLSX/);
  assert.match(source, /Interní sestavy/);
  assert.match(source, /Exporty pro IS ESF/);
  assert.match(source, /Podklady pro ZOR/);
});
