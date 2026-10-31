import { afterEach, describe, expect, it, vi } from 'vitest';

import { searchOriginCities } from './origin-city-search.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('origin city geocoding', () => {
  it('normalizes provider city suggestions for the planner', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 123,
            name: 'Stockholm',
            admin1: 'Stockholm',
            country: 'Sweden',
            country_code: 'SE',
            latitude: 59.33,
            longitude: 18.06,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const results = await searchOriginCities({ query: 'sto', limit: 8, language: 'en' });

    expect(results).toEqual([
      expect.objectContaining({
        name: 'Stockholm',
        formattedAddress: 'Stockholm, Stockholm, Sweden',
        provider: 'open-meteo-geocoding',
        resultType: 'city',
      }),
    ]);
    expect(String(mockFetch.mock.calls[0][0])).toContain('name=sto');
    expect(mockFetch.mock.calls[0][1]).toHaveProperty('signal');
  });

  it('does not contact a provider for incomplete searches', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    expect(await searchOriginCities({ query: 's' })).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty results when the provider has no matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    expect(await searchOriginCities({ query: 'zzz' })).toEqual([]);
  });

  it('rejects unavailable providers rather than inventing city results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(searchOriginCities({ query: 'sto' })).rejects.toThrow('temporarily unavailable');
  });
});
