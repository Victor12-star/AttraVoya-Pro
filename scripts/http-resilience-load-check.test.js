import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateApiResilienceLoadCheck,
  runApiResilienceLoadCheck,
} from './http-resilience-load-check.js';

function summary({ successful, failed, errorRate, p95, statusCounts, transportErrors = {} }) {
  return {
    totalRequests: successful + failed,
    successful,
    failed,
    errorRate,
    latencyMs: { p50: p95, p95, p99: p95, max: p95 },
    statusCounts,
    transportErrors,
  };
}

function healthyProbe() {
  return summary({
    successful: 1,
    failed: 0,
    errorRate: 0,
    p95: 10,
    statusCounts: { 200: 1 },
  });
}

function healthySoakWave() {
  return summary({
    successful: 12,
    failed: 0,
    errorRate: 0,
    p95: 120,
    statusCounts: { 200: 12 },
  });
}

function healthySpike() {
  return summary({
    successful: 60,
    failed: 0,
    errorRate: 0,
    p95: 400,
    statusCounts: { 200: 60 },
  });
}

test('resilience evaluation accepts bounded soak waves, spike traffic, and healthy probes', () => {
  const failures = evaluateApiResilienceLoadCheck({
    soak: Array.from({ length: 4 }, healthySoakWave),
    spike: healthySpike(),
    liveness: healthyProbe(),
    readiness: healthyProbe(),
  });

  assert.deepEqual(failures, []);
});

test('resilience evaluation rejects soak, spike, and post-sequence health failures', () => {
  const failures = evaluateApiResilienceLoadCheck({
    soak: [
      healthySoakWave(),
      summary({
        successful: 11,
        failed: 1,
        errorRate: 0.0833,
        p95: 501,
        statusCounts: { 200: 11, 429: 1 },
        transportErrors: { AbortError: 1 },
      }),
    ],
    spike: summary({
      successful: 58,
      failed: 2,
      errorRate: 0.0333,
      p95: 1_001,
      statusCounts: { 200: 58, 503: 1, 429: 1 },
      transportErrors: { AbortError: 1 },
    }),
    liveness: summary({
      successful: 0,
      failed: 1,
      errorRate: 1,
      p95: 10,
      statusCounts: { 429: 1 },
    }),
    readiness: summary({
      successful: 0,
      failed: 1,
      errorRate: 1,
      p95: 10,
      statusCounts: {},
      transportErrors: { AbortError: 1 },
    }),
  });

  assert.ok(failures.some((failure) => failure.includes('Soak wave 2 error rate')));
  assert.ok(failures.some((failure) => failure.includes('Soak wave 2 produced transport errors')));
  assert.ok(failures.some((failure) => failure.includes('Soak wave 2 produced 1 non-HTTP-200')));
  assert.ok(failures.some((failure) => failure.includes('Soak wave 2 p95 latency')));
  assert.ok(failures.some((failure) => failure.includes('Spike load produced transport errors')));
  assert.ok(failures.some((failure) => failure.includes('server error response')));
  assert.ok(failures.some((failure) => failure.includes('non-HTTP-200 response')));
  assert.ok(failures.some((failure) => failure.includes('Spike-load error rate')));
  assert.ok(failures.some((failure) => failure.includes('Spike-load p95 latency')));
  assert.ok(failures.some((failure) => failure.includes('Liveness probe')));
  assert.ok(failures.some((failure) => failure.includes('Readiness probe')));
});

test('resilience runner executes bounded soak, spike, probes, and pauses', async () => {
  const calls = [];
  const pauses = [];
  const responses = [
    healthySoakWave(),
    healthySoakWave(),
    healthySoakWave(),
    healthySoakWave(),
    healthySpike(),
    healthyProbe(),
    healthyProbe(),
  ];

  const result = await runApiResilienceLoadCheck(
    {},
    {
      runHttpLoadTest: async (config) => {
        calls.push(config);
        return responses[calls.length - 1];
      },
      sleep: async (milliseconds) => {
        pauses.push(milliseconds);
      },
    },
  );

  assert.equal(calls.length, 7);
  assert.equal(pauses.length, 3);
  assert.deepEqual(pauses, [250, 250, 250]);
  assert.deepEqual(
    calls.slice(0, 4).map((call) => [call.requests, call.concurrency]),
    [
      [12, 4],
      [12, 4],
      [12, 4],
      [12, 4],
    ],
  );
  assert.deepEqual([calls[4].requests, calls[4].concurrency], [60, 60]);
  assert.deepEqual(result.failures, []);
});

test('resilience check refuses remote targets', async () => {
  await assert.rejects(
    runApiResilienceLoadCheck({ baseUrl: 'https://example.com' }),
    /Remote load testing is disabled/,
  );
});
