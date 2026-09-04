import { normalizeOpenMeteoForecast } from './weather-normalizer.js';

const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'rain',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_gusts_10m',
];
const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'sunrise',
  'sunset',
];

function weatherCacheKey({ latitude, longitude, forecastDays, timezone }) {
  // Rounding keeps tiny GPS jitter from consuming new weather requests for
  // practically the same location while still preserving neighbourhood-level accuracy.
  return [Number(latitude).toFixed(3), Number(longitude).toFixed(3), forecastDays, timezone].join(
    ':',
  );
}

export function createOpenMeteoWeatherProvider({ http, cache, cacheTtlSeconds = 600 }) {
  return {
    name: 'openmeteo',

    async getForecast({ latitude, longitude, forecastDays = 7, timezone = 'auto' }) {
      const cacheKey = weatherCacheKey({ latitude, longitude, forecastDays, timezone });
      const cached = cache?.get(cacheKey);
      if (cached) return cached;

      const url = new URL(FORECAST_ENDPOINT);
      url.searchParams.set('latitude', String(latitude));
      url.searchParams.set('longitude', String(longitude));
      url.searchParams.set('current', CURRENT_FIELDS.join(','));
      url.searchParams.set('daily', DAILY_FIELDS.join(','));
      url.searchParams.set('timezone', timezone);
      url.searchParams.set('forecast_days', String(forecastDays));

      const payload = await http.requestJson(url);
      const normalized = normalizeOpenMeteoForecast(payload);
      return cache ? cache.set(cacheKey, normalized, cacheTtlSeconds) : normalized;
    },
  };
}
