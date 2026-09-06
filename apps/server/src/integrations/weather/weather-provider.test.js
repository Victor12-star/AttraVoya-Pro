import { describe, expect, it, vi } from 'vitest';

import { createProviderCache } from '../http/provider-cache.js';
import { createOpenMeteoWeatherProvider } from './openmeteo-weather-provider.js';

const payload = {
  latitude: 59.33,
  longitude: 18.07,
  timezone: 'Europe/Stockholm',
  current: {
    time: '2026-09-03T20:00',
    temperature_2m: 19,
    apparent_temperature: 18,
    precipitation: 0,
    rain: 0,
    weather_code: 1,
    cloud_cover: 20,
    wind_speed_10m: 8,
    wind_gusts_10m: 16,
  },
  daily: {
    time: ['2026-09-03'],
    weather_code: [1],
    temperature_2m_max: [21],
    temperature_2m_min: [12],
    precipitation_sum: [0],
    precipitation_probability_max: [10],
    wind_speed_10m_max: [18],
    sunrise: ['2026-09-03T05:45'],
    sunset: ['2026-09-03T19:45'],
  },
};

const query = { latitude: 59.33, longitude: 18.07, forecastDays: 1, timezone: 'auto' };

describe('Open-Meteo adapter', () => {
  it('normalizes and caches weather responses', async () => {
    const http = { requestJson: vi.fn().mockResolvedValue(payload) };
    const provider = createOpenMeteoWeatherProvider({
      http,
      cache: createProviderCache(),
      cacheTtlSeconds: 600,
    });

    const first = await provider.getForecast(query);
    const second = await provider.getForecast(query);

    expect(first.current.temperatureC).toBe(19);
    expect(first.daily[0].temperatureMaxC).toBe(21);
    expect(second).toEqual(first);
    expect(http.requestJson).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent identical cache misses into one provider request', async () => {
    const gate = Promise.withResolvers();
    const http = {
      requestJson: vi.fn().mockImplementation(async () => {
        await gate.promise;
        return payload;
      }),
    };
    const provider = createOpenMeteoWeatherProvider({
      http,
      cache: createProviderCache(),
      cacheTtlSeconds: 600,
    });

    const requests = [
      provider.getForecast(query),
      provider.getForecast(query),
      provider.getForecast(query),
    ];

    await Promise.resolve();
    expect(http.requestJson).toHaveBeenCalledTimes(1);

    gate.resolve(undefined);
    const results = await Promise.all(requests);

    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(http.requestJson).toHaveBeenCalledTimes(1);
  });
});
