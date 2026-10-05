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
    RESEND_API_KEY: 'resend-test-key',
    EMAIL_FROM: 'AttraVoya Pro <noreply@attravoya.app>',
    RESEND_REQUEST_BUDGET_MAX: '100',
    RESEND_REQUEST_BUDGET_WINDOW_SECONDS: '86400',
    ...overrides,
  };
}

describe('production provider credential contract', () => {
  it.each([
    ['MAPS_PROVIDER', 'geoapify', 'GEOAPIFY_API_KEY'],
    ['EVENTS_PROVIDER', 'ticketmaster', 'TICKETMASTER_API_KEY'],
    ['NEWS_PROVIDER', 'newsdata', 'NEWSDATA_API_KEY'],
    ['IMAGE_PROVIDER', 'pexels', 'PEXELS_API_KEY'],
  ])('requires %s credential when %s is selected', (providerField, provider, credential) => {
    expect(() =>
      loadEnvironment(
        productionEnvironment({
          [providerField]: provider,
        }),
      ),
    ).toThrow(credential);
  });

  it('accepts selected production providers only with credentials and explicit budgets', () => {
    const environment = loadEnvironment(
      productionEnvironment({
        MAPS_PROVIDER: 'geoapify',
        EVENTS_PROVIDER: 'ticketmaster',
        NEWS_PROVIDER: 'newsdata',
        IMAGE_PROVIDER: 'pexels',
        GEOAPIFY_API_KEY: 'geoapify-test-key',
        TICKETMASTER_API_KEY: 'ticketmaster-test-key',
        NEWSDATA_API_KEY: 'newsdata-test-key',
        PEXELS_API_KEY: 'pexels-test-key',
        GEOAPIFY_REQUEST_BUDGET_MAX: '1000',
        GEOAPIFY_REQUEST_BUDGET_WINDOW_SECONDS: '86400',
        TICKETMASTER_REQUEST_BUDGET_MAX: '500',
        TICKETMASTER_REQUEST_BUDGET_WINDOW_SECONDS: '86400',
        NEWSDATA_REQUEST_BUDGET_MAX: '200',
        NEWSDATA_REQUEST_BUDGET_WINDOW_SECONDS: '86400',
        PEXELS_REQUEST_BUDGET_MAX: '400',
        PEXELS_REQUEST_BUDGET_WINDOW_SECONDS: '86400',
      }),
    );

    expect(environment).toMatchObject({
      GEOAPIFY_API_KEY: 'geoapify-test-key',
      TICKETMASTER_API_KEY: 'ticketmaster-test-key',
      NEWSDATA_API_KEY: 'newsdata-test-key',
      PEXELS_API_KEY: 'pexels-test-key',
    });
  });

  it('keeps credential enforcement production-only', () => {
    expect(() =>
      loadEnvironment({
        ...productionEnvironment(),
        NODE_ENV: 'test',
        MAPS_PROVIDER: 'geoapify',
        GEOAPIFY_API_KEY: '',
      }),
    ).not.toThrow();
  });
});
