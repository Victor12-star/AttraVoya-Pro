export function createAccommodationService(provider) {
  return {
    searchNearby(query) {
      return provider.searchNearby(query);
    },
  };
}
