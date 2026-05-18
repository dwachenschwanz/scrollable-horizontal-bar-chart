function getStorage(storage) {
  try {
    return storage ?? globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readBooleanPreference(
  key,
  { fallback = false, storage = null } = {}
) {
  try {
    const value = getStorage(storage)?.getItem(key);
    return value == null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

export function writeBooleanPreference(
  key,
  value,
  { storage = null } = {}
) {
  try {
    getStorage(storage)?.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in private browsing, previews, or SSR.
  }
}

export function readJsonPreference(
  key,
  isValid,
  { fallback = null, storage = null } = {}
) {
  try {
    const rawValue = getStorage(storage)?.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    const value = JSON.parse(rawValue);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonPreference(key, value, { storage = null } = {}) {
  try {
    getStorage(storage)?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing, previews, or SSR.
  }
}
