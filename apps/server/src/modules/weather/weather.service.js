export function createWeatherService(provider) {
  return {
    async getForecast(query) {
      return provider.getForecast(query);
    },
  };
}
