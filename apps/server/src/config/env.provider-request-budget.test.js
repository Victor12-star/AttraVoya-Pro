import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.WEB_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.API_URL = 'http://localhost:5000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
process.env.COOKIE_SECRET = 'b'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'c'.repeat(64);

const { loadEnvironment, providerRequestBudgetPoliciesFromEnvironment } = await import('./env.js');

function baseEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'test',
    WEB_URL: 'https://app.example.test',
    ADMIN_URL: 'https://admin.example.test',
    API_URL: 'https://api.example.test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    COOKIE_SECRET: 'b'.repeat(64),
    DATA_ENCRYPTION_KEY: 'c'.repeat(64),
    ...overrides,
  };
}

function productionEnvironment(overrides = {}) {
  return baseEnvironment({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 'resend-test-key',
    EMAIL_FROM: 'AttraVoya Pro <noreply@example.test>',
    RESEND_REQUEST_BUDGET_MAX: '100',
    RESEND_REQUEST_BUDGET_WINDOW_SECONDS: '86400',
    ...overrides,
  });
}

describe('provider request budget environment', () => {
  it('allows non-production credential configuration without a request budget', () => {
    const environment = loadEnvironment(baseEnvironment({ GEOAPIFY_API_KEY: 'geoapify-test-key' }));

    expect(environment.GEOAPIFY_REQUEST_BUDGET_MAX).toBeUndefined();
  });

  it('requires both halves of a configured budget in every environment', () => {
    expect(() => loadEnvironment(baseEnvironment({ PEXELS_REQUEST_BUDGET_MAX: '50' }))).toThrow(
      /PEXELS_REQUEST_BUDGET_MAX and PEXELS_REQUEST_BUDGET_WINDOW_SECONDS/,
    );
  });

  it('fails closed when a credentialed production provider lacks an explicit budget', () => {
    expect(() =>
      loadEnvironment(
        productionEnvironment({
          GEOAPIFY_API_KEY: 'geoapify-test-key',
        }),
      ),
    ).toThrow(/GEOAPIFY_REQUEST_BUDGET_MAX and GEOAPIFY_REQUEST_BUDGET_WINDOW_SECONDS/);
  });

  it('accepts explicit production budgets and builds normalized runtime policies', () => {
    const environment = loadEnvironment(
      productionEnvironment({
        GEOAPIFY_API_KEY: 'geoapify-test-key',
        GEOAPIFY_REQUEST_BUDGET_MAX: '1000',
        GEOAPIFY_REQUEST_BUDGET_WINDOW_SECONDS: '86400',
        TICKETMASTER_API_KEY: 'ticketmaster-test-key',
        TICKETMASTER_REQUEST_BUDGET_MAX: '500',
        TICKETMASTER_REQUEST_BUDGET_WINDOW_SECONDS: '3600',
      }),
    );

    expect(providerRequestBudgetPoliciesFromEnvironment(environment)).toMatchObject({
      geoapify: { maxRequests: 1000, windowMs: 86_400_000 },
      ticketmaster: { maxRequests: 500, windowMs: 3_600_000 },
      resend: { maxRequests: 100, windowMs: 86_400_000 },
    });
  });

  it('requires an explicit budget for production Resend email', () => {
    const source = productionEnvironment({
      RESEND_REQUEST_BUDGET_MAX: '',
      RESEND_REQUEST_BUDGET_WINDOW_SECONDS: '',
    });

    expect(() => loadEnvironment(source)).toThrow(
      /RESEND_REQUEST_BUDGET_MAX and RESEND_REQUEST_BUDGET_WINDOW_SECONDS/,
    );
  });
});
