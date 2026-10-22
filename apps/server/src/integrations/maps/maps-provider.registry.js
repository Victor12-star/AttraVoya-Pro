import { createUnavailableProvider } from '../http/unavailable-provider.js';
import { createGeoapifyMapsProvider } from './geoapify-maps-provider.js';

export const MAPS_PROVIDER_REGISTRY = Object.freeze({
  none: () => createUnavailableProvider('maps', ['geocode','reverseGeocode','route']),
  geoapify: createGeoapifyMapsProvider,
});
