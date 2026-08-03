async function parseGoogleSheetResponse(response) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Google Sheet nevrátil platnou JSON odpověď. Uložení nelze potvrdit.');
  }

  if (!response.ok) {
    const error = new Error(result?.error || `Google Sheet akce selhala se stavem ${response.status}.`);
    error.code = result?.code || '';
    throw error;
  }
  if (result?.ok !== true) {
    const error = new Error(result?.error || 'Google Sheet nepotvrdil úspěšné provedení akce.');
    error.code = result?.code || '';
    throw error;
  }
  return result;
}

function requireSavedGoogleSheetRecord(result, recordKeys, idKey, recordLabel) {
  const keys = Array.isArray(recordKeys) ? recordKeys : [recordKeys];
  const record = keys.map((key) => result?.[key]).find(Boolean);
  const id = String(record?.[idKey] || '').trim();
  if (!id) {
    throw new Error(`Google Sheet nevrátil ID uloženého ${recordLabel}. Uložení nelze potvrdit.`);
  }
  return record;
}

export { parseGoogleSheetResponse, requireSavedGoogleSheetRecord };
