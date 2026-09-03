import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('frontend nestáhne CSV podporovaných osob, dokud existují blokující chyby', async () => {
  const source = await readFile(new URL('../src/app/ProjectReportingApp.jsx', import.meta.url), 'utf8');
  const handlerStart = source.indexOf('const exportClientsIsEsfCsv = async');
  const handlerEnd = source.indexOf('const importIsEsfPersonCsv', handlerStart);
  const handler = source.slice(handlerStart, handlerEnd);
  const guard = handler.indexOf('if (result.blockingIssues.length > 0)');
  const serialization = handler.indexOf('const csv = serializeIsEsfPersonCsv');

  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  assert.ok(guard >= 0, 'Chybí blokace exportu při povinných chybách.');
  assert.ok(serialization > guard, 'CSV se nesmí vytvořit před kontrolou blokujících chyb.');
  assert.match(handler.slice(guard, serialization), /return;/);
});
