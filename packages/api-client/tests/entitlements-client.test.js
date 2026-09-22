import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index.js';

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('entitlements API client', () => {
  it('reads current access without allowing browser caching', async () => {
    const payload = {
      access: {
        plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
        entitlements: [],
        limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
        subscription: null,
      },
    };
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe('http://localhost:5000/api/v1/entitlements/me');
      expect(options.method).toBe('GET');
      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');
      return jsonResponse(payload);
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(client.getMyEntitlements()).resolves.toEqual(payload);
  });
});
