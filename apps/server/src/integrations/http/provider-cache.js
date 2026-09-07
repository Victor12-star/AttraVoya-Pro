import { providerCacheMetrics as defaultProviderCacheMetrics } from '../../observability/provider-cache-metrics.js';

/**
 * @typedef {{ record: (event: { outcome: string }) => void }} ProviderCacheMetricsObserver
 */

/**
 * @param {ProviderCacheMetricsObserver} metrics
 * @param {string} outcome
 */
function recordCacheMetric(metrics, outcome) {
  try {
    metrics.record({ outcome });
  } catch {
    // Observability must never alter cache or provider request behavior.
  }
}

/**
 * Small in-process TTL cache for low-cost provider responses.
 *
 * This is intentionally provider-agnostic and bounded. It reduces repeated
 * external API calls during local development without pretending to be a
 * distributed cache. A production deployment can later replace this behind
 * the same provider/service boundary with Redis or another shared cache.
 *
 * @param {{
 *   maxEntries?: number,
 *   maxInFlight?: number,
 *   now?: () => number,
 *   metrics?: ProviderCacheMetricsObserver
 * }} [options]
 */
export function createProviderCache({
  maxEntries = 500,
  maxInFlight = maxEntries,
  now = () => Date.now(),
  metrics = defaultProviderCacheMetrics,
} = {}) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new TypeError('Provider cache maxEntries must be a positive integer.');
  }
  if (!Number.isInteger(maxInFlight) || maxInFlight < 1) {
    throw new TypeError('Provider cache maxInFlight must be a positive integer.');
  }
  if (!metrics || typeof metrics.record !== 'function') {
    throw new TypeError('Provider cache requires a metrics observer.');
  }

  const entries = new Map();
  const inFlight = new Map();

  function pruneExpired() {
    const currentTime = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= currentTime) {
        entries.delete(key);
        recordCacheMetric(metrics, 'expiration');
      }
    }
  }

  function enforceLimit() {
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      entries.delete(oldestKey);
      recordCacheMetric(metrics, 'eviction');
    }
  }

  function get(key) {
    const entry = entries.get(key);
    if (!entry) {
      recordCacheMetric(metrics, 'miss');
      return undefined;
    }
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      recordCacheMetric(metrics, 'expiration');
      recordCacheMetric(metrics, 'miss');
      return undefined;
    }

    // Refresh insertion order so frequently used entries survive simple LRU
    // eviction without introducing another dependency into the provider layer.
    entries.delete(key);
    entries.set(key, entry);
    recordCacheMetric(metrics, 'hit');
    return entry.value;
  }

  function set(key, value, ttlSeconds) {
    pruneExpired();
    entries.set(key, {
      value,
      expiresAt: now() + Math.max(1, ttlSeconds) * 1000,
    });
    enforceLimit();
    return value;
  }

  async function loadAndCache(key, loader, ttlSeconds) {
    recordCacheMetric(metrics, 'load');
    try {
      const value = await loader();
      return set(key, value, ttlSeconds);
    } catch (error) {
      recordCacheMetric(metrics, 'load_failure');
      throw error;
    }
  }

  return {
    get,
    set,

    /**
     * Return a cached value or coalesce concurrent misses for the same key into
     * one loader promise. Rejected loads are never cached and the in-flight
     * entry is always removed so a later request can retry normally.
     */
    async getOrLoad(key, loader, ttlSeconds) {
      if (typeof loader !== 'function') {
        throw new TypeError('Provider cache loader must be a function.');
      }

      const cached = get(key);
      if (cached !== undefined) return cached;

      const existingLoad = inFlight.get(key);
      if (existingLoad) {
        recordCacheMetric(metrics, 'coalesced');
        return existingLoad;
      }

      const loadPromise = loadAndCache(key, loader, ttlSeconds);

      // Keep single-flight bookkeeping bounded. When many unrelated keys miss
      // simultaneously, provider HTTP concurrency/backpressure still protects
      // the server; this cache simply skips coalescing additional unique keys
      // rather than allowing its own in-flight map to grow without limit.
      if (inFlight.size >= maxInFlight) {
        recordCacheMetric(metrics, 'inflight_bypass');
        return loadPromise;
      }

      inFlight.set(key, loadPromise);
      try {
        return await loadPromise;
      } finally {
        if (inFlight.get(key) === loadPromise) inFlight.delete(key);
      }
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

/**
 * Provider adapters call one helper so production caches receive single-flight
 * protection while simple injected get/set test doubles remain compatible.
 */
export async function loadProviderCacheValue({ cache, key, ttlSeconds, loader }) {
  if (!cache) return loader();
  if (typeof cache.getOrLoad === 'function') {
    return cache.getOrLoad(key, loader, ttlSeconds);
  }

  const cached = cache.get?.(key);
  if (cached !== undefined) return cached;

  const value = await loader();
  return typeof cache.set === 'function' ? cache.set(key, value, ttlSeconds) : value;
}
