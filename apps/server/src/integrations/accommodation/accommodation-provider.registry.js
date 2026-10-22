import { createUnavailableProvider } from '../http/unavailable-provider.js';
import { createGeoapifyAccommodationProvider } from './geoapify-accommodation-provider.js';

export const ACCOMMODATION_PROVIDER_REGISTRY = Object.freeze({
  none: () => createUnavailableProvider('accommodation', ['searchNearby']),
  geoapify: createGeoapifyAccommodationProvider,
});
