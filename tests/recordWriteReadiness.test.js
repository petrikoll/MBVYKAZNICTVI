import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');

test('records remain read-only until their sheet source is verified', () => {
  assert.match(source, /const \[verifiedRecordActions, setVerifiedRecordActions\] = useState/);
  assert.match(source, /const writeBlockMessage = recordWriteBlockMessage\(payload\)/);
  assert.match(source, /const writeBlockMessage = recordWriteBlockMessage\(existingRecord\)/);
  assert.match(source, /const writeBlockMessage = recordWriteBlockMessage\(record\)/);
});

test('each writable record area maps to its own verification action', () => {
  assert.match(source, /record\.entityType === 'actor_registry'\) return 'listPartners'/);
  assert.match(source, /record\.entityType === 'network_activities'\) return 'listNetworkMeetings'/);
  assert.match(source, /record\.entityType === 'plans'\) return 'listIndividualPlans'/);
  assert.match(source, /return 'listPerformances'/);
});

test('the interface no longer offers a persistent local data copy', () => {
  assert.doesNotMatch(source, /Zobrazuje se poslední lokální kopie/);
  assert.doesNotMatch(source, /Vymazat lokální kopii/);
  assert.doesNotMatch(source, /cachedRecordsAtStartup|cachedClientsAtStartup/);
});
