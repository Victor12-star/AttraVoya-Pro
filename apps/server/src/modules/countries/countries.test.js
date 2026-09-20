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
const { MAX_PUBLIC_COUNTRY_RECORDS } = await import('./countries.contracts.js');
const { createCountriesRepository } = await import('./countries.repository.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function appOptions(countriesRepository) {
  return {
    logger: false,
    countriesRepository,
    languagesRepository: { list: async () => [] },
    healthRepository: { checkDatabase: async () => true },
    authRepository: {
      findAuthorizationContextByUserId: async () => null,
    },
  };
}

function countryRecord(index = 0) {
  return {
    id: `country-${String(index).padStart(3, '0')}`,
    iso2: String(index).padStart(2, '0'),
    iso3: `Q${String(index).padStart(2, '0')}`,
    name: `Country ${index}`,
    callingCode: null,
    region: 'Test region',
    subregion: 'Test subregion',
    defaultTimeZone: null,
    languages: [],
    currencies: [],
  };
}

describe('countries repository', () => {
  it('bounds the normal query and uses deterministic ordering', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createCountriesRepository({
      country: { findMany },
    });

    await repository.list();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: MAX_PUBLIC_COUNTRY_RECORDS,
        orderBy: [{ name: 'asc' }, { iso2: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('preserves smaller internal limits and caps oversized ones', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createCountriesRepository({
      country: { findMany },
    });

    await repository.list({ limit: 20 });
    await repository.list({ limit: MAX_PUBLIC_COUNTRY_RECORDS + 1 });

    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ take: 20 }));
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ take: MAX_PUBLIC_COUNTRY_RECORDS }),
    );
  });
});

describe('country reference endpoint', () => {
  it('returns cacheable country data without requiring authentication', async () => {
    const app = await buildApp(
      appOptions({
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
      }),
    );
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

  it('caps records when an injected repository over-returns', async () => {
    const records = Array.from({ length: MAX_PUBLIC_COUNTRY_RECORDS + 8 }, (_, index) =>
      countryRecord(index),
    );
    const app = await buildApp(
      appOptions({
        list: async () => records,
      }),
    );
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/countries' });

    expect(response.statusCode).toBe(200);
    const responseCountries = response.json().countries;
    expect(responseCountries).toHaveLength(MAX_PUBLIC_COUNTRY_RECORDS);
    expect(responseCountries[0].id).toBe('country-000');
    expect(responseCountries.at(-1).id).toBe(
      `country-${String(MAX_PUBLIC_COUNTRY_RECORDS - 1).padStart(3, '0')}`,
    );
  });

  it('returns a safe empty list when an injected repository returns malformed data', async () => {
    const app = await buildApp(
      appOptions({
        list: async () => null,
      }),
    );
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/countries' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ countries: [] });
  });
});
