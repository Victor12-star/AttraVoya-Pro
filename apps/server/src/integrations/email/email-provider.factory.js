import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createProviderHttpClient } from '../http/provider-http-client.js';
import { assertEmailProvider } from './email-provider.contract.js';
import { EMAIL_PROVIDER_REGISTRY } from './email-provider.registry.js';

/**
 * Transactional email is kept behind a provider-neutral boundary so AttraVoya
 * can replace Resend later without changing authentication business logic.
 */
export function createEmailProvider(options = {}) {
  const providerName = options.providerName ?? env.EMAIL_PROVIDER;
  const createProvider = EMAIL_PROVIDER_REGISTRY[providerName];
  if (!createProvider) {
    throw new ProviderUnavailableError(`Email provider '${providerName}' is not supported.`);
  }

  return assertEmailProvider(
    createProvider({
      http:
        options.http ??
        createProviderHttpClient({
          provider: providerName,
          timeoutMs: env.PROVIDER_TIMEOUT_MS,
          retryMax: env.PROVIDER_RETRY_MAX,
        }),
      apiKey: options.apiKey ?? env.RESEND_API_KEY,
      from: options.from ?? env.EMAIL_FROM,
      webUrl: options.webUrl ?? env.WEB_URL,
    }),
  );
}
