import { ProviderResponseError, ProviderUnavailableError } from '../../errors/app-error.js';
import { mapProviderHttpError } from './provider-error-mapper.js';

const RETRYABLE_STATUSES = new Set([408, 425, 500, 502, 503, 504]);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * @typedef {object} ProviderHttpClientOptions
 * @property {string} provider Human-readable provider name used in safe errors.
 * @property {typeof globalThis.fetch} [fetchImpl] Injectable fetch for deterministic tests.
 * @property {number} [timeoutMs] Default request timeout in milliseconds.
 * @property {number} [retryMax] Maximum transient retries for safe idempotent requests.
 * @property {number} [maxConcurrent] Maximum in-flight request lifecycles for this provider client.
 * @property {number} [maxQueue] Maximum requests allowed to wait for a provider concurrency slot.
 * @property {(milliseconds: number) => Promise<void>} [sleepImpl] Injectable retry sleeper for tests.
 * @property {() => number} [randomImpl] Injectable random source for deterministic retry jitter tests.
 */

function assertPositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }
}

function assertNonNegativeInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${fieldName} must be a non-negative integer.`);
  }
}

function createConcurrencyGate(provider, maxConcurrent, maxQueue) {
  let active = 0;
  const waiters = [];

  return {
    acquire() {
      if (active < maxConcurrent) {
        active += 1;
        return Promise.resolve();
      }

      if (waiters.length >= maxQueue) {
        return Promise.reject(
          new ProviderUnavailableError(`${provider} is temporarily busy.`, {
            details: { provider, reason: 'backpressure' },
          }),
        );
      }

      return new Promise((resolve) => {
        waiters.push(resolve);
      });
    },

    release() {
      const next = waiters.shift();
      if (next) {
        // The released slot is transferred directly to the oldest waiter, so
        // active stays at the limit and a new request cannot jump the queue.
        next();
        return;
      }

      active = Math.max(0, active - 1);
    },
  };
}

function retryDelayMs(attempt, randomImpl) {
  const baseDelay = Math.min(250 * 2 ** (attempt - 1), 1500);
  let randomValue = 0.5;

  try {
    const candidate = Number(randomImpl());
    if (Number.isFinite(candidate)) randomValue = Math.min(1, Math.max(0, candidate));
  } catch {
    // A custom random source is test/support infrastructure, not a reason to
    // make a provider request fail. Fall back to neutral jitter instead.
  }

  return Math.max(1, Math.round(baseDelay * (0.5 + randomValue)));
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
 * - Bounds provider concurrency and queue growth so traffic spikes cannot create unbounded fan-out.
 * - Retries only transient failures, with jitter, and never tight-loops on HTTP 429.
 * - Keeps upstream response text out of application errors/logs by default.
 * - Accepts injected fetch/sleep/random implementations for deterministic unit tests.
 *
 * @param {ProviderHttpClientOptions} options
 */
export function createProviderHttpClient(options) {
  const {
    provider,
    fetchImpl = globalThis.fetch,
    timeoutMs = 10_000,
    retryMax = 2,
    maxConcurrent = 8,
    maxQueue = 64,
    sleepImpl = sleep,
    randomImpl = Math.random,
  } = options ?? {};

  if (!provider) throw new TypeError('Provider HTTP client requires a provider name.');
  if (typeof fetchImpl !== 'function') throw new TypeError('Provider HTTP client requires fetch.');
  if (typeof sleepImpl !== 'function') throw new TypeError('Provider HTTP client requires sleep.');
  if (typeof randomImpl !== 'function') throw new TypeError('Provider HTTP client requires random.');
  assertPositiveInteger(maxConcurrent, 'maxConcurrent');
  assertNonNegativeInteger(maxQueue, 'maxQueue');

  const concurrencyGate = createConcurrencyGate(provider, maxConcurrent, maxQueue);

  async function executeRequestJson(url, requestOptions = {}) {
    const method = String(requestOptions.method ?? 'GET').toUpperCase();
    const retriesAllowed =
      requestOptions.retry === false || !['GET', 'HEAD'].includes(method) ? 0 : retryMax;
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        requestOptions.timeoutMs ?? timeoutMs,
      );

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
            await sleepImpl(retryDelayMs(attempt, randomImpl));
            continue;
          }

          throw mapProviderHttpError({
            provider,
            status: response.status,
            retryAfter: response.headers.get('retry-after'),
          });
        }

        return await parseJsonResponse(response, provider);
      } catch (error) {
        if (error?.name === 'AbortError') {
          if (attempt < retriesAllowed) {
            attempt += 1;
            await sleepImpl(retryDelayMs(attempt, randomImpl));
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
          await sleepImpl(retryDelayMs(attempt, randomImpl));
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
    await concurrencyGate.acquire();
    try {
      return await executeRequestJson(url, requestOptions);
    } finally {
      concurrencyGate.release();
    }
  }

  return { requestJson };
}
