import { afterEach, describe, expect, it } from 'vitest';

import { ProviderUnavailableError } from '../../errors/app-error.js';

process.env.NODE_ENV = 'test';
process.env.API_HOST = '127.0.0.1';
process.env.API_PORT = '5000';
process.env.LOG_LEVEL = 'silent';
process.env.WEB_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.API_URL = 'http://localhost:5000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
process.env.COOKIE_SECRET = 'c'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);

const { buildApp } = await import('../../app.js');
const apps = [];

afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function baseOptions() {
  return {
    logger: false,
    countriesRepository: { list: async () => [] },
    languagesRepository: { list: async () => [] },
    healthRepository: { checkDatabase: async () => true },
    authRepository: {
      findAuthorizationContextByUserId: async () => null,
    },
    weatherProvider: {
      getForecast: async (query) => ({ provider: 'test', current: { temperatureC: 20 }, query }),
    },
    currencyProvider: {
      getRates: async ({ base }) => ({ provider: 'test', base, rates: [] }),
      convert: async ({ amount, from, to }) => ({
        provider: 'test',
        amount,
        from,
        to,
        convertedAmount: amount * 2,
      }),
    },
    placesProvider: {
      autocomplete: async ({ query, type }) =>
        type === 'city'
          ? {
              provider: 'test',
              results: [
                {
                  provider: 'test',
                  externalId: 'stockholm',
                  name: query,
                  city: query,
                  formattedAddress: `${query}, Sweden`,
                  country: 'Sweden',
                  countryCode: 'SE',
                  latitude: 59.3293,
                  longitude: 18.0686,
                  resultType: 'city',
                },
              ],
            }
          : { provider: 'test', results: [{ name: query }] },
      searchNearby: async ({ categoryGroup }) => ({ provider: 'test', categoryGroup, results: [] }),
    },
    translationProvider: {
      translate: async ({ text, target }) => ({
        provider: 'test',
        translatedText: `${text}-${target}`,
      }),
      getLanguages: async () => ({
        provider: 'test',
        languages: [{ code: 'en', name: 'English', targets: ['sv'] }],
      }),
    },
    accommodationProvider: {
      searchNearby: async () => ({ provider: 'test', results: [], inventoryDataAvailable: false }),
    },
    eventsProvider: {
      searchEvents: async (query) => ({ provider: 'test', events: [], query }),
    },
    newsProvider: {
      searchNews: async (query) => ({ provider: 'test', articles: [], query }),
    },
    imageProvider: {
      searchPhotos: async (query) => ({ provider: 'test', photos: [], query }),
    },
  };
}

describe('provider failure isolation', () => {
  it('keeps unrelated routes available when one provider is unavailable', async () => {
    const options = baseOptions();
    options.weatherProvider = {
      getForecast: async () => {
        throw new ProviderUnavailableError('Weather data is temporarily unavailable.', {
          details: { provider: 'test-weather', reason: 'network' },
        });
      },
    };

    const app = await buildApp(options);
    apps.push(app);

    const weather = await app.inject({
      method: 'GET',
      url: '/api/v1/weather?latitude=59.33&longitude=18.07&forecastDays=3',
    });
    expect(weather.statusCode).toBe(503);
    expect(weather.json().error.code).toBe('PROVIDER_UNAVAILABLE');

    const currency = await app.inject({
      method: 'GET',
      url: '/api/v1/currency/convert?amount=100&from=SEK&to=EUR',
    });
    expect(currency.statusCode).toBe(200);
    expect(currency.json().conversion.convertedAmount).toBe(200);

    const liveness = await app.inject({ method: 'GET', url: '/api/v1/health/live' });
    expect(liveness.statusCode).toBe(200);

    const readiness = await app.inject({ method: 'GET', url: '/api/v1/health/ready' });
    expect(readiness.statusCode).toBe(200);
  });
});
