const APP_STORAGE_POLICY_VERSION = 1;
const APP_STORAGE_POLICY_MARKER_KEY = 'projectReporting.storagePolicy.v1';
const APP_STORAGE_PREFIXES = ['projectReporting.', 'mbVykaznictvi.'];
const SAFE_LOCAL_STORAGE_KEYS = new Set([
  APP_STORAGE_POLICY_MARKER_KEY
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

function purgeSensitiveLocalStorage(storage) {
  try {
    const browserStorage = getBrowserLocalStorage(storage);
    if (!browserStorage) return { removedKeys: [], applied: false };

    const removedKeys = listStorageKeys(browserStorage)
      .filter((key) => isApplicationStorageKey(key) && !SAFE_LOCAL_STORAGE_KEYS.has(key));
    removedKeys.forEach((key) => browserStorage.removeItem(key));
    browserStorage.setItem(APP_STORAGE_POLICY_MARKER_KEY, String(APP_STORAGE_POLICY_VERSION));
    return { removedKeys, applied: true };
  } catch (error) {
    console.warn('Browser storage cleanup failed:', error);
    return { removedKeys: [], applied: false };
  }
}

export {
  APP_STORAGE_POLICY_MARKER_KEY,
  APP_STORAGE_POLICY_VERSION,
  SAFE_LOCAL_STORAGE_KEYS,
  purgeSensitiveLocalStorage
};
