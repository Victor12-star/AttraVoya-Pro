import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { assertEventsProvider } from './events-provider.contract.js';
import { EVENTS_PROVIDER_REGISTRY } from './events-provider.registry.js';

const cache = createProviderCache({ maxEntries: 500 });

/**
 * Provider selection stays behind a factory so Ticketmaster can be replaced
 * without changing the public API, website, mobile app, or Admin consumers.
 */
export function createEventsProvider(options = {}) {
  const providerName = options.providerName ?? env.EVENTS_PROVIDER;
  const createProvider = EVENTS_PROVIDER_REGISTRY[providerName];
  if (!createProvider) {
    throw new ProviderUnavailableError(`Events provider '${providerName}' is not supported.`);
  }

  return assertEventsProvider(
    createProvider({
      http:
        options.http ??
        createProviderHttpClient({
          provider: providerName,
          timeoutMs: env.PROVIDER_TIMEOUT_MS,
          retryMax: env.PROVIDER_RETRY_MAX,
        }),
      apiKey: options.apiKey ?? env.TICKETMASTER_API_KEY,
      cache: options.cache ?? cache,
      cacheTtlSeconds: options.cacheTtlSeconds ?? env.EVENTS_CACHE_TTL_SECONDS,
    }),
  );
}
