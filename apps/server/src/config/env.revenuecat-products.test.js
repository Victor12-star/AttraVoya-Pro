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

const { loadEnvironment, revenueCatAndroidProductIdsFromEnvironment } = await import('./env.js');

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

describe('RevenueCat Android product environment contract', () => {
  it('keeps product mapping unconfigured by default', () => {
    const environment = loadEnvironment(baseEnvironment());

    expect(environment.REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID).toBeUndefined();
    expect(environment.REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID).toBeUndefined();
    expect(revenueCatAndroidProductIdsFromEnvironment(environment)).toEqual({});
  });

  it('treats blank product values as unconfigured', () => {
    const environment = loadEnvironment(
      baseEnvironment({
        REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID: '   ',
        REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID: '   ',
      }),
    );

    expect(revenueCatAndroidProductIdsFromEnvironment(environment)).toEqual({});
  });

  it('requires both Pro product identifiers together and rejects duplicates', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID: 'attravoya_pro_v1:monthly-autorenewing',
        }),
      ),
    ).toThrow(
      /REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID and REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID must be configured together/,
    );

    expect(() =>
      loadEnvironment(
        baseEnvironment({
          REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID: 'attravoya_pro_v1:monthly-autorenewing',
          REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID: 'attravoya_pro_v1:monthly-autorenewing',
        }),
      ),
    ).toThrow(
      /REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID and REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID must be different/,
    );
  });

  it('rejects malformed Google Play product/base-plan identifiers', () => {
    expect(() =>
      loadEnvironment(
        baseEnvironment({
          REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID: 'AttravoyaPro:monthly',
          REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID: 'attravoya_pro_v1:yearly-autorenewing',
        }),
      ),
    ).toThrow(/REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID/);

    expect(() =>
      loadEnvironment(
        baseEnvironment({
          REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID: 'attravoya_pro_v1:monthly-autorenewing',
          REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID: 'attravoya_pro_v1:Yearly',
        }),
      ),
    ).toThrow(/REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID/);
  });

  it('maps only the configured products to the two authoritative internal Pro plans', () => {
    const environment = loadEnvironment(
      baseEnvironment({
        REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID: 'attravoya_pro_v1:monthly-autorenewing',
        REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID: 'attravoya_pro_v1:yearly-autorenewing',
      }),
    );

    const configured = revenueCatAndroidProductIdsFromEnvironment(environment);

    expect(configured).toEqual({
      [PLANS.PRO_MONTHLY]: 'attravoya_pro_v1:monthly-autorenewing',
      [PLANS.PRO_YEARLY]: 'attravoya_pro_v1:yearly-autorenewing',
    });
    expect(configured[PLANS.FREE]).toBeUndefined();
    expect(configured[PLANS.PREMIUM]).toBeUndefined();
    expect(Object.isFrozen(configured)).toBe(true);
  });
});
