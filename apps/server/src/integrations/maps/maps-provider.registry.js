import { createGeoapifyMapsProvider } from './geoapify-maps-provider.js';

export const MAPS_PROVIDER_REGISTRY = Object.freeze({
  geoapify: createGeoapifyMapsProvider,
});
