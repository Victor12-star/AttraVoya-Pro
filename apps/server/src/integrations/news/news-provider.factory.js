import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { assertNewsProvider } from './news-provider.contract.js';
import { NEWS_PROVIDER_REGISTRY } from './news-provider.registry.js';

const cache = createProviderCache({ maxEntries: 500 });

/**
 * News stays provider-neutral because free-tier availability, licensing and
 * commercial terms can change independently of AttraVoya's public API.
 */
export function createNewsProvider(options = {}) {
  const providerName = options.providerName ?? env.NEWS_PROVIDER;
  const createProvider = NEWS_PROVIDER_REGISTRY[providerName];
  if (!createProvider) {
    throw new ProviderUnavailableError(`News provider '${providerName}' is not supported.`);
  }

  return assertNewsProvider(
    createProvider({
      http:
        options.http ??
        createProviderHttpClient({
          provider: providerName,
          timeoutMs: env.PROVIDER_TIMEOUT_MS,
          retryMax: env.PROVIDER_RETRY_MAX,
        }),
      apiKey: options.apiKey ?? env.NEWSDATA_API_KEY,
      cache: options.cache ?? cache,
      cacheTtlSeconds: options.cacheTtlSeconds ?? env.NEWS_CACHE_TTL_SECONDS,
    }),
  );
}
