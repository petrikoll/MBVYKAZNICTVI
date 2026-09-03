import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../src/app/ReportingView.jsx', import.meta.url)), 'utf8');
const appSource = readFileSync(fileURLToPath(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url)), 'utf8');
const configSource = readFileSync(fileURLToPath(new URL('../src/config/projectConfig.js', import.meta.url)), 'utf8');

test('statistika KU je soucasti analyz a nema samostatny hlavni list', () => {
  assert.match(source, /<KuStatisticsPanel/);
  assert.match(source, /Statistika KÚ/);
  assert.doesNotMatch(configSource, /id: 'statistics'/);
  assert.doesNotMatch(appSource, /mainView === 'statistics'/);
});

test('sekce sestav nabízí každý dokončený výstup právě jednou', () => {
  const expectedActions = [
    'Stáhnout XLSX',
    'Stáhnout DOC',
    'Stáhnout osoby',
    'Nahrát CSV z IS ESF',
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
  assert.match(source, /Postup exportu do IS ESF/);
  assert.match(source, /Podklady pro ZOR/);
  assert.match(source, /Nejprve vyberte konkrétní monitorovací období/);
  assert.match(source, /V MO1 je DatumOd dnem vstupu osoby do projektu/);
});

test('tlačítko podrobných výstupů je na dashboardu oranžové', () => {
  const buttonStart = source.indexOf('onClick={() => setShowDetailedOutputs(true)}');
  const buttonEnd = source.indexOf('</button>', buttonStart);
  const buttonSource = source.slice(buttonStart, buttonEnd);

  assert.ok(buttonStart >= 0 && buttonEnd > buttonStart);
  assert.match(buttonSource, /bg-orange-500/);
  assert.match(buttonSource, /hover:bg-orange-600/);
  assert.match(buttonSource, /Podrobné výstupy/);
});

test('kontrolní upozornění mají přístupný hover a focus detail klientů a chyb', () => {
  assert.match(source, /const RiskControlRow/);
  assert.match(source, /role="tooltip"/);
  assert.match(source, /aria-describedby=\{tooltipId\}/);
  assert.match(source, /group-hover:visible/);
  assert.match(source, /group-focus:visible/);
  assert.match(source, /Klienti a zjištěné chyby/);
  assert.match(source, /Najeďte pro seznam klientů a chyb/);
  assert.match(source, /openUpward=\{index >= overview\.risks\.length - 3\}/);
  assert.match(source, /openUpward \? 'bottom-full mb-1 -translate-y-1' : 'top-full mt-1 translate-y-1'/);
});

test('dashboard používá sdílený výpočet hodin a bezpečný filtr vykazovaného období', () => {
  assert.match(appSource, /buildSupportMinutesByClient\(filteredRecords\)/);
  assert.match(appSource, /isDateWithinReportingPeriod\(dateValue, period/);
});

test('vzdělávání i supervize vyžadují kladný počet hodin', () => {
  assert.equal(appSource.split('!isPositiveHoursValue(hours)').length - 1, 2);
});
