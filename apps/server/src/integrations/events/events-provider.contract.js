export function assertEventsProvider(provider) {
  if (!provider || typeof provider.searchEvents !== 'function') {
    throw new TypeError('Events provider must implement searchEvents().');
  }
  return provider;
}
