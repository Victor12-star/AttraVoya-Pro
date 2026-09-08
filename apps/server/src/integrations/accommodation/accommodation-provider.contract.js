// Accommodation providers may return a provider-neutral `photos` array on each
// result. Each photo can expose {id, url, thumbnailUrl, category, alt, provider,
// attribution}. The web client accepts HTTP(S) URLs only and treats categories
// as EXTERIOR, ROOM, BED, BATHROOM, INTERIOR or OTHER. Providers without
// property-specific licensed media must return no photos rather than stock media.
export function assertAccommodationProvider(provider) {
  if (!provider || typeof provider.searchNearby !== 'function') {
    throw new TypeError('Accommodation provider must implement searchNearby().');
  }
  return provider;
}
