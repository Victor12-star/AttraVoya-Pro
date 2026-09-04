export function createImagesService(provider) {
  return {
    async search(query) {
      return provider.searchPhotos(query);
    },
  };
}
