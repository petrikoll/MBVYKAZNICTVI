const SAFE_RECORD_INDEX_VERSION = 1;
const SAFE_CLIENT_INDEX_VERSION = 1;
const SAFE_CACHE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

const SAFE_RECORD_INDEX_STORAGE_KEY = 'projectReporting.safeRecordIndex.v1';
const SAFE_CLIENT_INDEX_SESSION_KEY = 'projectReporting.safeClientIndex.v1';

function getStorage(storage, type) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return type === 'session' ? window.sessionStorage : window.localStorage;
}

function isSafeOpaqueClientId(value) {
  const text = String(value || '').trim();
  return /^(?:KLIENT-\d+|[0-9a-f]{8}-[0-9a-f-]{27,})$/i.test(text);
}

function isSafeRecordId(value) {
  const text = String(value || '').trim();
  return Boolean(text) && text.length <= 120 && /^[a-z0-9_.:-]+$/i.test(text);
}

function safeDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function buildSafeRecordIndex(records) {
  if (!Array.isArray(records)) return [];
  return records.flatMap((record) => {
    if (
      record?.remoteSource !== 'google-sheet' ||
      record?.entityType !== 'consultations' ||
      !isSafeRecordId(record.id) ||
      !isSafeOpaqueClientId(record.clientId)
    ) {
      return [];
    }

    const isCaseManagement = record.ka === 'KA2' || Boolean(record.payload?.caseManagementMode);
    const durationMinutes = safeNumber(record.payload?.durationMinutes);
    return [{
      id: String(record.id),
      remoteSource: 'google-sheet',
      entityType: 'consultations',
      ka: isCaseManagement ? 'KA2' : 'KA1',
      title: isCaseManagement ? 'Case management' : 'V\u00fdkon KA1',
      activityDate: safeDate(record.activityDate),
      worker: '',
      clientId: String(record.clientId),
      clientIds: [String(record.clientId)],
      clientName: '',
      documentText: '',
      payload: {
        durationMinutes,
        caseManagementMode: isCaseManagement
      },
      indicatorFlags: { ka02Consultations: true },
      createdAt: safeNumber(record.createdAt),
      updatedAt: safeNumber(record.updatedAt),
      isSafeCachedIndex: true
    }];
  });
}

function buildSafeClientIndex(clients) {
  if (!Array.isArray(clients)) return [];
  return clients.flatMap((client) => {
    if (!isSafeOpaqueClientId(client?.id)) return [];
    return [{
      id: String(client.id),
      projectStatus: ['active', 'waiting', 'completed', 'inactive'].includes(client.projectStatus)
        ? client.projectStatus
        : 'active',
      updatedAt: safeNumber(client.updatedAt)
    }];
  });
}

function readCache(storage, key, version, collectionKey, now = Date.now()) {
  try {
    const browserStorage = storage;
    if (!browserStorage) return { items: [], revision: '', savedAt: 0, valid: false };
    const payload = JSON.parse(browserStorage.getItem(key) || 'null');
    const savedAt = Number(payload?.savedAt) || 0;
    if (
      payload?.version !== version ||
      !Array.isArray(payload?.[collectionKey]) ||
      savedAt <= 0 ||
      now - savedAt > SAFE_CACHE_MAX_AGE_MS
    ) {
      browserStorage.removeItem(key);
      return { items: [], revision: '', savedAt: 0, valid: false };
    }
    return {
      items: payload[collectionKey],
      revision: String(payload.revision || ''),
      savedAt,
      valid: true
    };
  } catch {
    return { items: [], revision: '', savedAt: 0, valid: false };
  }
}

function readSafeRecordIndex(storage, now) {
  const result = readCache(
    getStorage(storage, 'local'),
    SAFE_RECORD_INDEX_STORAGE_KEY,
    SAFE_RECORD_INDEX_VERSION,
    'records',
    now
  );
  return { ...result, records: result.items };
}

function writeSafeRecordIndex(records, revision = '', storage, now = Date.now()) {
  try {
    const browserStorage = getStorage(storage, 'local');
    if (!browserStorage) return false;
    browserStorage.setItem(SAFE_RECORD_INDEX_STORAGE_KEY, JSON.stringify({
      version: SAFE_RECORD_INDEX_VERSION,
      savedAt: now,
      revision: String(revision || ''),
      records: buildSafeRecordIndex(records)
    }));
    return true;
  } catch {
    return false;
  }
}

function readSafeClientIndex(storage, now) {
  const result = readCache(
    getStorage(storage, 'session'),
    SAFE_CLIENT_INDEX_SESSION_KEY,
    SAFE_CLIENT_INDEX_VERSION,
    'clients',
    now
  );
  return { ...result, clients: result.items };
}

function writeSafeClientIndex(clients, revision = '', storage, now = Date.now()) {
  try {
    const browserStorage = getStorage(storage, 'session');
    if (!browserStorage) return false;
    browserStorage.setItem(SAFE_CLIENT_INDEX_SESSION_KEY, JSON.stringify({
      version: SAFE_CLIENT_INDEX_VERSION,
      savedAt: now,
      revision: String(revision || ''),
      clients: buildSafeClientIndex(clients)
    }));
    return true;
  } catch {
    return false;
  }
}

function readSafeStartupRecords(localStorage, sessionStorage, now = Date.now()) {
  const recordCache = readSafeRecordIndex(localStorage, now);
  if (!recordCache.valid) return [];
  const clientCache = readSafeClientIndex(sessionStorage, now);
  if (!clientCache.valid || !clientCache.clients.length) return recordCache.records;
  const knownClientIds = new Set(clientCache.clients.map((client) => client.id));
  return recordCache.records.filter((record) => knownClientIds.has(record.clientId));
}

export {
  SAFE_CACHE_MAX_AGE_MS,
  SAFE_CLIENT_INDEX_SESSION_KEY,
  SAFE_RECORD_INDEX_STORAGE_KEY,
  buildSafeClientIndex,
  buildSafeRecordIndex,
  readSafeClientIndex,
  readSafeRecordIndex,
  readSafeStartupRecords,
  writeSafeClientIndex,
  writeSafeRecordIndex
};
