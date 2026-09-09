import { describe, expect, it, vi } from 'vitest';

import { createGeoapifyPlacesProvider } from './geoapify-places-provider.js';

function createProvider(responses) {
  const requestJson = vi.fn();
  for (const response of responses) requestJson.mockResolvedValueOnce(response);
  return {
    provider: createGeoapifyPlacesProvider({
      http: { requestJson },
      apiKey: 'test-key',
      cache: null,
    }),
    requestJson,
  };
}

describe('Geoapify consular mission discovery', () => {
  it('searches an embassy category inside the host-country boundary and never marks directory data official', async () => {
    const { provider, requestJson } = createProvider([
      {
        results: [
          {
            place_id: 'sweden-boundary',
            name: 'Sweden',
            country: 'Sweden',
            country_code: 'se',
            lat: 62,
            lon: 15,
          },
        ],
      },
      {
        features: [
          {
            properties: {
              place_id: 'nigeria-mission',
              name: 'Embassy of Nigeria',
              formatted: 'Stockholm, Sweden',
              country: 'Sweden',
              country_code: 'se',
              categories: ['office.government.embassy'],
            },
            geometry: { coordinates: [18.06, 59.33] },
          },
        ],
      },
      {
        features: [
          {
            properties: {
              place_id: 'nigeria-mission',
              name: 'Embassy of Nigeria',
              website: 'https://example.test/mission',
              contact: { phone: '+46 8 123 45', email: 'consular@example.test' },
            },
            geometry: { coordinates: [18.06, 59.33] },
          },
        ],
      },
    ]);

    const result = await provider.searchConsularMissions({
      hostCountryCode: 'SE',
      hostCountryName: 'Sweden',
      citizenshipCountryCode: 'NG',
      citizenshipCountryName: 'Nigeria',
      language: 'en',
      limit: 5,
    });

    expect(result.sourceType).toBe('directory');
    expect(result.officiallyVerified).toBe(false);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      name: 'Embassy of Nigeria',
      phone: '+46 8 123 45',
      email: 'consular@example.test',
      website: 'https://example.test/mission',
    });

    const placesUrl = requestJson.mock.calls[1][0];
    expect(placesUrl.searchParams.get('categories')).toBe('office.government.embassy');
    expect(placesUrl.searchParams.get('filter')).toBe('place:sweden-boundary');
    expect(placesUrl.searchParams.get('name')).toBe('Nigeria');
  });

  it('returns a truthful empty directory result when the host-country boundary cannot be resolved', async () => {
    const { provider, requestJson } = createProvider([{ results: [] }]);

    const result = await provider.searchConsularMissions({
      hostCountryCode: 'SE',
      hostCountryName: 'Sweden',
      citizenshipCountryCode: 'NG',
      citizenshipCountryName: 'Nigeria',
    });

    expect(result).toMatchObject({
      provider: 'geoapify',
      sourceType: 'directory',
      officiallyVerified: false,
      results: [],
    });
    expect(requestJson).toHaveBeenCalledTimes(1);
  });
});
