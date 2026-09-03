import { createGeoapifyAccommodationProvider } from './geoapify-accommodation-provider.js';

export const ACCOMMODATION_PROVIDER_REGISTRY = Object.freeze({
  geoapify: createGeoapifyAccommodationProvider,
});
