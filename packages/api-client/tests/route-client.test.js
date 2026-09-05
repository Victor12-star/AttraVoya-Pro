import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index.js';

describe('route API client', () => {
  it('builds the provider-neutral route URL without exposing provider credentials', async () => {
    const fetchImpl = vi.fn(async (url) => {
      expect(String(url)).toBe(
        'http://localhost:5000/api/v1/maps/route?startLatitude=59.3293&startLongitude=18.0686&endLatitude=59.3326&endLongitude=18.0649&mode=walk&language=sv',
      );
      return new Response(
        JSON.stringify({
          route: {
            provider: 'geoapify',
            mode: 'walk',
            distanceMeters: 1850,
            durationSeconds: 1320,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchImpl });

    await expect(
      client.getMapRoute({
        startLatitude: 59.3293,
        startLongitude: 18.0686,
        endLatitude: 59.3326,
        endLongitude: 18.0649,
        mode: 'walk',
        language: 'sv',
      }),
    ).resolves.toMatchObject({ route: { provider: 'geoapify', mode: 'walk' } });
  });
});
