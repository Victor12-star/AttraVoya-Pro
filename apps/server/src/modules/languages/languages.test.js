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

describe('language reference endpoint', () => {
  it('returns UI support and direction metadata', async () => {
    const app = await buildApp({
      logger: false,
      countriesRepository: { list: async () => [] },
      languagesRepository: {
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
      },
      healthRepository: { checkDatabase: async () => true },
      authRepository: {
        findAuthorizationContextByUserId: async () => null,
      },
    });
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
});
