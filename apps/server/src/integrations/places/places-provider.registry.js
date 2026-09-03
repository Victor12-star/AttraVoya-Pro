import { createGeoapifyPlacesProvider } from './geoapify-places-provider.js';

export const PLACES_PROVIDER_REGISTRY = Object.freeze({
  geoapify: createGeoapifyPlacesProvider,
});
