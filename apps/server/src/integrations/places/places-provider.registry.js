import { createUnavailableProvider } from '../http/unavailable-provider.js';
import { createGeoapifyPlacesProvider } from './geoapify-places-provider.js';

export const PLACES_PROVIDER_REGISTRY = Object.freeze({
  none: () => createUnavailableProvider('places', ['autocomplete','searchNearby']),
  geoapify: createGeoapifyPlacesProvider,
});
