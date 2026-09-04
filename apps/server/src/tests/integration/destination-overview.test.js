import { afterEach, describe, expect, it, vi } from 'vitest';

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

function appOptions(overrides = {}) {
  return {
    logger: false,
    countriesRepository: { list: async () => [] },
    languagesRepository: { list: async () => [] },
    healthRepository: { checkDatabase: async () => true },
    authRepository: { findAuthorizationContextByUserId: async () => null },
    weatherProvider: {
      getForecast: async () => ({ provider: 'weather-test', current: { temperatureC: 20 } }),
    },
    currencyProvider: {
      getRates: async ({ base }) => ({ provider: 'currency-test', base, rates: [] }),
      convert: async ({ amount, from, to }) => ({
        provider: 'currency-test',
        amount,
        from,
        to,
        convertedAmount: amount,
      }),
    },
    placesProvider: {
      autocomplete: async () => ({ provider: 'places-test', results: [] }),
      searchNearby: async ({ categoryGroup }) => ({
        provider: 'places-test',
        categoryGroup,
        results: [{ externalId: `${categoryGroup}-1`, name: categoryGroup }],
      }),
    },
    destinationImageProvider: {
      searchPhotos: async () => ({
        provider: 'images-test',
        photos: [{ externalId: 'photo-1' }],
      }),
    },
    translationProvider: {
      translate: async ({ text }) => ({ provider: 'translation-test', translatedText: text }),
      getLanguages: async () => ({ provider: 'translation-test', languages: [] }),
    },
    accommodationProvider: {
      searchNearby: async () => ({ provider: 'accommodation-test', results: [] }),
    },
    eventsProvider: { searchEvents: async () => ({ provider: 'events-test', events: [] }) },
    newsProvider: { searchNews: async () => ({ provider: 'news-test', articles: [] }) },
    imageProvider: {
      searchPhotos: async () => ({ provider: 'images-test', photos: [] }),
    },
    ...overrides,
  };
}

describe('destination overview route', () => {
  it('returns independent overview sections for a normalized destination', async () => {
    const app = await buildApp(appOptions());
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/destinations/overview?name=Stockholm&countryCode=se&latitude=59.3293&longitude=18.0686&language=en',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('max-age=120');
    expect(response.json().overview).toMatchObject({
      destination: {
        name: 'Stockholm',
        countryCode: 'SE',
        latitude: 59.3293,
        longitude: 18.0686,
      },
      sections: {
        weather: { status: 'AVAILABLE' },
        attractions: { status: 'AVAILABLE' },
        restaurants: { status: 'AVAILABLE' },
        images: { status: 'AVAILABLE' },
      },
    });
  });

  it('rejects invalid coordinates before calling overview providers', async () => {
    const getForecast = vi.fn(async () => ({ provider: 'weather-test' }));
    const app = await buildApp(
      appOptions({
        destinationWeatherProvider: { getForecast },
      }),
    );
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/destinations/overview?name=Stockholm&countryCode=SE&latitude=200&longitude=18.0686&language=en',
    });

    expect(response.statusCode).toBe(400);
    expect(getForecast).not.toHaveBeenCalled();
  });
});
