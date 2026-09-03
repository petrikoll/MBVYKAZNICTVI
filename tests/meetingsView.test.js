import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { isTeamMeetingRecord } from '../src/lib/networkActivity.js';
import { buildIndicators } from '../src/lib/projectUtils.js';

const appSource = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');
const viewSource = readFileSync(new URL('../src/app/Ka01View.jsx', import.meta.url), 'utf8');
const configSource = readFileSync(new URL('../src/config/projectConfig.js', import.meta.url), 'utf8');

test('porady se rozpoznají z aktuálního payloadu i staršího názvu záznamu', () => {
  assert.equal(isTeamMeetingRecord({ payload: { type: 'Porada' } }), true);
  assert.equal(isTeamMeetingRecord({ payload: { networkType: 'porada' } }), true);
  assert.equal(isTeamMeetingRecord({ title: 'KA02 - Porada' }), true);
  assert.equal(isTeamMeetingRecord({ payload: { type: 'Koordinační setkání' } }), false);
});

test('samostatný list zachová započtení porady v projektovém indikátoru', () => {
  const indicators = buildIndicators({
    clients: [],
    records: [{ id: 'meeting-1', entityType: 'network_activities', payload: { type: 'Porada' } }]
  });
  const teamMeetings = indicators.find((indicator) => indicator.key === 'ka01TeamMeetings');

  assert.equal(teamMeetings.current, 1);
  assert.deepEqual(teamMeetings.currentIds, ['meeting-1']);
});

test('hlavní navigace obsahuje samostatný list Porady', () => {
  assert.match(configSource, /id: 'meetings', name: 'Porady'/);
  assert.match(appSource, /mainView === 'meetings'/);
  assert.match(appSource, /viewMode="meetings"/);
});

test('porady a aktivity sítě používají oddělené seznamy nad společnými uloženými daty', () => {
  assert.match(appSource, /ka01AllNetworkRecords\.filter\(\(record\) => !isTeamMeetingRecord\(record\)\)/);
  assert.match(appSource, /ka01AllNetworkRecords\.filter\(isTeamMeetingRecord\)/);
  assert.match(appSource, /ka01NetworkRecords=\{ka01MeetingRecords\}/);
});

test('Porada už není volbou aktivity sítě a na novém listu je nastavena pevně', () => {
  const optionsStart = viewSource.indexOf('const ACTIVITY_OPTIONS');
  const optionsEnd = viewSource.indexOf('const ACTOR_OPTIONS', optionsStart);
  const optionsSource = viewSource.slice(optionsStart, optionsEnd);

  assert.doesNotMatch(optionsSource, /Porada/);
  assert.match(viewSource, /isMeetingsView \? 'Porady realizačního týmu:'/);
  assert.match(viewSource, />Porada<\/div>/);
  assert.match(appSource, /nextView === 'meetings'[\s\S]*networkType: 'Porada'/);
});

test('hromadný export odděluje porady od aktivit sítě', () => {
  assert.match(appSource, /exportKind === 'meetings'/);
  assert.match(appSource, /meetingsOnly \? isTeamMeetingRecord\(record\) : !isTeamMeetingRecord\(record\)/);
  assert.match(viewSource, /exportKa01NetworkBulk\(isMeetingsView \? 'meetings' : 'network'\)/);
});
