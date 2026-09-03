import {
  ProviderResponseError,
  ProviderUnavailableError,
} from '../../errors/app-error.js';
import { mapProviderHttpError } from './provider-error-mapper.js';

const RETRYABLE_STATUSES = new Set([408, 425, 500, 502, 503, 504]);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
 * - Retries only transient failures and never tight-loops on HTTP 429.
 * - Keeps upstream response text out of application errors/logs by default.
 * - Accepts an injected fetch implementation for deterministic unit tests.
 */
export function createProviderHttpClient({
  provider,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  retryMax = 2,
} = {}) {
  if (!provider) throw new TypeError('Provider HTTP client requires a provider name.');
  if (typeof fetchImpl !== 'function') throw new TypeError('Provider HTTP client requires fetch.');

  async function requestJson(url, options = {}) {
    const method = String(options.method ?? 'GET').toUpperCase();
    const retriesAllowed = options.retry === false || !['GET', 'HEAD'].includes(method) ? 0 : retryMax;
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? timeoutMs);

      try {
        const headers = new Headers(options.headers);
        headers.set('Accept', 'application/json');

        let body = options.body;
        if (body !== undefined && body !== null && !(body instanceof FormData) && typeof body !== 'string') {
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
            await sleep(Math.min(250 * 2 ** (attempt - 1), 1500));
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
            await sleep(Math.min(250 * 2 ** (attempt - 1), 1500));
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
          await sleep(Math.min(250 * 2 ** (attempt - 1), 1500));
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

  return { requestJson };
}
