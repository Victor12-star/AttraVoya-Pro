export function assertCurrencyProvider(provider) {
  if (!provider || typeof provider.getRates !== 'function' || typeof provider.convert !== 'function') {
    throw new TypeError('Currency provider must implement getRates() and convert().');
  }
  return provider;
}
