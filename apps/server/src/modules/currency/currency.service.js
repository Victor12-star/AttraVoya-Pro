export function createCurrencyService(provider) {
  return {
    getRates(query) {
      return provider.getRates(query);
    },
    convert(query) {
      return provider.convert(query);
    },
  };
}
