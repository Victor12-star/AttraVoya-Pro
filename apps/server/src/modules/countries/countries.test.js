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
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('country reference endpoint', () => {
  it('returns cacheable country data without requiring authentication', async () => {
    const app = await buildApp({
      logger: false,
      countriesRepository: {
        list: async () => [
          {
            id: 'country-se',
            iso2: 'SE',
            iso3: 'SWE',
            name: 'Sweden',
            callingCode: null,
            region: 'Europe',
            subregion: 'Northern Europe',
            defaultTimeZone: 'Europe/Stockholm',
            languages: [
              {
                isOfficial: true,
                isCommon: true,
                rank: 1,
                language: {
                  code: 'sv',
                  name: 'Swedish',
                  nativeName: 'svenska',
                  direction: 'ltr',
                  isUiSupported: true,
                },
              },
            ],
            currencies: [
              {
                isPrimary: true,
                currency: {
                  code: 'SEK',
                  name: 'Swedish Krona',
                  symbol: 'kr',
                  decimalDigits: 2,
                },
              },
            ],
          },
        ],
      },
      languagesRepository: { list: async () => [] },
      healthRepository: { checkDatabase: async () => true },
      authRepository: {
        findAuthenticatedUser: async () => null,
      },
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/countries' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('max-age=3600');
    expect(response.json().countries[0]).toMatchObject({
      iso2: 'SE',
      currencies: [{ code: 'SEK', isPrimary: true }],
      languages: [{ code: 'sv', isOfficial: true }],
    });
  });
});
