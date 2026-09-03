export function assertMapsProvider(provider) {
  if (!provider || typeof provider.geocode !== 'function' || typeof provider.reverseGeocode !== 'function' || typeof provider.route !== 'function') {
    throw new TypeError('Maps provider must implement geocode(), reverseGeocode(), and route().');
  }
  return provider;
}
