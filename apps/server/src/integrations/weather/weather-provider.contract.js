/**
 * Provider-neutral weather contract.
 * Adapters may expose additional private helpers, but services should depend
 * only on this method shape so the external weather provider remains swappable.
 */
export function assertWeatherProvider(provider) {
  if (!provider || typeof provider.getForecast !== 'function') {
    throw new TypeError('Weather provider must implement getForecast().');
  }
  return provider;
}
