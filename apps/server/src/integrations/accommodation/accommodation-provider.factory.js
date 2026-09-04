import { env } from '../../config/env.js';
import { ProviderUnavailableError } from '../../errors/app-error.js';
import { createPlacesProvider } from '../places/places-provider.factory.js';
import { assertAccommodationProvider } from './accommodation-provider.contract.js';
import { ACCOMMODATION_PROVIDER_REGISTRY } from './accommodation-provider.registry.js';

export function createAccommodationProvider(options = {}) {
  const providerName = options.providerName ?? env.ACCOMMODATION_PROVIDER;
  const createProvider = ACCOMMODATION_PROVIDER_REGISTRY[providerName];
  if (!createProvider) {
    throw new ProviderUnavailableError(
      `Accommodation provider '${providerName}' is not supported.`,
    );
  }

  return assertAccommodationProvider(
    createProvider({
      placesProvider: options.placesProvider ?? createPlacesProvider(options),
    }),
  );
}
