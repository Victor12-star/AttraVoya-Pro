export function createNewsService(provider) {
  return {
    async search(query) {
      return provider.searchNews(query);
    },
  };
}
