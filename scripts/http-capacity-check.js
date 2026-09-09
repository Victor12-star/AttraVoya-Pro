import { pathToFileURL } from 'node:url';

import { assertHttpLoadTargetAllowed, runHttpLoadTest } from './http-load-test.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:5000';
const DEFAULT_PATH = '/api/v1/countries';
const LIVENESS_PATH = '/api/v1/health/live';
const READINESS_PATH = '/api/v1/health/ready';
const STEADY_REQUESTS = 50;
const STEADY_CONCURRENCY = 10;
const BURST_REQUESTS = 100;
const BURST_CONCURRENCY = 40;
const REQUEST_TIMEOUT_MS = 2_000;
const STEADY_MAX_P95_MS = 500;

function totalTransportErrors(summary) {
  return Object.values(summary.transportErrors ?? {}).reduce((total, count) => total + count, 0);
}

function countStatuses(summary, predicate) {
  return Object.entries(summary.statusCounts ?? {}).reduce((total, [statusCode, count]) => {
    return predicate(Number(statusCode)) ? total + count : total;
  }, 0);
}

function evaluateHealthProbe(summary, label) {
  if (
    summary.totalRequests === 1 &&
    summary.successful === 1 &&
    summary.statusCounts?.[200] === 1 &&
    totalTransportErrors(summary) === 0
  ) {
    return null;
  }

  return `${label} probe did not return one successful HTTP 200 response after overload.`;
}

export function evaluateApiCapacityCheck({ steady, burst, liveness, readiness }) {
  const failures = [];

  if (steady.errorRate !== 0) {
    failures.push(`Steady-load error rate must be 0, received ${steady.errorRate}.`);
  }

  const steadyP95 = steady.latencyMs?.p95;
  if (steadyP95 == null || steadyP95 > STEADY_MAX_P95_MS) {
    failures.push(
      `Steady-load p95 latency ${steadyP95 ?? 'unavailable'} ms exceeded ${STEADY_MAX_P95_MS} ms.`,
    );
  }

  const burstTransportErrors = totalTransportErrors(burst);
  if (burstTransportErrors > 0) {
    failures.push(`Burst load produced ${burstTransportErrors} transport error(s).`);
  }

  const burstServerErrors = countStatuses(burst, (statusCode) => statusCode >= 500);
  if (burstServerErrors > 0) {
    failures.push(`Burst load produced ${burstServerErrors} server error response(s).`);
  }

  const unexpectedBurstResponses = countStatuses(
    burst,
    (statusCode) => !((statusCode >= 200 && statusCode < 400) || statusCode === 429),
  );
  if (unexpectedBurstResponses > 0) {
    failures.push(`Burst load produced ${unexpectedBurstResponses} unexpected response(s).`);
  }

  if ((burst.statusCounts?.[429] ?? 0) < 1) {
    failures.push('Burst load did not exercise the HTTP 429 backpressure boundary.');
  }

  if (burst.successful < 1) {
    failures.push(
      'Burst load did not complete any successful requests before backpressure engaged.',
    );
  }

  const livenessFailure = evaluateHealthProbe(liveness, 'Liveness');
  if (livenessFailure) failures.push(livenessFailure);

  const readinessFailure = evaluateHealthProbe(readiness, 'Readiness');
  if (readinessFailure) failures.push(readinessFailure);

  return failures;
}

export async function runApiCapacityCheck(options = {}, dependencies = {}) {
  const baseUrl = options.baseUrl ?? process.env.CAPACITY_TEST_BASE_URL ?? DEFAULT_BASE_URL;
  const path = options.path ?? process.env.CAPACITY_TEST_PATH ?? DEFAULT_PATH;
  const targetUrl = assertHttpLoadTargetAllowed(new URL(path, baseUrl), false);
  const livenessUrl = assertHttpLoadTargetAllowed(new URL(LIVENESS_PATH, baseUrl), false);
  const readinessUrl = assertHttpLoadTargetAllowed(new URL(READINESS_PATH, baseUrl), false);

  const steady = await runHttpLoadTest(
    {
      targetUrl,
      requests: STEADY_REQUESTS,
      concurrency: STEADY_CONCURRENCY,
      timeoutMs: REQUEST_TIMEOUT_MS,
    },
    dependencies,
  );

  const burst = await runHttpLoadTest(
    {
      targetUrl,
      requests: BURST_REQUESTS,
      concurrency: BURST_CONCURRENCY,
      timeoutMs: REQUEST_TIMEOUT_MS,
    },
    dependencies,
  );

  // Probe the same process immediately after ordinary traffic has crossed the
  // global backpressure boundary. Orchestrators need these signals precisely
  // when the application is overloaded, but the probes remain rate bounded.
  const liveness = await runHttpLoadTest(
    {
      targetUrl: livenessUrl,
      requests: 1,
      concurrency: 1,
      timeoutMs: REQUEST_TIMEOUT_MS,
    },
    dependencies,
  );
  const readiness = await runHttpLoadTest(
    {
      targetUrl: readinessUrl,
      requests: 1,
      concurrency: 1,
      timeoutMs: REQUEST_TIMEOUT_MS,
    },
    dependencies,
  );

  return {
    target: `${targetUrl.origin}${targetUrl.pathname}`,
    thresholds: {
      steadyRequests: STEADY_REQUESTS,
      steadyConcurrency: STEADY_CONCURRENCY,
      steadyMaxP95Ms: STEADY_MAX_P95_MS,
      burstRequests: BURST_REQUESTS,
      burstConcurrency: BURST_CONCURRENCY,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      burstExpectedBackpressureStatus: 429,
      postOverloadHealthStatus: 200,
    },
    steady,
    burst,
    liveness,
    readiness,
    failures: evaluateApiCapacityCheck({ steady, burst, liveness, readiness }),
  };
}

async function main() {
  const result = await runApiCapacityCheck();
  console.log(JSON.stringify(result, null, 2));

  if (result.failures.length > 0) {
    for (const failure of result.failures) console.error(`CAPACITY CHECK FAILED: ${failure}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      `CAPACITY CHECK ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    process.exitCode = 1;
  });
}
