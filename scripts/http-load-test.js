import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'http://127.0.0.1:5000';
const DEFAULT_PATH = '/api/v1/health/live';
const DEFAULT_REQUESTS = 100;
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_TIMEOUT_MS = 5_000;

const HELP = `AttraVoya Pro HTTP load harness

Environment variables:
  LOAD_TEST_BASE_URL              Target origin (default: ${DEFAULT_BASE_URL})
  LOAD_TEST_PATH                  GET path (default: ${DEFAULT_PATH})
  LOAD_TEST_REQUESTS              Total requests, 1-100000 (default: ${DEFAULT_REQUESTS})
  LOAD_TEST_CONCURRENCY           Concurrent workers, 1-1000 (default: ${DEFAULT_CONCURRENCY})
  LOAD_TEST_TIMEOUT_MS            Per-request timeout, 100-120000 (default: ${DEFAULT_TIMEOUT_MS})
  LOAD_TEST_MAX_ERROR_RATE        Allowed error ratio, 0-1 (default: 0)
  LOAD_TEST_MAX_P95_MS            Optional p95 latency ceiling in milliseconds
  ATTRAVOYA_LOAD_TEST_ALLOW_REMOTE=1  Explicitly allow a non-loopback target

The harness sends GET requests only and records aggregate timing/status metrics. It logs no
response bodies, authorization headers, cookies, traveller data, or provider credentials.`;

function boundedInteger(env, key, defaultValue, min, max) {
  const raw = env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${key} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

function boundedNumber(env, key, defaultValue, min, max) {
  const raw = env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new TypeError(`${key} must be a number from ${min} to ${max}.`);
  }
  return value;
}

function optionalBoundedNumber(env, key, min, max) {
  const raw = env[key];
  if (raw === undefined || raw === '') return null;
  return boundedNumber(env, key, 0, min, max);
}

function loopbackHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]';
}

/**
 * Refuse accidental load against public systems. Remote load tests can still be
 * run deliberately after the operator confirms the target is authorized.
 */
export function assertHttpLoadTargetAllowed(target, allowRemote = false) {
  const url = target instanceof URL ? target : new URL(String(target));
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError('HTTP load testing requires an http or https target.');
  }
  if (url.username || url.password) {
    throw new TypeError('HTTP load targets must not contain credentials.');
  }
  if (!loopbackHostname(url.hostname) && !allowRemote) {
    throw new TypeError(
      'Remote load testing is disabled. Set ATTRAVOYA_LOAD_TEST_ALLOW_REMOTE=1 only for an authorized target.',
    );
  }
  return url;
}

export function buildHttpLoadTestConfig(env = process.env) {
  const allowRemote = env.ATTRAVOYA_LOAD_TEST_ALLOW_REMOTE === '1';
  const baseUrl = env.LOAD_TEST_BASE_URL ?? DEFAULT_BASE_URL;
  const path = env.LOAD_TEST_PATH ?? DEFAULT_PATH;
  const targetUrl = assertHttpLoadTargetAllowed(new URL(path, baseUrl), allowRemote);

  return {
    targetUrl,
    requests: boundedInteger(env, 'LOAD_TEST_REQUESTS', DEFAULT_REQUESTS, 1, 100_000),
    concurrency: boundedInteger(env, 'LOAD_TEST_CONCURRENCY', DEFAULT_CONCURRENCY, 1, 1_000),
    timeoutMs: boundedInteger(env, 'LOAD_TEST_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, 100, 120_000),
    maxErrorRate: boundedNumber(env, 'LOAD_TEST_MAX_ERROR_RATE', 0, 0, 1),
    maxP95Ms: optionalBoundedNumber(env, 'LOAD_TEST_MAX_P95_MS', 1, 120_000),
  };
}

function rounded(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function percentile(samples, quantile) {
  if (!Array.isArray(samples) || samples.length === 0) return null;
  if (!Number.isFinite(quantile) || quantile <= 0 || quantile > 1) {
    throw new TypeError('Percentile quantile must be greater than 0 and at most 1.');
  }
  const ordered = [...samples].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(quantile * ordered.length) - 1);
  return rounded(ordered[index]);
}

export function summarizeHttpLoadTest({
  totalRequests,
  statusCodes,
  transportErrors,
  latenciesMs,
  durationMs,
  maxObservedConcurrency,
  responseBytes,
}) {
  const statusCounts = {};
  let successful = 0;
  for (const statusCode of statusCodes) {
    statusCounts[statusCode] = (statusCounts[statusCode] ?? 0) + 1;
    if (statusCode >= 200 && statusCode < 400) successful += 1;
  }

  const failed = totalRequests - successful;
  return {
    totalRequests,
    successful,
    failed,
    errorRate: rounded(failed / totalRequests, 4),
    durationMs: rounded(durationMs),
    throughputRps: durationMs > 0 ? rounded(totalRequests / (durationMs / 1_000)) : null,
    maxObservedConcurrency,
    responseBytes,
    latencyMs: {
      p50: percentile(latenciesMs, 0.5),
      p95: percentile(latenciesMs, 0.95),
      p99: percentile(latenciesMs, 0.99),
      max: latenciesMs.length ? rounded(Math.max(...latenciesMs)) : null,
    },
    statusCounts,
    transportErrors: Object.fromEntries(
      Object.entries(
        transportErrors.reduce((counts, name) => {
          counts[name] = (counts[name] ?? 0) + 1;
          return counts;
        }, {}),
      ).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

async function drainResponseBody(response) {
  if (!response.body) return 0;
  const reader = response.body.getReader();
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return bytes;
    bytes += value.byteLength;
  }
}

export async function runHttpLoadTest(config, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const now = dependencies.now ?? (() => performance.now());
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');

  const targetUrl = assertHttpLoadTargetAllowed(config.targetUrl, config.allowRemote === true);
  const requests = Number(config.requests);
  const concurrency = Number(config.concurrency);
  const timeoutMs = Number(config.timeoutMs);
  if (!Number.isInteger(requests) || requests < 1 || requests > 100_000) {
    throw new TypeError('Load-test requests must be an integer from 1 to 100000.');
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 1_000) {
    throw new TypeError('Load-test concurrency must be an integer from 1 to 1000.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) {
    throw new TypeError('Load-test timeout must be an integer from 100 to 120000 milliseconds.');
  }

  const latenciesMs = [];
  const statusCodes = [];
  const transportErrors = [];
  let nextRequest = 0;
  let inFlight = 0;
  let maxObservedConcurrency = 0;
  let responseBytes = 0;
  const startedAt = now();

  async function worker() {
    while (true) {
      const requestNumber = nextRequest;
      nextRequest += 1;
      if (requestNumber >= requests) return;

      inFlight += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, inFlight);
      const requestStartedAt = now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(targetUrl, {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: controller.signal,
          redirect: 'manual',
          cache: 'no-store',
        });
        statusCodes.push(response.status);
        responseBytes += await drainResponseBody(response);
      } catch (error) {
        transportErrors.push(typeof error?.name === 'string' ? error.name : 'Error');
      } finally {
        clearTimeout(timeout);
        latenciesMs.push(Math.max(0, now() - requestStartedAt));
        inFlight -= 1;
      }
    }
  }

  const workers = Math.min(concurrency, requests);
  await Promise.all(Array.from({ length: workers }, () => worker()));

  return summarizeHttpLoadTest({
    totalRequests: requests,
    statusCodes,
    transportErrors,
    latenciesMs,
    durationMs: Math.max(0, now() - startedAt),
    maxObservedConcurrency,
    responseBytes,
  });
}

export function evaluateHttpLoadThresholds(summary, config) {
  const failures = [];
  if (summary.errorRate > config.maxErrorRate) {
    failures.push(`Error rate ${summary.errorRate} exceeded the allowed ${config.maxErrorRate}.`);
  }
  if (
    config.maxP95Ms !== null &&
    (summary.latencyMs.p95 === null || summary.latencyMs.p95 > config.maxP95Ms)
  ) {
    failures.push(
      `p95 latency ${summary.latencyMs.p95 ?? 'unavailable'} ms exceeded ${config.maxP95Ms} ms.`,
    );
  }
  return failures;
}

function safeTargetLabel(url) {
  return `${url.origin}${url.pathname}`;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log(HELP);
    return;
  }

  const config = buildHttpLoadTestConfig();
  const summary = await runHttpLoadTest({ ...config, allowRemote: true });
  const failures = evaluateHttpLoadThresholds(summary, config);

  console.log(
    JSON.stringify(
      {
        target: safeTargetLabel(config.targetUrl),
        configuration: {
          requests: config.requests,
          concurrency: config.concurrency,
          timeoutMs: config.timeoutMs,
          maxErrorRate: config.maxErrorRate,
          maxP95Ms: config.maxP95Ms,
        },
        summary,
      },
      null,
      2,
    ),
  );

  if (failures.length) {
    for (const failure of failures) console.error(`LOAD TEST FAILED: ${failure}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`LOAD TEST ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exitCode = 1;
  });
}
