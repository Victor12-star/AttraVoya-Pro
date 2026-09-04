export function assertNewsProvider(provider) {
  if (!provider || typeof provider.searchNews !== 'function') {
    throw new TypeError('News provider must implement searchNews().');
  }
  return provider;
}
