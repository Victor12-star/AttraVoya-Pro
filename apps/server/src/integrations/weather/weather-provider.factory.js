import { env } from '../../config/env.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { assertWeatherProvider } from './weather-provider.contract.js';
import { WEATHER_PROVIDER_REGISTRY } from './weather-provider.registry.js';

const cache = createProviderCache();

export function createWeatherProvider(options = {}) {
  const providerName = options.providerName ?? env.WEATHER_PROVIDER;
  const createProvider = WEATHER_PROVIDER_REGISTRY[providerName];
  if (!createProvider) {
    throw new ProviderUnavailableError(`Weather provider '${providerName}' is not supported.`);
  }

  return assertWeatherProvider(
    createProvider({
      http:
        options.http ??
        createProviderHttpClient({
          provider: providerName,
          timeoutMs: env.PROVIDER_TIMEOUT_MS,
          retryMax: env.PROVIDER_RETRY_MAX,
        }),
      cache: options.cache ?? cache,
      cacheTtlSeconds: env.WEATHER_CACHE_TTL_SECONDS,
    }),
  );
}
