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
});
