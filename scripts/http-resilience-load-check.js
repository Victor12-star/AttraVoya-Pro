import { pathToFileURL } from 'node:url';

import { assertHttpLoadTargetAllowed, runHttpLoadTest } from './http-load-test.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:5000';
const DEFAULT_PATH = '/api/v1/countries';
const LIVENESS_PATH = '/api/v1/health/live';
const READINESS_PATH = '/api/v1/health/ready';
const SOAK_WAVES = 4;
const SOAK_REQUESTS_PER_WAVE = 12;
const SOAK_CONCURRENCY = 4;
const SOAK_PAUSE_MS = 250;
const SOAK_MAX_P95_MS = 500;
const SPIKE_REQUESTS = 60;
const SPIKE_CONCURRENCY = 60;
const SPIKE_MAX_P95_MS = 1_000;
const REQUEST_TIMEOUT_MS = 2_000;

function totalTransportErrors(summary) {
  return Object.values(summary.transportErrors ?? {}).reduce((total, count) => total + count, 0);
}

function countStatuses(summary, predicate) {
  return Object.entries(summary.statusCounts ?? {}).reduce((total, [statusCode, count]) => {
    return predicate(Number(statusCode)) ? total + count : total;
  }, 0);
}

function evaluateHealthyProbe(summary, label) {
  if (
    summary.totalRequests === 1 &&
    summary.successful === 1 &&
    summary.statusCounts?.[200] === 1 &&
    totalTransportErrors(summary) === 0
  ) {
    return null;
  }

  return `${label} probe did not return one successful HTTP 200 response after the soak/spike sequence.`;
}

export function evaluateApiResilienceLoadCheck({ soak, spike, liveness, readiness }) {
  const failures = [];

  for (const [index, wave] of soak.entries()) {
    const label = `Soak wave ${index + 1}`;
    if (wave.errorRate !== 0) {
      failures.push(`${label} error rate must be 0, received ${wave.errorRate}.`);
    }
    if (totalTransportErrors(wave) > 0) {
      failures.push(`${label} produced transport errors.`);
    }
    const unexpectedStatuses = countStatuses(wave, (statusCode) => statusCode !== 200);
    if (unexpectedStatuses > 0) {
      failures.push(`${label} produced ${unexpectedStatuses} non-HTTP-200 response(s).`);
    }
    if (wave.latencyMs?.p95 == null || wave.latencyMs.p95 > SOAK_MAX_P95_MS) {
      failures.push(
        `${label} p95 latency ${wave.latencyMs?.p95 ?? 'unavailable'} ms exceeded ${SOAK_MAX_P95_MS} ms.`,
      );
    }
  }

  if (totalTransportErrors(spike) > 0) {
    failures.push('Spike load produced transport errors.');
  }
  const spikeServerErrors = countStatuses(spike, (statusCode) => statusCode >= 500);
  if (spikeServerErrors > 0) {
    failures.push(`Spike load produced ${spikeServerErrors} server error response(s).`);
  }
  const unexpectedSpikeStatuses = countStatuses(spike, (statusCode) => statusCode !== 200);
  if (unexpectedSpikeStatuses > 0) {
    failures.push(`Spike load produced ${unexpectedSpikeStatuses} non-HTTP-200 response(s).`);
  }
  if (spike.errorRate !== 0) {
    failures.push(`Spike-load error rate must be 0, received ${spike.errorRate}.`);
  }
  if (spike.latencyMs?.p95 == null || spike.latencyMs.p95 > SPIKE_MAX_P95_MS) {
    failures.push(
      `Spike-load p95 latency ${spike.latencyMs?.p95 ?? 'unavailable'} ms exceeded ${SPIKE_MAX_P95_MS} ms.`,
    );
  }

  const livenessFailure = evaluateHealthyProbe(liveness, 'Liveness');
  if (livenessFailure) failures.push(livenessFailure);

  const readinessFailure = evaluateHealthyProbe(readiness, 'Readiness');
  if (readinessFailure) failures.push(readinessFailure);

  return failures;
}

export async function runApiResilienceLoadCheck(options = {}, dependencies = {}) {
  const baseUrl = options.baseUrl ?? process.env.RESILIENCE_TEST_BASE_URL ?? DEFAULT_BASE_URL;
  const path = options.path ?? process.env.RESILIENCE_TEST_PATH ?? DEFAULT_PATH;
  const targetUrl = assertHttpLoadTargetAllowed(new URL(path, baseUrl), false);
  const livenessUrl = assertHttpLoadTargetAllowed(new URL(LIVENESS_PATH, baseUrl), false);
  const readinessUrl = assertHttpLoadTargetAllowed(new URL(READINESS_PATH, baseUrl), false);
  const runLoad = dependencies.runHttpLoadTest ?? runHttpLoadTest;
  const sleep =
    dependencies.sleep ??
    ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  const soak = [];
  for (let wave = 0; wave < SOAK_WAVES; wave += 1) {
    soak.push(
      await runLoad(
        {
          targetUrl,
          requests: SOAK_REQUESTS_PER_WAVE,
          concurrency: SOAK_CONCURRENCY,
          timeoutMs: REQUEST_TIMEOUT_MS,
        },
        dependencies,
      ),
    );
    if (wave < SOAK_WAVES - 1) await sleep(SOAK_PAUSE_MS);
  }

  const spike = await runLoad(
    {
      targetUrl,
      requests: SPIKE_REQUESTS,
      concurrency: SPIKE_CONCURRENCY,
      timeoutMs: REQUEST_TIMEOUT_MS,
    },
    dependencies,
  );

  const liveness = await runLoad(
    {
      targetUrl: livenessUrl,
      requests: 1,
      concurrency: 1,
      timeoutMs: REQUEST_TIMEOUT_MS,
    },
    dependencies,
  );
  const readiness = await runLoad(
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
      soakWaves: SOAK_WAVES,
      soakRequestsPerWave: SOAK_REQUESTS_PER_WAVE,
      soakConcurrency: SOAK_CONCURRENCY,
      soakPauseMs: SOAK_PAUSE_MS,
      soakMaxP95Ms: SOAK_MAX_P95_MS,
      spikeRequests: SPIKE_REQUESTS,
      spikeConcurrency: SPIKE_CONCURRENCY,
      spikeMaxP95Ms: SPIKE_MAX_P95_MS,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      expectedStatus: 200,
      postSequenceHealthStatus: 200,
    },
    soak,
    spike,
    liveness,
    readiness,
    failures: evaluateApiResilienceLoadCheck({ soak, spike, liveness, readiness }),
  };
}

async function main() {
  const result = await runApiResilienceLoadCheck();
  console.log(JSON.stringify(result, null, 2));

  if (result.failures.length > 0) {
    for (const failure of result.failures) {
      console.error(`RESILIENCE LOAD CHECK FAILED: ${failure}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      `RESILIENCE LOAD CHECK ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    process.exitCode = 1;
  });
}
