import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderResponseError,
  ProviderUnavailableError,
} from '../../errors/app-error.js';

/**
 * Convert HTTP-level failures into stable provider errors understood by the
 * rest of the API. Provider response bodies are deliberately not included in
 * public error messages because they may contain upstream diagnostics or keys.
 */
export function mapProviderHttpError({ provider, status, retryAfter }) {
  if (status === 401 || status === 403) {
    return new ProviderAuthenticationError(`${provider} rejected the configured credentials.`, {
      details: { provider },
    });
  }

  if (status === 429) {
    return new ProviderRateLimitError(`${provider} rate limit reached.`, {
      details: { provider, ...(retryAfter ? { retryAfter } : {}) },
    });
  }

  if (status >= 500) {
    return new ProviderUnavailableError(`${provider} is temporarily unavailable.`, {
      details: { provider, upstreamStatus: status },
    });
  }

  return new ProviderResponseError(`${provider} could not process the request.`, {
    details: { provider, upstreamStatus: status },
  });
}
