import test from 'node:test';
import assert from 'node:assert/strict';

import { parseGoogleSheetResponse, requireSavedGoogleSheetRecord } from '../src/lib/googleSheetApi.js';

test('neplatná JSON odpověď nesmí být považována za úspěšné uložení', async () => {
  const response = new Response('<html>chyba</html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });

  await assert.rejects(
    parseGoogleSheetResponse(response),
    (error) => error.code === 'INVALID_JSON_RESPONSE' && /nevrátil platnou JSON odpověď/.test(error.message)
  );
});

test('odpověď bez výslovného ok true nesmí potvrdit uložení', async () => {
  const response = new Response(JSON.stringify({ performance: { vykon_id: 'VYKON-0001' } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  await assert.rejects(parseGoogleSheetResponse(response), /nepotvrdil úspěšné provedení/);
});

test('výkon bez vráceného vykon_id nesmí být označen jako uložený', () => {
  assert.throws(
    () => requireSavedGoogleSheetRecord({ ok: true, performance: {} }, 'performance', 'vykon_id', 'výkonu'),
    /nevrátil ID uloženého výkonu/
  );
});

test('potvrzený výkon vrátí serverové ID', async () => {
  const response = new Response(JSON.stringify({
    ok: true,
    performance: { vykon_id: 'VYKON-0042' }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  const result = await parseGoogleSheetResponse(response);
  const performance = requireSavedGoogleSheetRecord(result, 'performance', 'vykon_id', 'výkonu');
  assert.equal(performance.vykon_id, 'VYKON-0042');
});
