import { PLANS } from '@attravoya/constants';
import { describe, expect, it } from 'vitest';

import { createStripeCheckoutPolicy } from './payments.stripe-checkout-policy.js';

function environment(overrides = {}) {
  return {
    STRIPE_PURCHASE_ENABLED: true,
    STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly123',
    STRIPE_PRO_YEARLY_PRICE_ID: 'price_yearly456',
    WEB_URL: 'https://app.example.test',
    ...overrides,
  };
}

describe('server-owned Stripe checkout policy', () => {
  it('resolves recognized Pro plans to server-owned prices and return URLs', () => {
    const policy = createStripeCheckoutPolicy(environment());

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
    const policy = createStripeCheckoutPolicy(environment());

    for (const planKey of [PLANS.FREE, PLANS.PREMIUM, 'UNKNOWN']) {
      expect(() => policy.resolve(planKey)).toThrow('Selected subscription plan is not available.');
    }
  });

  it('does not let caller-supplied Stripe identifiers override server configuration', () => {
    const policy = createStripeCheckoutPolicy(environment());

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
      environment({
        STRIPE_PURCHASE_ENABLED: false,
        STRIPE_PRO_MONTHLY_PRICE_ID: undefined,
        STRIPE_PRO_YEARLY_PRICE_ID: undefined,
      }),
    );

    expect(() => disabled.resolve(PLANS.PRO_MONTHLY)).toThrow(
      'Subscription purchase is not available.',
    );

    const incomplete = createStripeCheckoutPolicy(
      environment({
        STRIPE_PRO_MONTHLY_PRICE_ID: undefined,
      }),
    );

    expect(() => incomplete.resolve(PLANS.PRO_MONTHLY)).toThrow(
      'Subscription purchase is not configured.',
    );
  });
});
