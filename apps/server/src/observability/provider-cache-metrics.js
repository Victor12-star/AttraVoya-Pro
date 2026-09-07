function createMetricState() {
  return {
    accesses: 0,
    hits: 0,
    misses: 0,
    loads: 0,
    loadFailures: 0,
    coalesced: 0,
    inFlightBypasses: 0,
    evictions: 0,
    expirations: 0,
    other: 0,
  };
}

function normalizedOutcome(outcome) {
  switch (outcome) {
    case 'hit':
    case 'miss':
    case 'load':
    case 'load_failure':
    case 'coalesced':
    case 'inflight_bypass':
    case 'eviction':
    case 'expiration':
      return outcome;
    default:
      return 'other';
  }
}

function observe(state, outcome) {
  switch (outcome) {
    case 'hit':
      state.accesses += 1;
      state.hits += 1;
      return;
    case 'miss':
      state.accesses += 1;
      state.misses += 1;
      return;
    case 'load':
      state.loads += 1;
      return;
    case 'load_failure':
      state.loadFailures += 1;
      return;
    case 'coalesced':
      state.coalesced += 1;
      return;
    case 'inflight_bypass':
      state.inFlightBypasses += 1;
      return;
    case 'eviction':
      state.evictions += 1;
      return;
    case 'expiration':
      state.expirations += 1;
      return;
    default:
      state.other += 1;
  }
}

/**
 * Aggregate provider-cache telemetry is deliberately label-free. Cache keys can
 * encode locations or request parameters, so they must never become metric labels.
 */
export function createProviderCacheMetrics({ now = Date.now } = {}) {
  if (typeof now !== 'function') throw new TypeError('now must be a function.');

  const startedAtMs = now();
  const state = createMetricState();

  return {
    record({ outcome }) {
      observe(state, normalizedOutcome(outcome));
    },

    snapshot() {
      const elapsedSeconds = Math.max(0, (now() - startedAtMs) / 1_000);
      return {
        windowSeconds: elapsedSeconds,
        accesses: state.accesses,
        accessesPerSecond: elapsedSeconds > 0 ? state.accesses / elapsedSeconds : 0,
        hits: state.hits,
        misses: state.misses,
        hitRate: state.accesses > 0 ? state.hits / state.accesses : 0,
        loads: state.loads,
        loadFailures: state.loadFailures,
        loadFailureRate: state.loads > 0 ? state.loadFailures / state.loads : 0,
        coalesced: state.coalesced,
        inFlightBypasses: state.inFlightBypasses,
        evictions: state.evictions,
        expirations: state.expirations,
        other: state.other,
      };
    },
  };
}

export const providerCacheMetrics = createProviderCacheMetrics();
