export function createPlacesService(provider) {
  return {
    autocomplete(query) {
      return provider.autocomplete(query);
    },
    searchNearby(query) {
      return provider.searchNearby(query);
    },
  };
}
