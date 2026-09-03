import { createOpenMeteoWeatherProvider } from './openmeteo-weather-provider.js';

export const WEATHER_PROVIDER_REGISTRY = Object.freeze({
  openmeteo: createOpenMeteoWeatherProvider,
});
