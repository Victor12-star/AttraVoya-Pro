import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createProviderCache } from '../http/provider-cache.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { assertTranslationProvider } from './translation-provider.contract.js';
import { TRANSLATION_PROVIDER_REGISTRY } from './translation-provider.registry.js';

const languageCache = createProviderCache({ maxEntries: 20 });

export function createTranslationProvider(options = {}) {
  const providerName = options.providerName ?? env.TRANSLATION_PROVIDER;
  const createProvider = TRANSLATION_PROVIDER_REGISTRY[providerName];
  if (!createProvider) throw new ProviderUnavailableError(`Translation provider '${providerName}' is not supported.`);

  return assertTranslationProvider(createProvider({
    http: options.http ?? createProviderHttpClient({
      provider: providerName,
      timeoutMs: env.PROVIDER_TIMEOUT_MS,
      retryMax: env.PROVIDER_RETRY_MAX,
    }),
    baseUrl: options.baseUrl ?? env.LIBRETRANSLATE_URL,
    languageCache: options.languageCache ?? languageCache,
  }));
}
