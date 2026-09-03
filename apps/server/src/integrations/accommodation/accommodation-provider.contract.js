export function assertAccommodationProvider(provider) {
  if (!provider || typeof provider.searchNearby !== 'function') {
    throw new TypeError('Accommodation provider must implement searchNearby().');
  }
  return provider;
}
