import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.WEB_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.API_URL = 'http://localhost:5000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
process.env.COOKIE_SECRET = 'b'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'c'.repeat(64);

const { loadEnvironment } = await import('./env.js');

function productionEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    WEB_URL: 'https://app.attravoya.app',
    ADMIN_URL: 'https://admin.attravoya.app',
    API_URL: 'https://api.attravoya.app',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    COOKIE_SECRET: 'b'.repeat(64),
    DATA_ENCRYPTION_KEY: 'c'.repeat(64),
    MAPS_PROVIDER: 'none',
    PLACES_PROVIDER: 'none',
    ACCOMMODATION_PROVIDER: 'none',
    EVENTS_PROVIDER: 'none',
    NEWS_PROVIDER: 'none',
    IMAGE_PROVIDER: 'none',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 'placeholder-resend-key',
    EMAIL_FROM: 'noreply@attravoya.app',
    RESEND_REQUEST_BUDGET_MAX: '1000',
    RESEND_REQUEST_BUDGET_WINDOW_SECONDS: '2592000',
    ...overrides,
  };
}

describe('production public origin contract', () => {
  it('accepts non-placeholder HTTPS origins', () => {
    const environment = loadEnvironment(productionEnvironment());

    expect(environment.WEB_URL).toBe('https://app.attravoya.app');
    expect(environment.ADMIN_URL).toBe('https://admin.attravoya.app');
    expect(environment.API_URL).toBe('https://api.attravoya.app');
  });

  it('rejects insecure, local, reserved, credential-bearing, and non-origin URLs', () => {
    const invalidUrls = [
      'http://app.attravoya.app',
      'https://localhost:3000',
      'https://127.0.0.1:3000',
      'https://app.attravoya.example',
      'https://app.attravoya.test',
      'https://app.attravoya.invalid',
      'https://example.com',
      'https://user:password@app.attravoya.app',
      'https://app.attravoya.app/path',
      'https://app.attravoya.app?source=test',
      'https://app.attravoya.app#fragment',
    ];

    for (const field of ['WEB_URL', 'ADMIN_URL', 'API_URL']) {
      for (const value of invalidUrls) {
        expect(() =>
          loadEnvironment(
            productionEnvironment({
              [field]: value,
            }),
          ),
        ).toThrow(field);
      }
    }
  });

  it('keeps localhost available outside production', () => {
    expect(() =>
      loadEnvironment({
        ...productionEnvironment(),
        NODE_ENV: 'test',
        WEB_URL: 'http://localhost:3000',
        ADMIN_URL: 'http://localhost:3001',
        API_URL: 'http://localhost:5000',
      }),
    ).not.toThrow();
  });
});
