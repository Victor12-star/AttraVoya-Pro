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
const { MAX_PUBLIC_LANGUAGE_RECORDS } = await import('./languages.contracts.js');
const { createLanguagesRepository } = await import('./languages.repository.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function appOptions(languagesRepository) {
  return {
    logger: false,
    countriesRepository: { list: async () => [] },
    languagesRepository,
    healthRepository: { checkDatabase: async () => true },
    authRepository: {
      findAuthorizationContextByUserId: async () => null,
    },
  };
}

function languageRecord(index = 0) {
  return {
    id: `lang-${String(index).padStart(3, '0')}`,
    code: `x-${String(index).padStart(3, '0')}`,
    name: `Language ${index}`,
    nativeName: `Language ${index}`,
    direction: 'ltr',
    isUiSupported: false,
  };
}

describe('languages repository', () => {
  it('bounds the query and uses deterministic ordering', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createLanguagesRepository({
      language: { findMany },
    });

    await repository.list();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [
        { isUiSupported: 'desc' },
        { name: 'asc' },
        { code: 'asc' },
        { id: 'asc' },
      ],
      take: MAX_PUBLIC_LANGUAGE_RECORDS,
      select: {
        id: true,
        code: true,
        name: true,
        nativeName: true,
        direction: true,
        isUiSupported: true,
      },
    });
  });
});

describe('language reference endpoint', () => {
  it('returns UI support and direction metadata', async () => {
    const app = await buildApp(
      appOptions({
        list: async () => [
          {
            id: 'lang-ar',
            code: 'ar',
            name: 'Arabic',
            nativeName: 'العربية',
            direction: 'rtl',
            isUiSupported: true,
          },
        ],
      }),
    );
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/languages' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      languages: [
        {
          id: 'lang-ar',
          code: 'ar',
          name: 'Arabic',
          nativeName: 'العربية',
          direction: 'rtl',
          isUiSupported: true,
        },
      ],
    });
  });

  it('caps records when an injected repository over-returns', async () => {
    const records = Array.from(
      { length: MAX_PUBLIC_LANGUAGE_RECORDS + 8 },
      (_, index) => languageRecord(index),
    );
    const app = await buildApp(
      appOptions({
        list: async () => records,
      }),
    );
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/languages' });

    expect(response.statusCode).toBe(200);
    const responseLanguages = response.json().languages;
    expect(responseLanguages).toHaveLength(MAX_PUBLIC_LANGUAGE_RECORDS);
    expect(responseLanguages[0].id).toBe('lang-000');
    expect(responseLanguages.at(-1).id).toBe(
      `lang-${String(MAX_PUBLIC_LANGUAGE_RECORDS - 1).padStart(3, '0')}`,
    );
  });

  it('returns a safe empty list when an injected repository returns malformed data', async () => {
    const app = await buildApp(
      appOptions({
        list: async () => null,
      }),
    );
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/languages' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ languages: [] });
  });
});
