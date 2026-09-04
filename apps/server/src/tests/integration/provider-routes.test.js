import { afterEach, describe, expect, it } from 'vitest';

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
      autocomplete: async ({ query }) => ({ provider: 'test', results: [{ name: query }] }),
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
      searchEvents: async (query) => ({
        provider: 'test',
        events: [{ externalId: 'event-1', name: 'Stockholm Live' }],
        query,
      }),
    },
  };
}

describe('real-provider API contracts', () => {
  it('validates and serves weather, currency, places, translation, accommodation, and events routes', async () => {
    const app = await buildApp(baseOptions());
    apps.push(app);

    const weather = await app.inject({
      method: 'GET',
      url: '/api/v1/weather?latitude=59.33&longitude=18.07&forecastDays=3',
    });
    expect(weather.statusCode).toBe(200);
    expect(weather.json().weather.current.temperatureC).toBe(20);

    const conversion = await app.inject({
      method: 'GET',
      url: '/api/v1/currency/convert?amount=100&from=SEK&to=EUR',
    });
    expect(conversion.statusCode).toBe(200);
    expect(conversion.json().conversion.convertedAmount).toBe(200);

    const places = await app.inject({
      method: 'GET',
      url: '/api/v1/places/autocomplete?query=Barcelona',
    });
    expect(places.statusCode).toBe(200);
    expect(places.json().places.results[0].name).toBe('Barcelona');

    const translation = await app.inject({
      method: 'POST',
      url: '/api/v1/translation',
      payload: { text: 'Hello', source: 'en', target: 'sv' },
    });
    expect(translation.statusCode).toBe(200);
    expect(translation.headers['cache-control']).toBe('no-store');

    const accommodation = await app.inject({
      method: 'GET',
      url: '/api/v1/accommodation/nearby?latitude=59.33&longitude=18.07&types=HOSTEL,GUEST_HOUSE',
    });
    expect(accommodation.statusCode).toBe(200);
    expect(accommodation.json().accommodation.inventoryDataAvailable).toBe(false);

    const events = await app.inject({
      method: 'GET',
      url: '/api/v1/events?city=Stockholm&countryCode=SE&size=5',
    });
    expect(events.statusCode).toBe(200);
    expect(events.json().events.events[0].name).toBe('Stockholm Live');
    expect(events.json().events.query.countryCode).toBe('SE');
  });

  it('rejects invalid event coordinate pairs before calling the provider', async () => {
    let providerCalled = false;
    const options = baseOptions();
    options.eventsProvider = {
      searchEvents: async (query) => {
        providerCalled = true;
        return { provider: 'test', events: [], query };
      },
    };

    const app = await buildApp(options);
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/events?latitude=59.33',
    });

    expect(response.statusCode).toBe(400);
    expect(providerCalled).toBe(false);
  });
});
