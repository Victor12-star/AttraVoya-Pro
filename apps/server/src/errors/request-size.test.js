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
process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
process.env.COOKIE_SECRET = 'c'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);

const { buildApp } = await import('../app.js');
const { DEFAULT_BODY_LIMIT_BYTES } = await import('../config/constants.js');

const apps = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('API request body backpressure', () => {
  it('rejects oversized JSON before provider work runs', async () => {
    let providerCalls = 0;
    const app = await buildApp({
      logger: false,
      translationProvider: {
        async translate() {
          providerCalls += 1;
          return { translatedText: 'unused' };
        },
        async getLanguages() {
          return [];
        },
      },
    });
    apps.push(app);

    const oversizedPayload = JSON.stringify({
      text: 'x'.repeat(DEFAULT_BODY_LIMIT_BYTES),
      source: 'auto',
      target: 'sv',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translation',
      headers: { 'content-type': 'application/json' },
      payload: oversizedPayload,
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: 'The request body is too large.',
      },
    });
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(providerCalls).toBe(0);
  });
});
