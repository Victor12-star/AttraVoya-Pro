import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { assertImageProvider } from './image-provider.contract.js';
import { IMAGE_PROVIDER_REGISTRY } from './image-provider.registry.js';

const cache = createProviderCache({ maxEntries: 500 });

/**
 * Destination imagery stays provider-neutral so licensing, quotas, and
 * attribution requirements can be reviewed or replaced independently.
 */
export function createImageProvider(options = {}) {
  const providerName = options.providerName ?? env.IMAGE_PROVIDER;
  const createProvider = IMAGE_PROVIDER_REGISTRY[providerName];
  if (!createProvider) {
    throw new ProviderUnavailableError(`Image provider '${providerName}' is not supported.`);
  }

  return assertImageProvider(
    createProvider({
      http:
        options.http ??
        createProviderHttpClient({
          provider: providerName,
          timeoutMs: env.PROVIDER_TIMEOUT_MS,
          retryMax: env.PROVIDER_RETRY_MAX,
        }),
      apiKey: options.apiKey ?? env.PEXELS_API_KEY,
      cache: options.cache ?? cache,
      cacheTtlSeconds: options.cacheTtlSeconds ?? env.IMAGES_CACHE_TTL_SECONDS,
    }),
  );
}
