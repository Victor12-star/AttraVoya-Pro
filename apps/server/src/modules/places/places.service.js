export function createPlacesService(provider) {
  return {
    autocomplete(query) {
      return provider.autocomplete(query);
    },
    searchNearby(query) {
      return provider.searchNearby(query);
    },
    searchConsularMissions(query) {
      if (typeof provider.searchConsularMissions !== 'function') {
        throw new TypeError('Places provider does not support consular mission discovery.');
      }
      return provider.searchConsularMissions(query);
    },
  };
}
