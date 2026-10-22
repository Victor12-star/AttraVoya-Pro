import { ProviderUnavailableError } from '../../errors/app-error.js';

/**
 * Explicit staging-only disabled integration. Keep the API bootable, while
 * returning a controlled unavailable error instead of invented provider data.
 */
export function createUnavailableProvider(providerLabel, methods) {
  return Object.fromEntries(
    methods.map((method) => [
      method,
      async () => {
        throw new ProviderUnavailableError(`${providerLabel} integration is disabled.`);
      },
    ]),
  );
}
