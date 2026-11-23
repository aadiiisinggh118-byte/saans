/**
 * Small TTL + LRU cache: identical requests are answered without repeating the work.
 * @param {{ max?: number, ttlMs?: number, now?: () => number }} [options]
 */
export function createCache({ max = 50, ttlMs = 600000, now = Date.now } = {}) {
  const map = new Map();
  return {
    /** @param {string} key */
    get(key) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (now() - entry.at > ttlMs) {
        map.delete(key);
        return undefined;
      }
      map.delete(key);
      map.set(key, entry); // refresh recency
      return entry.value;
    },
    /** @param {string} key @param {unknown} value */
    set(key, value) {
      map.delete(key);
      map.set(key, { value, at: now() });
      while (map.size > max) map.delete(map.keys().next().value);
    },
    get size() {
      return map.size;
    },
  };
}
