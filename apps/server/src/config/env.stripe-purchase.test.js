import { PLANS } from '@attravoya/constants';
import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.WEB_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.API_URL = 'http://localhost:5000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
process.env.COOKIE_SECRET = 'b'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'c'.repeat(64);

const { loadEnvironment, stripePurchasePriceIdsFromEnvironment } = await import('./env.js');

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

describe('Stripe purchase environment contract', () => {
  it('keeps purchase creation disabled and unconfigured by default', () => {
    const environment = loadEnvironment(baseEnvironment());

    expect(environment.STRIPE_PURCHASE_ENABLED).toBe(false);
    expect(environment.STRIPE_SECRET_KEY).toBeUndefined();
    expect(environment.STRIPE_PRO_MONTHLY_PRICE_ID).toBeUndefined();
    expect(environment.STRIPE_PRO_YEARLY_PRICE_ID).toBeUndefined();
    expect(stripePurchasePriceIdsFromEnvironment(environment)).toEqual({});
  });

  it('treats blank disabled purchase values as unconfigured', () => {
    const environment = loadEnvironment(
      baseEnvironment({
        STRIPE_PURCHASE_ENABLED: 'false',
        STRIPE_SECRET_KEY: '   ',
        STRIPE_PRO_MONTHLY_PRICE_ID: '   ',
        STRIPE_PRO_YEARLY_PRICE_ID: '   ',
      }),
    );

    expect(environment.STRIPE_PURCHASE_ENABLED).toBe(false);
    expect(environment.STRIPE_SECRET_KEY).toBeUndefined();
    expect(environment.STRIPE_PRO_MONTHLY_PRICE_ID).toBeUndefined();
    expect(environment.STRIPE_PRO_YEARLY_PRICE_ID).toBeUndefined();
  });

  it('fails startup when purchase creation is enabled without complete server configuration', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          STRIPE_PURCHASE_ENABLED: 'true',
        }),
      ),
    ).toThrow(/STRIPE_SECRET_KEY, STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_YEARLY_PRICE_ID/);

    expect(() =>
      loadEnvironment(
        baseEnvironment({
          STRIPE_PURCHASE_ENABLED: 'true',
          STRIPE_SECRET_KEY: 'sk_test_example_only_1234567890',
          STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly123',
        }),
      ),
    ).toThrow(/STRIPE_PRO_YEARLY_PRICE_ID/);
  });

  it('rejects malformed or duplicated Stripe Price IDs', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          STRIPE_PURCHASE_ENABLED: 'true',
          STRIPE_SECRET_KEY: 'sk_test_example_only_1234567890',
          STRIPE_PRO_MONTHLY_PRICE_ID: 'monthly-price',
          STRIPE_PRO_YEARLY_PRICE_ID: 'price_yearly123',
        }),
      ),
    ).toThrow(/STRIPE_PRO_MONTHLY_PRICE_ID/);

    expect(() =>
      loadEnvironment(
        baseEnvironment({
          STRIPE_PURCHASE_ENABLED: 'true',
          STRIPE_SECRET_KEY: 'sk_test_example_only_1234567890',
          STRIPE_PRO_MONTHLY_PRICE_ID: 'price_same123',
          STRIPE_PRO_YEARLY_PRICE_ID: 'price_same123',
        }),
      ),
    ).toThrow(/STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_YEARLY_PRICE_ID must be different/);
  });

  it('maps only the two authoritative Pro plans to server-owned Stripe Price IDs', () => {
    const environment = loadEnvironment(
      baseEnvironment({
        STRIPE_PURCHASE_ENABLED: 'true',
        STRIPE_SECRET_KEY: 'sk_test_example_only_1234567890',
        STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly123',
        STRIPE_PRO_YEARLY_PRICE_ID: 'price_yearly456',
        STRIPE_WEBHOOK_ENABLED: 'true',
        STRIPE_WEBHOOK_SECRET: 'whsec_example_only_1234567890',
      }),
    );

    const prices = stripePurchasePriceIdsFromEnvironment(environment);

    expect(prices).toEqual({
      [PLANS.PRO_MONTHLY]: 'price_monthly123',
      [PLANS.PRO_YEARLY]: 'price_yearly456',
    });
    expect(prices[PLANS.FREE]).toBeUndefined();
    expect(prices[PLANS.PREMIUM]).toBeUndefined();
    expect(Object.isFrozen(prices)).toBe(true);
  });
});
