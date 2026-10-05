import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.WEB_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.API_URL = 'http://localhost:5000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
process.env.COOKIE_SECRET = 'b'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'c'.repeat(64);

const { loadEnvironment, stripeCheckoutReturnUrlsFromEnvironment } = await import('./env.js');

function checkoutEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'test',
    WEB_URL: 'https://app.attravoya.app',
    ADMIN_URL: 'https://admin.attravoya.app',
    API_URL: 'https://api.attravoya.app',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    COOKIE_SECRET: 'b'.repeat(64),
    DATA_ENCRYPTION_KEY: 'c'.repeat(64),
    STRIPE_PURCHASE_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'sk_test_example_only_1234567890',
    STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly123',
    STRIPE_PRO_YEARLY_PRICE_ID: 'price_yearly456',
    STRIPE_WEBHOOK_ENABLED: 'true',
    STRIPE_WEBHOOK_SECRET: 'whsec_example_only_1234567890',
    ...overrides,
  };
}

describe('Stripe checkout return policy', () => {
  it('derives same-origin premium return URLs entirely from server WEB_URL', () => {
    const environment = loadEnvironment(
      checkoutEnvironment({
        WEB_URL: 'https://app.attravoya.app/some/deployment/path?ignored=true#ignored',
      }),
    );

    expect(stripeCheckoutReturnUrlsFromEnvironment(environment)).toEqual({
      successUrl:
        'https://app.attravoya.app/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://app.attravoya.app/premium?checkout=cancelled',
    });
  });

  it('requires the verified webhook path before purchase mode can be enabled', () => {
    expect(() =>
      loadEnvironment(
        checkoutEnvironment({
          STRIPE_WEBHOOK_ENABLED: 'false',
          STRIPE_WEBHOOK_SECRET: '',
        }),
      ),
    ).toThrow(/STRIPE_WEBHOOK_ENABLED=true with STRIPE_WEBHOOK_SECRET/);
  });

  it('rejects insecure production checkout return origins', () => {
    expect(() =>
      loadEnvironment(
        checkoutEnvironment({
          NODE_ENV: 'production',
          WEB_URL: 'http://app.attravoya.app',
          MAPS_PROVIDER: 'none',
          PLACES_PROVIDER: 'none',
          ACCOMMODATION_PROVIDER: 'none',
          EVENTS_PROVIDER: 'none',
          NEWS_PROVIDER: 'none',
          IMAGE_PROVIDER: 'none',
          EMAIL_PROVIDER: 'resend',
          RESEND_API_KEY: 'example-resend-key-1234567890',
          EMAIL_FROM: 'noreply@attravoya.app',
        }),
      ),
    ).toThrow(/WEB_URL: production must use a non-local, non-placeholder HTTPS origin/);
  });

  it('rejects checkout return origins containing embedded credentials', () => {
    expect(() =>
      loadEnvironment(
        checkoutEnvironment({
          WEB_URL: 'https://user:password@app.attravoya.app',
        }),
      ),
    ).toThrow(/WEB_URL must be an HTTP\(S\) origin without embedded credentials/);
  });
});
