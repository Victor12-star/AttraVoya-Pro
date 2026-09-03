/**
 * Small in-process TTL cache for low-cost provider responses.
 *
 * This is intentionally provider-agnostic and bounded. It reduces repeated
 * external API calls during local development without pretending to be a
 * distributed cache. A production deployment can later replace this behind
 * the same provider/service boundary with Redis or another shared cache.
 */
export function createProviderCache({ maxEntries = 500, now = () => Date.now() } = {}) {
  const entries = new Map();

  function pruneExpired() {
    const currentTime = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= currentTime) entries.delete(key);
    }
  }

  function enforceLimit() {
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      entries.delete(oldestKey);
    }
  }

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }

      // Refresh insertion order so frequently used entries survive simple LRU
      // eviction without introducing another dependency into the provider layer.
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },

    set(key, value, ttlSeconds) {
      pruneExpired();
      entries.set(key, {
        value,
        expiresAt: now() + Math.max(1, ttlSeconds) * 1000,
      });
      enforceLimit();
      return value;
    },

    delete(key) {
      entries.delete(key);
    },

    clear() {
      entries.clear();
    },

    get size() {
      pruneExpired();
      return entries.size;
    },
  };
}
