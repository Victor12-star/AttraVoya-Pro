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

const products = {
  REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID: 'attravoya_pro_v1:monthly-autorenewing',
  REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID: 'attravoya_pro_v1:yearly-autorenewing',
};

describe('RevenueCat webhook environment contract', () => {
  it('keeps RevenueCat webhook ingress disabled by default', () => {
    const environment = loadEnvironment(baseEnvironment());

    expect(environment.REVENUECAT_WEBHOOK_ENABLED).toBe(false);
    expect(environment.REVENUECAT_WEBHOOK_SIGNING_SECRET).toBeUndefined();
    expect(environment.REVENUECAT_WEBHOOK_TOLERANCE_SECONDS).toBe(300);
  });

  it('treats a blank disabled signing secret as unconfigured', () => {
    const environment = loadEnvironment(
      baseEnvironment({
        REVENUECAT_WEBHOOK_ENABLED: 'false',
        REVENUECAT_WEBHOOK_SIGNING_SECRET: '   ',
      }),
    );

    expect(environment.REVENUECAT_WEBHOOK_ENABLED).toBe(false);
    expect(environment.REVENUECAT_WEBHOOK_SIGNING_SECRET).toBeUndefined();
  });

  it('fails startup when ingress is enabled without its signing secret', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          ...products,
          REVENUECAT_WEBHOOK_ENABLED: 'true',
        }),
      ),
    ).toThrow(/REVENUECAT_WEBHOOK_SIGNING_SECRET: required when REVENUECAT_WEBHOOK_ENABLED=true/);
  });

  it('fails startup when ingress is enabled without authoritative Android product mapping', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          REVENUECAT_WEBHOOK_ENABLED: 'true',
          REVENUECAT_WEBHOOK_SIGNING_SECRET: 'r'.repeat(48),
        }),
      ),
    ).toThrow(/RevenueCat Android product mapping is required/);
  });

  it('accepts explicitly enabled HMAC ingress with bounded tolerance', () => {
    const environment = loadEnvironment(
      baseEnvironment({
        ...products,
        REVENUECAT_WEBHOOK_ENABLED: 'true',
        REVENUECAT_WEBHOOK_SIGNING_SECRET: 'r'.repeat(48),
        REVENUECAT_WEBHOOK_TOLERANCE_SECONDS: '120',
      }),
    );

    expect(environment).toMatchObject({
      REVENUECAT_WEBHOOK_ENABLED: true,
      REVENUECAT_WEBHOOK_SIGNING_SECRET: 'r'.repeat(48),
      REVENUECAT_WEBHOOK_TOLERANCE_SECONDS: 120,
    });
  });

  it('rejects tolerance values beyond the replay-window ceiling', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          ...products,
          REVENUECAT_WEBHOOK_ENABLED: 'true',
          REVENUECAT_WEBHOOK_SIGNING_SECRET: 'r'.repeat(48),
          REVENUECAT_WEBHOOK_TOLERANCE_SECONDS: '901',
        }),
      ),
    ).toThrow(/REVENUECAT_WEBHOOK_TOLERANCE_SECONDS/);
  });
});
