export function assertPlacesProvider(provider) {
  if (!provider || typeof provider.autocomplete !== 'function' || typeof provider.searchNearby !== 'function') {
    throw new TypeError('Places provider must implement autocomplete() and searchNearby().');
  }
  return provider;
}
