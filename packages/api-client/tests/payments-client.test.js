import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index.js';

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('payments API client', () => {
  it('reads server-owned checkout availability without browser caching', async () => {
    const payload = {
      available: true,
      planKeys: ['PRO_MONTHLY', 'PRO_YEARLY'],
    };
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/payments/checkout/availability');
      expect(options.method).toBe('GET');
      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');
      return jsonResponse(payload);
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.getStripeCheckoutAvailability()).resolves.toEqual(payload);
  });

  it('reads the server-authoritative Stripe display catalog without browser caching', async () => {
    const payload = {
      plans: [
        {
          planKey: 'PRO_MONTHLY',
          name: 'Pro Monthly',
          unitAmount: 12900,
          currency: 'sek',
          interval: 'month',
        },
        {
          planKey: 'PRO_YEARLY',
          name: 'Pro Yearly',
          unitAmount: 129000,
          currency: 'sek',
          interval: 'year',
        },
      ],
    };
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/payments/checkout/stripe/plans');
      expect(options.method).toBe('GET');
      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');
      return jsonResponse(payload);
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.getStripePlanCatalog()).resolves.toEqual(payload);
  });

  it('creates checkout using only a supported internal Pro plan key', async () => {
    const payload = { checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_example' };
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/payments/checkout/stripe');
      expect(options.method).toBe('POST');
      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');
      expect(JSON.parse(options.body)).toEqual({ planKey: 'PRO_MONTHLY' });
      return jsonResponse(payload);
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.createStripeCheckout(' PRO_MONTHLY ')).resolves.toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported checkout plan keys before a request is sent', async () => {
    const fetchImpl = vi.fn();
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    expect(() => client.createStripeCheckout('FREE')).toThrow(
      'Stripe checkout supports only PRO_MONTHLY or PRO_YEARLY.',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
