import {
  SAFE_CLIENT_INDEX_SESSION_KEY,
  SAFE_RECORD_INDEX_STORAGE_KEY
} from './safeDataCache.js';

const APP_STORAGE_POLICY_VERSION = 2;
const APP_STORAGE_POLICY_MARKER_KEY = 'projectReporting.storagePolicy.v2';
const APP_STORAGE_PREFIXES = ['projectReporting.', 'mbVykaznictvi.'];
const SAFE_LOCAL_STORAGE_KEYS = new Set([
  APP_STORAGE_POLICY_MARKER_KEY,
  SAFE_RECORD_INDEX_STORAGE_KEY
]);
const SAFE_SESSION_STORAGE_KEYS = new Set([
  SAFE_CLIENT_INDEX_SESSION_KEY
]);

function getBrowserLocalStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function listStorageKeys(storage) {
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (typeof key === 'string') keys.push(key);
  }
  return keys;
}

function isApplicationStorageKey(key) {
  return APP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function purgeApplicationStorage(storage, safeKeys, writeMarker = false) {
  try {
    const browserStorage = storage;
    if (!browserStorage) return { removedKeys: [], applied: false };

    const removedKeys = listStorageKeys(browserStorage)
      .filter((key) => isApplicationStorageKey(key) && !safeKeys.has(key));
    removedKeys.forEach((key) => browserStorage.removeItem(key));
    if (writeMarker) browserStorage.setItem(APP_STORAGE_POLICY_MARKER_KEY, String(APP_STORAGE_POLICY_VERSION));
    return { removedKeys, applied: true };
  } catch (error) {
    console.warn('Browser storage cleanup failed:', error);
    return { removedKeys: [], applied: false };
  }
}

function purgeSensitiveLocalStorage(storage) {
  return purgeApplicationStorage(getBrowserLocalStorage(storage), SAFE_LOCAL_STORAGE_KEYS, true);
}

function purgeSensitiveSessionStorage(storage) {
  const browserStorage = storage || (typeof window === 'undefined' ? null : window.sessionStorage);
  return purgeApplicationStorage(browserStorage, SAFE_SESSION_STORAGE_KEYS);
}

export {
  APP_STORAGE_POLICY_MARKER_KEY,
  APP_STORAGE_POLICY_VERSION,
  SAFE_LOCAL_STORAGE_KEYS,
  SAFE_SESSION_STORAGE_KEYS,
  purgeSensitiveLocalStorage,
  purgeSensitiveSessionStorage
};
