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

describe('Stripe webhook environment contract', () => {
  it('keeps Stripe webhook ingress disabled by default', () => {
    const environment = loadEnvironment(baseEnvironment());

    expect(environment.STRIPE_WEBHOOK_ENABLED).toBe(false);
    expect(environment.STRIPE_WEBHOOK_SECRET).toBeUndefined();
    expect(environment.STRIPE_WEBHOOK_TOLERANCE_SECONDS).toBe(300);
  });

  it('treats a blank disabled webhook secret as unconfigured', () => {
    const environment = loadEnvironment(
      baseEnvironment({
        STRIPE_WEBHOOK_ENABLED: 'false',
        STRIPE_WEBHOOK_SECRET: '   ',
      }),
    );

    expect(environment.STRIPE_WEBHOOK_ENABLED).toBe(false);
    expect(environment.STRIPE_WEBHOOK_SECRET).toBeUndefined();
  });

  it('fails startup when webhook ingress is enabled without a server secret', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          STRIPE_WEBHOOK_ENABLED: 'true',
        }),
      ),
    ).toThrow(/STRIPE_WEBHOOK_SECRET: required when STRIPE_WEBHOOK_ENABLED=true/);
  });

  it('accepts an explicitly enabled webhook with bounded tolerance', () => {
    const environment = loadEnvironment(
      baseEnvironment({
        STRIPE_WEBHOOK_ENABLED: 'true',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_1234567890',
        STRIPE_WEBHOOK_TOLERANCE_SECONDS: '120',
      }),
    );

    expect(environment).toMatchObject({
      STRIPE_WEBHOOK_ENABLED: true,
      STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_1234567890',
      STRIPE_WEBHOOK_TOLERANCE_SECONDS: 120,
    });
  });

  it('rejects tolerance values beyond the configured replay window ceiling', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          STRIPE_WEBHOOK_ENABLED: 'true',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_1234567890',
          STRIPE_WEBHOOK_TOLERANCE_SECONDS: '901',
        }),
      ),
    ).toThrow(/STRIPE_WEBHOOK_TOLERANCE_SECONDS/);
  });
});
