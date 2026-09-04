import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { assertCurrencyProvider } from './currency-provider.contract.js';
import { CURRENCY_PROVIDER_REGISTRY } from './currency-provider.registry.js';

const cache = createProviderCache();

export function createCurrencyProvider(options = {}) {
  const providerName = options.providerName ?? env.CURRENCY_PROVIDER;
  const createProvider = CURRENCY_PROVIDER_REGISTRY[providerName];
  if (!createProvider)
    throw new ProviderUnavailableError(`Currency provider '${providerName}' is not supported.`);

  return assertCurrencyProvider(
    createProvider({
      http:
        options.http ??
        createProviderHttpClient({
          provider: providerName,
          timeoutMs: env.PROVIDER_TIMEOUT_MS,
          retryMax: env.PROVIDER_RETRY_MAX,
        }),
      cache: options.cache ?? cache,
      cacheTtlSeconds: env.CURRENCY_CACHE_TTL_SECONDS,
    }),
  );
}
