import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { assertPlacesProvider } from './places-provider.contract.js';
import { PLACES_PROVIDER_REGISTRY } from './places-provider.registry.js';

const cache = createProviderCache({ maxEntries: 750 });

export function createPlacesProvider(options = {}) {
  const providerName = options.providerName ?? env.PLACES_PROVIDER;
  const createProvider = PLACES_PROVIDER_REGISTRY[providerName];
  if (!createProvider) throw new ProviderUnavailableError(`Places provider '${providerName}' is not supported.`);

  return assertPlacesProvider(createProvider({
    http: options.http ?? createProviderHttpClient({
      provider: providerName,
      timeoutMs: env.PROVIDER_TIMEOUT_MS,
      retryMax: env.PROVIDER_RETRY_MAX,
    }),
    apiKey: options.apiKey ?? env.GEOAPIFY_API_KEY,
    cache: options.cache ?? cache,
    cacheTtlSeconds: env.PLACES_CACHE_TTL_SECONDS,
  }));
}
