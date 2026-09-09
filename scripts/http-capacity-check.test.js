import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateApiCapacityCheck, runApiCapacityCheck } from './http-capacity-check.js';

function summary({
  successful,
  failed,
  errorRate,
  p95,
  statusCounts,
  transportErrors = {},
}) {
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

test('capacity evaluation accepts healthy steady load and bounded 429 backpressure', () => {
  const failures = evaluateApiCapacityCheck({
    steady: summary({
      successful: 50,
      failed: 0,
      errorRate: 0,
      p95: 120,
      statusCounts: { 200: 50 },
    }),
    burst: summary({
      successful: 70,
      failed: 30,
      errorRate: 0.3,
      p95: 90,
      statusCounts: { 200: 70, 429: 30 },
    }),
  });

  assert.deepEqual(failures, []);
});

test(
  'capacity evaluation rejects latency, transport, server, and missing-backpressure failures',
  () => {
    const failures = evaluateApiCapacityCheck({
      steady: summary({
        successful: 49,
        failed: 1,
        errorRate: 0.02,
        p95: 501,
        statusCounts: { 200: 49, 500: 1 },
      }),
      burst: summary({
        successful: 99,
        failed: 1,
        errorRate: 0.01,
        p95: 150,
        statusCounts: { 200: 99, 503: 1 },
        transportErrors: { AbortError: 1 },
      }),
    });

    assert.ok(failures.some((failure) => failure.includes('Steady-load error rate')));
    assert.ok(failures.some((failure) => failure.includes('p95 latency')));
    assert.ok(failures.some((failure) => failure.includes('transport error')));
    assert.ok(failures.some((failure) => failure.includes('server error response')));
    assert.ok(failures.some((failure) => failure.includes('HTTP 429 backpressure boundary')));
  },
);

test('capacity check refuses remote targets', async () => {
  await assert.rejects(
    runApiCapacityCheck({ baseUrl: 'https://example.com' }),
    /Remote load testing is disabled/,
  );
});
