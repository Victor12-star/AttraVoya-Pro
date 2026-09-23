import { PLANS } from '@attravoya/constants';
import { describe, expect, it } from 'vitest';

import { createStripeCheckoutPolicy } from './payments.stripe-checkout-policy.js';

function configuration(overrides = {}) {
  return {
    enabled: true,
    priceIds: {
      [PLANS.PRO_MONTHLY]: 'price_monthly123',
      [PLANS.PRO_YEARLY]: 'price_yearly456',
    },
    returnUrls: {
      successUrl:
        'https://app.example.test/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://app.example.test/premium?checkout=cancelled',
    },
    ...overrides,
  };
}

describe('server-owned Stripe checkout policy', () => {
  it('resolves recognized Pro plans to server-owned prices and return URLs', () => {
    const policy = createStripeCheckoutPolicy(configuration());

    expect(policy.resolve(PLANS.PRO_MONTHLY)).toEqual({
      planKey: PLANS.PRO_MONTHLY,
      priceId: 'price_monthly123',
      quantity: 1,
      successUrl:
        'https://app.example.test/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://app.example.test/premium?checkout=cancelled',
    });

    expect(policy.resolve(PLANS.PRO_YEARLY)).toMatchObject({
      planKey: PLANS.PRO_YEARLY,
      priceId: 'price_yearly456',
      quantity: 1,
    });
  });

  it('rejects Free, legacy, and unknown plans before any provider call exists', () => {
    const policy = createStripeCheckoutPolicy(configuration());

    for (const planKey of [PLANS.FREE, PLANS.PREMIUM, 'UNKNOWN']) {
      expect(() => policy.resolve(planKey)).toThrow('Selected subscription plan is not available.');
    }
  });

  it('does not let caller-supplied Stripe identifiers override server configuration', () => {
    const policy = createStripeCheckoutPolicy(configuration());

    const request = {
      planKey: PLANS.PRO_MONTHLY,
      priceId: 'price_attacker',
      customerId: 'cus_attacker',
      subscriptionId: 'sub_attacker',
      successUrl: 'https://attacker.example/success',
      cancelUrl: 'https://attacker.example/cancel',
    };

    expect(policy.resolve(request.planKey)).toEqual({
      planKey: PLANS.PRO_MONTHLY,
      priceId: 'price_monthly123',
      quantity: 1,
      successUrl:
        'https://app.example.test/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://app.example.test/premium?checkout=cancelled',
    });
  });

  it('fails closed while purchase creation is disabled or incomplete', () => {
    const disabled = createStripeCheckoutPolicy(
      configuration({
        enabled: false,
        priceIds: {},
        returnUrls: {},
      }),
    );

    expect(() => disabled.resolve(PLANS.PRO_MONTHLY)).toThrow(
      'Subscription purchase is not available.',
    );

    const incomplete = createStripeCheckoutPolicy(
      configuration({
        priceIds: {
          [PLANS.PRO_YEARLY]: 'price_yearly456',
        },
      }),
    );

    expect(() => incomplete.resolve(PLANS.PRO_MONTHLY)).toThrow(
      'Subscription purchase is not configured.',
    );
  });
});
