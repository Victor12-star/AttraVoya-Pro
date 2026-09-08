import { ProviderResponseError, ProviderUnavailableError } from '../../errors/app-error.js';
import { ERROR_CODES } from '../../errors/error-codes.js';
import { providerMetrics as defaultProviderMetrics } from '../../observability/provider-metrics.js';
import { mapProviderHttpError } from './provider-error-mapper.js';

const RETRYABLE_STATUSES = new Set([408, 425, 500, 502, 503, 504]);
const DEFAULT_MAX_CONCURRENT = 8;
const DEFAULT_MAX_QUEUED = 32;
const DEFAULT_MAX_QUEUE_WAIT_MS = 5000;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 1500;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * @typedef {object} ProviderHttpClientOptions
 * @property {string} provider Human-readable provider name used in safe errors.
 * @property {typeof globalThis.fetch} [fetchImpl] Injectable fetch for deterministic tests.
 * @property {number} [timeoutMs] Default request timeout in milliseconds.
 * @property {number} [retryMax] Maximum transient retries for safe idempotent requests.
 * @property {number} [maxConcurrent] Maximum logical requests allowed in flight for this client.
 * @property {number} [maxQueued] Maximum requests allowed to wait for an in-flight slot.
 * @property {number} [maxQueueWaitMs] Maximum time a request may wait for an in-flight slot.
 * @property {(milliseconds: number) => Promise<void>} [sleepImpl] Injectable retry delay.
 * @property {() => number} [randomImpl] Injectable random source for retry jitter.
 * @property {() => number} [nowImpl] Injectable wall clock for Retry-After cooldowns.
 * @property {{ record: (event: object) => void }} [metrics] Injectable aggregate provider observer.
 */

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`Provider HTTP client ${name} must be a positive integer.`);
  }
}

function assertNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`Provider HTTP client ${name} must be a non-negative integer.`);
  }
}

function retryDelayWithJitter(attempt, randomImpl) {
  const ceiling = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
  const floor = Math.ceil(ceiling / 2);
  const randomValue = Number(randomImpl());
  const boundedRandom = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.999999999999)
    : 0.5;

  return floor + Math.floor(boundedRandom * (ceiling - floor + 1));
}

function providerOutcomeForError(error) {
  if (error?.code === ERROR_CODES.PROVIDER_RATE_LIMITED) return 'rate_limited';
  if (error?.code === ERROR_CODES.PROVIDER_AUTHENTICATION_ERROR) return 'authentication';
  if (error?.code === ERROR_CODES.PROVIDER_RESPONSE_ERROR) return 'response';

  if (error?.code === ERROR_CODES.PROVIDER_UNAVAILABLE) {
    if (error?.details?.reason === 'busy') return 'busy';
    if (error?.details?.reason === 'timeout') return 'timeout';
    if (error?.details?.reason === 'network') return 'network';
    return 'unavailable';
  }

  return 'other';
}

function recordProviderMetric(metrics, event) {
  try {
    metrics.record(event);
  } catch {
    // Observability must never alter provider request success/failure behavior.
  }
}

function createConcurrencyGate({ provider, maxConcurrent, maxQueued, maxQueueWaitMs }) {
  let activeCount = 0;
  /** @type {{ settled: boolean, resolveSlot: () => boolean }[]} */
  const waiters = [];

  async function acquire() {
    if (activeCount < maxConcurrent) {
      activeCount += 1;
      return;
    }

    if (waiters.length >= maxQueued) {
      throw new ProviderUnavailableError(`${provider} is temporarily busy.`, {
        details: {
          provider,
          reason: 'busy',
          maxConcurrent,
          maxQueued,
        },
      });
    }

    await new Promise((resolve, reject) => {
      const waiter = {
        settled: false,
        resolveSlot: () => false,
      };

      const timeout = setTimeout(() => {
        if (waiter.settled) return;
        waiter.settled = true;

        const index = waiters.indexOf(waiter);
        if (index !== -1) waiters.splice(index, 1);

        reject(
          new ProviderUnavailableError(`${provider} is temporarily busy.`, {
            details: {
              provider,
              reason: 'busy',
              maxConcurrent,
              maxQueued,
              maxQueueWaitMs,
            },
          }),
        );
      }, maxQueueWaitMs);

      waiter.resolveSlot = () => {
        if (waiter.settled) return false;
        waiter.settled = true;
        clearTimeout(timeout);
        resolve(undefined);
        return true;
      };

      waiters.push(waiter);
    });
  }

  function release() {
    while (waiters.length > 0) {
      const next = waiters.shift();
      if (next?.resolveSlot()) {
        // Hand the existing slot directly to the oldest live waiter so a new
        // caller cannot race in between release and queue wake-up and exceed
        // the configured in-flight cap.
        return;
      }
    }

    activeCount -= 1;
  }

  return { acquire, release };
}

function finiteNow(nowImpl) {
  const value = Number(nowImpl());
  if (!Number.isFinite(value)) {
    throw new TypeError('Provider HTTP client nowImpl must return a finite number.');
  }

  return value;
}

function retryAfterDeadlineMs(retryAfter, nowMs) {
  if (typeof retryAfter !== 'string') return null;

  const value = retryAfter.trim();
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const delaySeconds = Number(value);
    const maxDelaySeconds = Math.floor((Number.MAX_SAFE_INTEGER - nowMs) / 1000);
    if (!Number.isSafeInteger(delaySeconds) || delaySeconds > maxDelaySeconds) return null;
    return nowMs + delaySeconds * 1000;
  }

  const dateMs = Date.parse(value);
  return Number.isFinite(dateMs) && dateMs > nowMs ? dateMs : null;
}

async function parseJsonResponse(response, provider) {
  try {
    return await response.json();
  } catch (cause) {
    throw new ProviderResponseError(`${provider} returned an unreadable response.`, {
      cause,
      details: { provider, upstreamStatus: response.status },
    });
  }
}

/**
 * Resilient JSON transport shared by external provider adapters.
 *
 * - Enforces a hard timeout.
 * - Bounds per-client/provider concurrency, queue growth, and queue wait time.
 * - Retries only transient failures and never tight-loops on HTTP 429.
 * - Honors valid Retry-After cooldowns across new requests in this process.
 * - Adds bounded retry jitter so concurrent failures do not retry in lockstep.
 * - Records aggregate provider latency/failure/retry telemetry without payload data.
 * - Keeps upstream response text out of application errors/logs by default.
 * - Accepts injected fetch/timing primitives for deterministic unit tests.
 *
 * @param {ProviderHttpClientOptions} options
 */
export function createProviderHttpClient(options) {
  const {
    provider,
    fetchImpl = globalThis.fetch,
    timeoutMs = 10_000,
    retryMax = 2,
    maxConcurrent = DEFAULT_MAX_CONCURRENT,
    maxQueued = DEFAULT_MAX_QUEUED,
    maxQueueWaitMs = DEFAULT_MAX_QUEUE_WAIT_MS,
    sleepImpl = sleep,
    randomImpl = Math.random,
    nowImpl = Date.now,
    metrics = defaultProviderMetrics,
  } = options ?? {};

  if (!provider) throw new TypeError('Provider HTTP client requires a provider name.');
  if (typeof fetchImpl !== 'function') throw new TypeError('Provider HTTP client requires fetch.');
  if (typeof sleepImpl !== 'function') {
    throw new TypeError('Provider HTTP client requires a retry sleep function.');
  }
  if (typeof randomImpl !== 'function') {
    throw new TypeError('Provider HTTP client requires a retry random function.');
  }
  if (typeof nowImpl !== 'function') {
    throw new TypeError('Provider HTTP client requires a clock function.');
  }
  if (!metrics || typeof metrics.record !== 'function') {
    throw new TypeError('Provider HTTP client requires a metrics observer.');
  }
  assertPositiveInteger(maxConcurrent, 'maxConcurrent');
  assertNonNegativeInteger(maxQueued, 'maxQueued');
  assertPositiveInteger(maxQueueWaitMs, 'maxQueueWaitMs');

  const concurrencyGate = createConcurrencyGate({
    provider,
    maxConcurrent,
    maxQueued,
    maxQueueWaitMs,
  });
  let rateLimitUntilMs = 0;

  function rememberRateLimit(retryAfter) {
    const nowMs = finiteNow(nowImpl);
    const deadlineMs = retryAfterDeadlineMs(retryAfter, nowMs);
    if (deadlineMs !== null) {
      rateLimitUntilMs = Math.max(rateLimitUntilMs, deadlineMs);
    }
  }

  function currentRateLimitError() {
    if (rateLimitUntilMs <= 0) return null;

    const nowMs = finiteNow(nowImpl);
    if (nowMs >= rateLimitUntilMs) {
      rateLimitUntilMs = 0;
      return null;
    }

    const retryAfter = String(Math.ceil((rateLimitUntilMs - nowMs) / 1000));
    return mapProviderHttpError({ provider, status: 429, retryAfter });
  }

  async function performRequestJson(url, requestOptions = {}, onAttempt = () => {}) {
    const method = String(requestOptions.method ?? 'GET').toUpperCase();
    const retriesAllowed =
      requestOptions.retry === false || !['GET', 'HEAD'].includes(method) ? 0 : retryMax;
    let attempt = 0;

    while (true) {
      onAttempt();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestOptions.timeoutMs ?? timeoutMs);

      try {
        const headers = new Headers(requestOptions.headers);
        headers.set('Accept', 'application/json');

        let body = requestOptions.body;
        if (
          body !== undefined &&
          body !== null &&
          !(body instanceof FormData) &&
          typeof body !== 'string'
        ) {
          headers.set('Content-Type', 'application/json');
          body = JSON.stringify(body);
        }

        const response = await fetchImpl(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        if (!response.ok) {
          if (RETRYABLE_STATUSES.has(response.status) && attempt < retriesAllowed) {
            attempt += 1;
            await sleepImpl(retryDelayWithJitter(attempt, randomImpl));
            continue;
          }

          const retryAfter = response.headers.get('retry-after');
          if (response.status === 429) {
            rememberRateLimit(retryAfter);
          }

          throw mapProviderHttpError({
            provider,
            status: response.status,
            retryAfter,
          });
        }

        return await parseJsonResponse(response, provider);
      } catch (error) {
        if (error?.name === 'AbortError') {
          if (attempt < retriesAllowed) {
            attempt += 1;
            await sleepImpl(retryDelayWithJitter(attempt, randomImpl));
            continue;
          }

          throw new ProviderUnavailableError(`${provider} timed out.`, {
            cause: error,
            details: { provider, reason: 'timeout' },
          });
        }

        if (error?.code?.startsWith?.('PROVIDER_')) throw error;

        if (attempt < retriesAllowed) {
          attempt += 1;
          await sleepImpl(retryDelayWithJitter(attempt, randomImpl));
          continue;
        }

        throw new ProviderUnavailableError(`${provider} could not be reached.`, {
          cause: error,
          details: { provider, reason: 'network' },
        });
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  async function requestJson(url, requestOptions = {}) {
    const startedAt = Date.now();
    let attempts = 0;
    let acquired = false;

    try {
      const rateLimitErrorBeforeQueue = currentRateLimitError();
      if (rateLimitErrorBeforeQueue) throw rateLimitErrorBeforeQueue;

      await concurrencyGate.acquire();
      acquired = true;

      const rateLimitErrorAfterQueue = currentRateLimitError();
      if (rateLimitErrorAfterQueue) throw rateLimitErrorAfterQueue;

      const payload = await performRequestJson(url, requestOptions, () => {
        attempts += 1;
      });
      recordProviderMetric(metrics, {
        provider,
        outcome: 'success',
        durationMs: Date.now() - startedAt,
        attempts,
      });
      return payload;
    } catch (error) {
      recordProviderMetric(metrics, {
        provider,
        outcome: providerOutcomeForError(error),
        durationMs: Date.now() - startedAt,
        attempts,
      });
      throw error;
    } finally {
      if (acquired) concurrencyGate.release();
    }
  }

  return { requestJson };
}
