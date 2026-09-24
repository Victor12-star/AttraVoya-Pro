import { PLANS } from '@attravoya/constants';
import { describe, expect, it } from 'vitest';

import { createRevenueCatAndroidProductPolicy } from './payments.revenuecat-product-policy.js';

function productIds(overrides = {}) {
  return {
    [PLANS.PRO_MONTHLY]: 'attravoya_pro_v1:monthly-autorenewing',
    [PLANS.PRO_YEARLY]: 'attravoya_pro_v1:yearly-autorenewing',
    ...overrides,
  };
}

describe('RevenueCat Android product policy', () => {
  it('maps only the two server-owned Google Play products to internal Pro plans', () => {
    const policy = createRevenueCatAndroidProductPolicy({
      productIds: productIds(),
    });

    expect(policy.resolvePlanKey('attravoya_pro_v1:monthly-autorenewing')).toBe(PLANS.PRO_MONTHLY);
    expect(policy.resolvePlanKey('attravoya_pro_v1:yearly-autorenewing')).toBe(PLANS.PRO_YEARLY);
    expect(Object.isFrozen(policy)).toBe(true);
  });

  it('fails closed for unknown or client-shaped product identifiers', () => {
    const policy = createRevenueCatAndroidProductPolicy({
      productIds: productIds(),
    });

    expect(() => policy.resolvePlanKey('attravoya_pro_v1:weekly-autorenewing')).toThrow(
      'RevenueCat product is not supported.',
    );
    expect(() => policy.resolvePlanKey(' PRO_MONTHLY ')).toThrow(
      'RevenueCat product identifier is invalid.',
    );
    expect(() => policy.resolvePlanKey(null)).toThrow('RevenueCat product identifier is invalid.');
  });

  it('rejects malformed Google Play subscription/base-plan configuration', () => {
    expect(() =>
      createRevenueCatAndroidProductPolicy({
        productIds: productIds({
          [PLANS.PRO_MONTHLY]: 'AttravoyaPro:monthly',
        }),
      }),
    ).toThrow('PRO_MONTHLY RevenueCat product identifier is invalid.');

    expect(() =>
      createRevenueCatAndroidProductPolicy({
        productIds: productIds({
          [PLANS.PRO_MONTHLY]: 'android.test.subscription:monthly',
        }),
      }),
    ).toThrow('PRO_MONTHLY RevenueCat product identifier is invalid.');

    expect(() =>
      createRevenueCatAndroidProductPolicy({
        productIds: productIds({
          [PLANS.PRO_MONTHLY]: 'attravoya_pro_v1:Monthly',
        }),
      }),
    ).toThrow('PRO_MONTHLY RevenueCat product identifier is invalid.');
  });

  it('requires complete distinct server-owned product configuration', () => {
    expect(() =>
      createRevenueCatAndroidProductPolicy({
        productIds: {
          [PLANS.PRO_MONTHLY]: 'attravoya_pro_v1:monthly-autorenewing',
        },
      }),
    ).toThrow('PRO_YEARLY RevenueCat product identifier is required.');

    expect(() =>
      createRevenueCatAndroidProductPolicy({
        productIds: productIds({
          [PLANS.PRO_YEARLY]: 'attravoya_pro_v1:monthly-autorenewing',
        }),
      }),
    ).toThrow('RevenueCat Android products must use distinct identifiers.');
  });
});
