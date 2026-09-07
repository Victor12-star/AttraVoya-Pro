import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import {
  assertHttpLoadTargetAllowed,
  buildHttpLoadTestConfig,
  evaluateHttpLoadThresholds,
  percentile,
  runHttpLoadTest,
  summarizeHttpLoadTest,
} from './http-load-test.js';

test('load configuration is bounded and remote targets require explicit opt-in', () => {
  const local = buildHttpLoadTestConfig({
    LOAD_TEST_REQUESTS: '25',
    LOAD_TEST_CONCURRENCY: '5',
    LOAD_TEST_TIMEOUT_MS: '1500',
  });
  assert.equal(local.targetUrl.href, 'http://127.0.0.1:5000/api/v1/health/live');
  assert.equal(local.requests, 25);
  assert.equal(local.concurrency, 5);
  assert.equal(local.timeoutMs, 1500);

  assert.throws(
    () => buildHttpLoadTestConfig({ LOAD_TEST_BASE_URL: 'https://example.com' }),
    /Remote load testing is disabled/,
  );
  assert.equal(
    assertHttpLoadTargetAllowed('https://example.com/health', true).href,
    'https://example.com/health',
  );
  assert.throws(
    () => buildHttpLoadTestConfig({ LOAD_TEST_CONCURRENCY: '1001' }),
    /LOAD_TEST_CONCURRENCY must be an integer from 1 to 1000/,
  );
});

test('summary reports deterministic percentiles, error rate, and threshold failures', () => {
  const latenciesMs = Array.from({ length: 100 }, (_, index) => index + 1);
  const summary = summarizeHttpLoadTest({
    totalRequests: 100,
    statusCodes: [...Array(97).fill(200), 500, 503],
    transportErrors: ['AbortError'],
    latenciesMs,
    durationMs: 1000,
    maxObservedConcurrency: 10,
    responseBytes: 4096,
  });

  assert.equal(percentile(latenciesMs, 0.5), 50);
  assert.equal(summary.latencyMs.p95, 95);
  assert.equal(summary.latencyMs.p99, 99);
  assert.equal(summary.successful, 97);
  assert.equal(summary.failed, 3);
  assert.equal(summary.errorRate, 0.03);
  assert.equal(summary.throughputRps, 100);
  assert.deepEqual(summary.statusCounts, { 200: 97, 500: 1, 503: 1 });
  assert.deepEqual(summary.transportErrors, { AbortError: 1 });
  assert.deepEqual(evaluateHttpLoadThresholds(summary, { maxErrorRate: 0, maxP95Ms: 50 }), [
    'Error rate 0.03 exceeded the allowed 0.',
    'p95 latency 95 ms exceeded 50 ms.',
  ]);
});

test('runner respects bounded concurrency against a real local HTTP server', async (t) => {
  let active = 0;
  let observedServerConcurrency = 0;
  const server = createServer((request, response) => {
    void request;
    active += 1;
    observedServerConcurrency = Math.max(observedServerConcurrency, active);
    setTimeout(() => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"status":"ok"}');
      active -= 1;
    }, 15);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP server address.');

  const summary = await runHttpLoadTest({
    targetUrl: new URL(`http://127.0.0.1:${address.port}/health`),
    requests: 12,
    concurrency: 3,
    timeoutMs: 1000,
  });

  assert.equal(summary.totalRequests, 12);
  assert.equal(summary.successful, 12);
  assert.equal(summary.failed, 0);
  assert.equal(summary.errorRate, 0);
  assert.equal(summary.statusCounts[200], 12);
  assert.ok(summary.maxObservedConcurrency <= 3);
  assert.ok(observedServerConcurrency <= 3);
  assert.ok(observedServerConcurrency > 1);
  assert.ok(summary.responseBytes > 0);
});
