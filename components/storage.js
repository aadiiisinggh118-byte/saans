const KEY = "saans.household.v1";

/** Reads the saved household and place, or null. Anything read here is re-validated by the caller. */
export function readSaved() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {{ profile: object, query: string }} value */
export function writeSaved(value) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the app works the same without it.
  }
}
