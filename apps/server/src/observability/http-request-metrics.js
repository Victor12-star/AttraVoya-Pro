const DEFAULT_MAX_SERIES = 128;
const OVERFLOW_ROUTE = '<overflow>';
const LATENCY_BUCKETS_MS = Object.freeze([
  50,
  100,
  250,
  500,
  1_000,
  2_500,
  5_000,
  10_000,
  Number.POSITIVE_INFINITY,
]);

function createMetricState() {
  return {
    requests: 0,
    serverErrors: 0,
    statusClasses: {
      '1xx': 0,
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
      other: 0,
    },
    latencyBuckets: LATENCY_BUCKETS_MS.map(() => 0),
  };
}

function statusClassFor(statusCode) {
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
    return 'other';
  }

  return `${Math.floor(statusCode / 100)}xx`;
}

function incrementStatusClass(statusClasses, statusClass) {
  switch (statusClass) {
    case '1xx':
      statusClasses['1xx'] += 1;
      return;
    case '2xx':
      statusClasses['2xx'] += 1;
      return;
    case '3xx':
      statusClasses['3xx'] += 1;
      return;
    case '4xx':
      statusClasses['4xx'] += 1;
      return;
    case '5xx':
      statusClasses['5xx'] += 1;
      return;
    default:
      statusClasses.other += 1;
  }
}

function observe(state, statusCode, durationMs) {
  const safeDurationMs = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
  const statusClass = statusClassFor(statusCode);

  state.requests += 1;
  incrementStatusClass(state.statusClasses, statusClass);
  if (statusCode >= 500 && statusCode <= 599) state.serverErrors += 1;

  const bucketIndex = LATENCY_BUCKETS_MS.findIndex((upperBound) => safeDurationMs <= upperBound);
  state.latencyBuckets[bucketIndex] += 1;
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

function snapshotState(state, elapsedSeconds) {
  return {
    requests: state.requests,
    requestsPerSecond: elapsedSeconds > 0 ? state.requests / elapsedSeconds : 0,
    serverErrors: state.serverErrors,
    serverErrorRate: state.requests > 0 ? state.serverErrors / state.requests : 0,
    statusClasses: { ...state.statusClasses },
    latencyMsUpperBound: {
      p50: percentileUpperBound(state, 0.5),
      p95: percentileUpperBound(state, 0.95),
      p99: percentileUpperBound(state, 0.99),
    },
    latencyBuckets: LATENCY_BUCKETS_MS.map((upperBound, index) => ({
      upperBound,
      count: state.latencyBuckets[index],
    })),
  };
}

/**
 * Keep HTTP metrics bounded and aggregate-only. Route labels must be supplied by
 * a code-defined route normalizer, never from a raw URL or private identifier.
 */
export function createHttpRequestMetrics({
  now = Date.now,
  maxSeries = DEFAULT_MAX_SERIES,
} = {}) {
  if (typeof now !== 'function') throw new TypeError('now must be a function.');
  if (!Number.isInteger(maxSeries) || maxSeries < 1) {
    throw new RangeError('maxSeries must be a positive integer.');
  }

  const startedAtMs = now();
  const overall = createMetricState();
  const series = new Map();

  function seriesFor(method, route) {
    const key = `${method} ${route}`;
    const existing = series.get(key);
    if (existing) return existing.state;

    if (series.size < maxSeries) {
      const state = createMetricState();
      series.set(key, { method, route, state });
      return state;
    }

    const overflowKey = `* ${OVERFLOW_ROUTE}`;
    const overflow = series.get(overflowKey);
    if (overflow) return overflow.state;

    const state = createMetricState();
    series.set(overflowKey, { method: '*', route: OVERFLOW_ROUTE, state });
    return state;
  }

  return {
    record({ method, route, statusCode, durationMs }) {
      const safeMethod =
        typeof method === 'string' && method.length > 0 ? method.toUpperCase() : 'UNKNOWN';
      const safeRoute = typeof route === 'string' && route.length > 0 ? route : '<unmatched>';
      const safeStatusCode = Number.isInteger(statusCode) ? statusCode : 0;

      observe(overall, safeStatusCode, durationMs);
      observe(seriesFor(safeMethod, safeRoute), safeStatusCode, durationMs);
    },

    snapshot() {
      const elapsedSeconds = Math.max(0, (now() - startedAtMs) / 1_000);
      return {
        windowSeconds: elapsedSeconds,
        overall: snapshotState(overall, elapsedSeconds),
        series: Array.from(series.values(), ({ method, route, state }) => ({
          method,
          route,
          ...snapshotState(state, elapsedSeconds),
        })),
      };
    },
  };
}

/**
 * Fastify onResponse hook adapter. The route resolver is injected so the app can
 * reuse the same privacy-safe route normalization as structured request logs.
 */
export function createHttpRequestMetricsHook(metrics, routeForRequest) {
  if (!metrics || typeof metrics.record !== 'function') {
    throw new TypeError('metrics must expose a record function.');
  }
  if (typeof routeForRequest !== 'function') {
    throw new TypeError('routeForRequest must be a function.');
  }

  return async function recordHttpRequestMetric(request, reply) {
    metrics.record({
      method: request.method,
      route: routeForRequest(request),
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
    });
  };
}
