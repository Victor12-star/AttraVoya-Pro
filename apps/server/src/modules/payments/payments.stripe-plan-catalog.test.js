import { PLANS } from '@attravoya/constants';
import { describe, expect, it, vi } from 'vitest';

import { createStripePlanCatalogService } from './payments.stripe-plan-catalog.js';

function stripePrice({ id, interval, amount, currency = 'sek', active = true }) {
  return {
    id,
    object: 'price',
    active,
    type: 'recurring',
    billing_scheme: 'per_unit',
    unit_amount: amount,
    currency,
    recurring: {
      interval,
      interval_count: 1,
      usage_type: 'licensed',
    },
  };
}

function priceIds() {
  return {
    [PLANS.PRO_MONTHLY]: 'price_monthly_server',
    [PLANS.PRO_YEARLY]: 'price_yearly_server',
  };
}

describe('Stripe plan catalog', () => {
  it('returns only safe display pricing for the configured monthly and yearly plans', async () => {
    const requestJson = vi.fn(async (url, options) => {
      expect(options.headers.Authorization).toBe('Bearer stripe-secret-placeholder-123456');
      return url.endsWith('price_monthly_server')
        ? stripePrice({ id: 'price_monthly_server', interval: 'month', amount: 12900 })
        : stripePrice({ id: 'price_yearly_server', interval: 'year', amount: 129000 });
    });
    const service = createStripePlanCatalogService({
      secretKey: 'stripe-secret-placeholder-123456',
      priceIds: priceIds(),
      httpClient: { requestJson },
    });

    const result = await service.list();

    expect(result).toEqual({
      plans: [
        {
          planKey: PLANS.PRO_MONTHLY,
          name: 'Pro Monthly',
          unitAmount: 12900,
          currency: 'sek',
          interval: 'month',
        },
        {
          planKey: PLANS.PRO_YEARLY,
          name: 'Pro Yearly',
          unitAmount: 129000,
          currency: 'sek',
          interval: 'year',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('price_monthly_server');
    expect(JSON.stringify(result)).not.toContain('stripe-secret-placeholder-123456');
  });

  it('briefly caches validated Stripe price snapshots and coalesces repeated reads', async () => {
    const requestJson = vi.fn(async (url) =>
      url.endsWith('price_monthly_server')
        ? stripePrice({ id: 'price_monthly_server', interval: 'month', amount: 12900 })
        : stripePrice({ id: 'price_yearly_server', interval: 'year', amount: 129000 }),
    );
    const service = createStripePlanCatalogService({
      secretKey: 'stripe-secret-placeholder-123456',
      priceIds: priceIds(),
      httpClient: { requestJson },
    });

    await service.list();
    await service.list();

    expect(requestJson).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['inactive', { active: false }],
    ['wrong interval', { interval: 'year' }],
    ['zero amount', { amount: 0 }],
    ['wrong identity', { id: 'price_other' }],
  ])('fails closed for %s Stripe price state', async (_label, override) => {
    const requestJson = vi.fn(async (url) => {
      if (url.endsWith('price_monthly_server')) {
        return stripePrice({
          id: 'price_monthly_server',
          interval: 'month',
          amount: 12900,
          ...override,
        });
      }
      return stripePrice({ id: 'price_yearly_server', interval: 'year', amount: 129000 });
    });
    const service = createStripePlanCatalogService({
      secretKey: 'stripe-secret-placeholder-123456',
      priceIds: priceIds(),
      httpClient: { requestJson },
    });

    await expect(service.list()).rejects.toMatchObject({
      statusCode: 502,
      code: 'PROVIDER_RESPONSE_ERROR',
    });
  });

  it('rejects incomplete or non-Stripe server Price configuration before provider work', () => {
    expect(() =>
      createStripePlanCatalogService({
        secretKey: 'stripe-secret-placeholder-123456',
        priceIds: {
          [PLANS.PRO_MONTHLY]: 'not-a-price',
          [PLANS.PRO_YEARLY]: 'price_yearly_server',
        },
        httpClient: { requestJson: vi.fn() },
      }),
    ).toThrow('Stripe Price configuration is invalid.');
  });
});
