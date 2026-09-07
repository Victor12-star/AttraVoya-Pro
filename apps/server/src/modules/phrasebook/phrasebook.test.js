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

function createTranslationProvider(targets = ['sv', 'es']) {
  return {
    name: 'test-translation',
    async getLanguages() {
      return {
        provider: 'test-translation',
        fetchedAt: '2026-09-07T20:00:00.000Z',
        languages: [
          { code: 'en', name: 'English', targets },
          { code: 'sv', name: 'Swedish', targets: ['en'] },
          { code: 'es', name: 'Spanish', targets: ['en'] },
          { code: 'ja', name: 'Japanese', targets: ['en'] },
        ],
      };
    },
    async translate() {
      throw new Error('translate is not used by the phrasebook catalog test');
    },
  };
}

function createPhrasebookRepository() {
  const countries = {
    SE: {
      iso2: 'SE',
      name: 'Sweden',
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
          },
        },
      ],
    },
    JP: {
      iso2: 'JP',
      name: 'Japan',
      languages: [
        {
          isOfficial: true,
          isCommon: true,
          rank: 1,
          language: {
            code: 'ja',
            name: 'Japanese',
            nativeName: '日本語',
            direction: 'ltr',
          },
        },
      ],
    },
  };

  return {
    async findCountryByIso2(countryCode) {
      return countries[countryCode] ?? null;
    },
  };
}

async function createApp(translationProvider) {
  const app = await buildApp({
    logger: false,
    translationProvider,
    phrasebookRepository: createPhrasebookRepository(),
    countriesRepository: { list: async () => [] },
    languagesRepository: { list: async () => [] },
    healthRepository: { checkDatabase: async () => true },
    authRepository: { findAuthorizationContextByUserId: async () => null },
  });
  apps.push(app);
  return app;
}

describe('travel phrasebook endpoint', () => {
  it('defaults to English and suggests supported destination languages', async () => {
    const app = await createApp(createTranslationProvider());
    const response = await app.inject({ method: 'GET', url: '/api/v1/phrasebook?countryCode=SE' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('max-age=3600');

    const { phrasebook } = response.json();
    expect(phrasebook.sourceLanguage.code).toBe('en');
    expect(phrasebook.destination).toMatchObject({
      countryCode: 'SE',
      countryName: 'Sweden',
      knownCountry: true,
      preferredTargetLanguage: 'sv',
    });
    expect(phrasebook.destination.languages).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'sv', available: true })]),
    );
    expect(phrasebook.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'greetings' }),
        expect.objectContaining({ id: 'emergency' }),
        expect.objectContaining({ id: 'medical' }),
      ]),
    );
  });

  it('does not claim an unavailable destination language is translatable', async () => {
    const app = await createApp(createTranslationProvider(['sv']));
    const response = await app.inject({ method: 'GET', url: '/api/v1/phrasebook?countryCode=JP' });

    expect(response.statusCode).toBe(200);
    const { destination } = response.json().phrasebook;
    expect(destination.preferredTargetLanguage).toBeNull();
    expect(destination.languages).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'ja', available: false })]),
    );
  });

  it('rejects malformed country codes at the API boundary', async () => {
    const app = await createApp(createTranslationProvider());
    const response = await app.inject({ method: 'GET', url: '/api/v1/phrasebook?countryCode=SWE' });

    expect(response.statusCode).toBe(400);
  });
});
