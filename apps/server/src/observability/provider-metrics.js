const DEFAULT_MAX_PROVIDERS = 32;
const OVERFLOW_PROVIDER = '<overflow>';
const LATENCY_BUCKETS_MS = Object.freeze([
  100,
  250,
  500,
  1_000,
  2_500,
  5_000,
  10_000,
  20_000,
  Number.POSITIVE_INFINITY,
]);

function createMetricState() {
  return {
    requests: 0,
    attempts: 0,
    retries: 0,
    successes: 0,
    failures: 0,
    rateLimited: 0,
    outcomes: {
      success: 0,
      busy: 0,
      timeout: 0,
      network: 0,
      rateLimited: 0,
      authentication: 0,
      unavailable: 0,
      response: 0,
      other: 0,
    },
    latencyBuckets: LATENCY_BUCKETS_MS.map(() => 0),
  };
}

function normalizedOutcome(outcome) {
  switch (outcome) {
    case 'success':
    case 'busy':
    case 'timeout':
    case 'network':
    case 'rate_limited':
    case 'authentication':
    case 'unavailable':
    case 'response':
      return outcome;
    default:
      return 'other';
  }
}

function incrementOutcome(outcomes, outcome) {
  switch (outcome) {
    case 'success':
      outcomes.success += 1;
      return;
    case 'busy':
      outcomes.busy += 1;
      return;
    case 'timeout':
      outcomes.timeout += 1;
      return;
    case 'network':
      outcomes.network += 1;
      return;
    case 'rate_limited':
      outcomes.rateLimited += 1;
      return;
    case 'authentication':
      outcomes.authentication += 1;
      return;
    case 'unavailable':
      outcomes.unavailable += 1;
      return;
    case 'response':
      outcomes.response += 1;
      return;
    default:
      outcomes.other += 1;
  }
}

function percentileUpperBound(state, percentile) {
  if (state.requests === 0) return null;

  const target = Math.ceil(state.requests * percentile);
  let cumulative = 0;

  for (let index = 0; index < LATENCY_BUCKETS_MS.length; index += 1) {
    cumulative += state.latencyBuckets[index];
    if (cumulative >= target) return LATENCY_BUCKETS_MS[index];
  }

  return Number.POSITIVE_INFINITY;
}

function observe(state, outcome, durationMs, attempts) {
  const safeDurationMs = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
  const safeAttempts = Number.isInteger(attempts) && attempts >= 0 ? attempts : 0;

  state.requests += 1;
  state.attempts += safeAttempts;
  state.retries += Math.max(0, safeAttempts - 1);
  incrementOutcome(state.outcomes, outcome);

  if (outcome === 'success') {
    state.successes += 1;
  } else {
    state.failures += 1;
  }
  if (outcome === 'rate_limited') state.rateLimited += 1;

  const bucketIndex = LATENCY_BUCKETS_MS.findIndex((upperBound) => safeDurationMs <= upperBound);
  state.latencyBuckets[bucketIndex] += 1;
}

function snapshotState(state, elapsedSeconds) {
  return {
    requests: state.requests,
    requestsPerSecond: elapsedSeconds > 0 ? state.requests / elapsedSeconds : 0,
    attempts: state.attempts,
    retries: state.retries,
    successes: state.successes,
    failures: state.failures,
    failureRate: state.requests > 0 ? state.failures / state.requests : 0,
    rateLimited: state.rateLimited,
    outcomes: { ...state.outcomes },
    latencyMsUpperBound: {
      p50: percentileUpperBound(state, 0.5),
      p95: percentileUpperBound(state, 0.95),
      p99: percentileUpperBound(state, 0.99),
    },
  };
}

/**
 * Keep provider telemetry bounded and free of request/provider payload data.
 * Provider names come from configured adapters and are capped defensively.
 */
export function createProviderMetrics({ now = Date.now, maxProviders = DEFAULT_MAX_PROVIDERS } = {}) {
  if (typeof now !== 'function') throw new TypeError('now must be a function.');
  if (!Number.isInteger(maxProviders) || maxProviders < 1) {
    throw new RangeError('maxProviders must be a positive integer.');
  }

  const startedAtMs = now();
  const providers = new Map();

  function stateFor(provider) {
    const existing = providers.get(provider);
    if (existing) return existing.state;

    if (providers.size < maxProviders) {
      const state = createMetricState();
      providers.set(provider, { provider, state });
      return state;
    }

    const overflow = providers.get(OVERFLOW_PROVIDER);
    if (overflow) return overflow.state;

    const state = createMetricState();
    providers.set(OVERFLOW_PROVIDER, { provider: OVERFLOW_PROVIDER, state });
    return state;
  }

  return {
    record({ provider, outcome, durationMs, attempts }) {
      const safeProvider =
        typeof provider === 'string' && provider.trim().length > 0
          ? provider.trim().toLowerCase()
          : '<unknown>';
      observe(stateFor(safeProvider), normalizedOutcome(outcome), durationMs, attempts);
    },

    snapshot() {
      const elapsedSeconds = Math.max(0, (now() - startedAtMs) / 1_000);
      return {
        windowSeconds: elapsedSeconds,
        providers: Array.from(providers.values(), ({ provider, state }) => ({
          provider,
          ...snapshotState(state, elapsedSeconds),
        })),
      };
    },
  };
}

export const providerMetrics = createProviderMetrics();
