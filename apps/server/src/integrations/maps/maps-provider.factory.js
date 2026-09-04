import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { assertMapsProvider } from './maps-provider.contract.js';
import { MAPS_PROVIDER_REGISTRY } from './maps-provider.registry.js';

const cache = createProviderCache({ maxEntries: 500 });

export function createMapsProvider(options = {}) {
  const providerName = options.providerName ?? env.MAPS_PROVIDER;
  const createProvider = MAPS_PROVIDER_REGISTRY[providerName];
  if (!createProvider)
    throw new ProviderUnavailableError(`Maps provider '${providerName}' is not supported.`);

  return assertMapsProvider(
    createProvider({
      http:
        options.http ??
        createProviderHttpClient({
          provider: providerName,
          timeoutMs: env.PROVIDER_TIMEOUT_MS,
          retryMax: env.PROVIDER_RETRY_MAX,
        }),
      apiKey: options.apiKey ?? env.GEOAPIFY_API_KEY,
      cache: options.cache ?? cache,
      cacheTtlSeconds: env.PLACES_CACHE_TTL_SECONDS,
    }),
  );
}
