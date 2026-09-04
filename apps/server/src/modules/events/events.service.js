export function createEventsService(provider) {
  return {
    async search(query) {
      return provider.searchEvents(query);
    },
  };
}
