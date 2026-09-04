export function assertImageProvider(provider) {
  if (!provider || typeof provider.searchPhotos !== 'function') {
    throw new TypeError('Image provider must implement searchPhotos().');
  }
  return provider;
}
