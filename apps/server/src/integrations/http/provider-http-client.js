import { ProviderResponseError, ProviderUnavailableError } from '../../errors/app-error.js';
import { mapProviderHttpError } from './provider-error-mapper.js';

const RETRYABLE_STATUSES = new Set([408, 425, 500, 502, 503, 504]);
const DEFAULT_MAX_CONCURRENT = 8;
const DEFAULT_MAX_QUEUED = 32;
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
 * @property {(milliseconds: number) => Promise<void>} [sleepImpl] Injectable retry delay.
 * @property {() => number} [randomImpl] Injectable random source for retry jitter.
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

function createConcurrencyGate({ provider, maxConcurrent, maxQueued }) {
  let activeCount = 0;
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

    await new Promise((resolve) => {
      waiters.push(resolve);
    });
  }

  function release() {
    const next = waiters.shift();
    if (next) {
      // Hand the existing slot directly to the oldest waiter so a new caller
      // cannot race in between release and queue wake-up and exceed the cap.
      next();
      return;
    }

    activeCount -= 1;
  }

  return { acquire, release };
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
 * - Bounds per-client/provider concurrency and queue growth.
 * - Retries only transient failures and never tight-loops on HTTP 429.
 * - Adds bounded retry jitter so concurrent failures do not retry in lockstep.
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
    sleepImpl = sleep,
    randomImpl = Math.random,
  } = options ?? {};

  if (!provider) throw new TypeError('Provider HTTP client requires a provider name.');
  if (typeof fetchImpl !== 'function') throw new TypeError('Provider HTTP client requires fetch.');
  if (typeof sleepImpl !== 'function') {
    throw new TypeError('Provider HTTP client requires a retry sleep function.');
  }
  if (typeof randomImpl !== 'function') {
    throw new TypeError('Provider HTTP client requires a retry random function.');
  }
  assertPositiveInteger(maxConcurrent, 'maxConcurrent');
  assertNonNegativeInteger(maxQueued, 'maxQueued');

  const concurrencyGate = createConcurrencyGate({ provider, maxConcurrent, maxQueued });

  async function performRequestJson(url, requestOptions = {}) {
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
            await sleepImpl(retryDelayWithJitter(attempt, randomImpl));
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
    await concurrencyGate.acquire();

    try {
      return await performRequestJson(url, requestOptions);
    } finally {
      concurrencyGate.release();
    }
  }

  return { requestJson };
}
