export function assertTranslationProvider(provider) {
  if (!provider || typeof provider.translate !== 'function' || typeof provider.getLanguages !== 'function') {
    throw new TypeError('Translation provider must implement translate() and getLanguages().');
  }
  return provider;
}
