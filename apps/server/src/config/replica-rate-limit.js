const DEFAULT_STORE_MAX_ENTRIES = 5000;
const PARTITIONED_RATE_LIMIT = Symbol('attravoya.replicaRateLimitPartitioned');

function assertReplicaCount(replicaCount) {
  if (!Number.isSafeInteger(replicaCount) || replicaCount < 1) {
    throw new TypeError('Rate-limit replicaCount must be a positive integer.');
  }
}

/**
 * Treat configured maxima as deployment-wide ceilings. Each declared replica
 * receives a conservative fixed share so independent local counters cannot
 * multiply the configured allowance across the deployment.
 */
export function partitionDeploymentRateLimitMax(max, replicaCount) {
  assertReplicaCount(replicaCount);
  if (!Number.isSafeInteger(max) || max < 0) {
    throw new TypeError('Rate-limit max must be a non-negative integer.');
  }
  if (max === 0) return 0;

  const perReplicaMax = Math.floor(max / replicaCount);
  if (perReplicaMax < 1) {
    throw new Error(
      `Rate-limit max ${max} cannot reserve a non-zero share for ${replicaCount} declared API replicas.`,
    );
  }

  return perReplicaMax;
}

export function partitionDeploymentRateLimitConfig(rateLimit, replicaCount) {
  if (!rateLimit || typeof rateLimit !== 'object') {
    throw new TypeError('Rate-limit configuration must be an object.');
  }

  return {
    ...rateLimit,
    max: partitionDeploymentRateLimitMax(rateLimit.max, replicaCount),
  };
}

function assertMultiReplicaRouteContract(rateLimit, replicaCount) {
  if (replicaCount === 1) return;

  if (typeof rateLimit.max === 'function') {
    throw new Error('Multi-replica rate limits require a fixed numeric max.');
  }
  if (typeof rateLimit.timeWindow === 'function') {
    throw new Error('Multi-replica rate limits require a fixed time window.');
  }
  if (rateLimit.continueExceeding === true || rateLimit.exponentialBackoff === true) {
    throw new Error(
      'Multi-replica rate limits require fixed aligned windows without continueExceeding or exponentialBackoff.',
    );
  }
}

/**
 * Normalize every route override before @fastify/rate-limit observes it. The
 * symbol marker survives Fastify object copies, preventing generated HEAD
 * routes or repeated onRoute processing from partitioning the same limit twice.
 */
export function createReplicaRateLimitRouteNormalizer(replicaCount) {
  assertReplicaCount(replicaCount);

  return function normalizeReplicaRateLimit(routeOptions) {
    const routeRateLimit = routeOptions.config?.rateLimit;
    if (!routeRateLimit || routeRateLimit === false || typeof routeRateLimit !== 'object') return;
    if (routeRateLimit[PARTITIONED_RATE_LIMIT]) return;

    assertMultiReplicaRouteContract(routeRateLimit, replicaCount);

    const normalizedRateLimit = { ...routeRateLimit };
    if (Number.isFinite(routeRateLimit.max)) {
      normalizedRateLimit.max = partitionDeploymentRateLimitMax(
        Math.trunc(routeRateLimit.max),
        replicaCount,
      );
    }
    normalizedRateLimit[PARTITIONED_RATE_LIMIT] = true;
    routeOptions.config.rateLimit = normalizedRateLimit;
  };
}

function assertFixedWindowStoreOptions(options) {
  if (options.continueExceeding === true || options.exponentialBackoff === true) {
    throw new Error(
      'Aligned rate-limit store does not support continueExceeding or exponentialBackoff windows.',
    );
  }
}

function alignedWindow(nowMs, timeWindow) {
  if (!Number.isFinite(timeWindow) || timeWindow <= 0) {
    throw new TypeError('Rate-limit timeWindow must be a positive number of milliseconds.');
  }

  const windowStart = Math.floor(nowMs / timeWindow) * timeWindow;
  return {
    windowStart,
    windowEnd: windowStart + timeWindow,
  };
}

/**
 * Bounded process-local store with wall-clock-aligned fixed windows. Separate
 * replicas can keep independent counters because their maxima are partitioned;
 * aligned rollover prevents staggered process-start windows from multiplying
 * the deployment-wide allowance at a boundary.
 */
export class AlignedLocalRateLimitStore {
  constructor(options = {}) {
    assertFixedWindowStoreOptions(options);
    this.now = typeof options.now === 'function' ? options.now : Date.now;
    this.maxEntries =
      Number.isSafeInteger(options.cache) && options.cache > 0
        ? options.cache
        : DEFAULT_STORE_MAX_ENTRIES;
    this.entries = new Map();
    this.lastNow = 0;
  }

  child(routeOptions = {}) {
    return new AlignedLocalRateLimitStore({
      ...routeOptions,
      cache: routeOptions.cache ?? this.maxEntries,
      now: this.now,
    });
  }

  currentTime() {
    const observedNow = this.now();
    if (!Number.isFinite(observedNow) || observedNow < 0) {
      throw new TypeError('Rate-limit clock must return a non-negative finite timestamp.');
    }

    // A backwards wall-clock correction must make the limiter stricter, never
    // reopen an earlier bucket and accidentally grant another local allowance.
    this.lastNow = Math.max(this.lastNow, observedNow);
    return this.lastNow;
  }

  setEntry(key, entry) {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, entry);

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      this.entries.delete(oldestKey);
    }
  }

  incr(key, callback, timeWindow) {
    try {
      const nowMs = this.currentTime();
      const { windowStart, windowEnd } = alignedWindow(nowMs, timeWindow);
      const existing = this.entries.get(key);
      const current = existing?.windowStart === windowStart ? existing.current + 1 : 1;

      this.setEntry(key, { current, windowStart });
      callback(null, {
        current,
        ttl: Math.max(1, windowEnd - nowMs),
      });
    } catch (error) {
      callback(error);
    }
  }

  read(key, callback, timeWindow) {
    try {
      const nowMs = this.currentTime();
      const { windowStart, windowEnd } = alignedWindow(nowMs, timeWindow);
      const existing = this.entries.get(key);

      if (!existing || existing.windowStart !== windowStart) {
        callback(null, { current: 0, ttl: 0 });
        return;
      }

      callback(null, {
        current: existing.current,
        ttl: Math.max(1, windowEnd - nowMs),
      });
    } catch (error) {
      callback(error);
    }
  }
}
