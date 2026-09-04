import { describe, expect, it, vi } from 'vitest';

import { createDestinationsService } from './destinations.service.js';

describe('destinations service', () => {
  it('requests city-only provider results and removes invalid or duplicate candidates', async () => {
    const autocomplete = vi.fn(async (query) => ({
      provider: 'test',
      fetchedAt: '2026-09-04T12:00:00.000Z',
      results: [
        {
          provider: 'test',
          externalId: 'stockholm',
          name: 'Stockholm',
          city: 'Stockholm',
          formattedAddress: 'Stockholm, Sweden',
          country: 'Sweden',
          countryCode: 'SE',
          latitude: 59.3293,
          longitude: 18.0686,
          resultType: 'city',
          confidence: 0.99,
        },
        {
          provider: 'test',
          externalId: 'stockholm',
          name: 'Stockholm',
          city: 'Stockholm',
          country: 'Sweden',
          countryCode: 'SE',
          latitude: 59.3293,
          longitude: 18.0686,
          resultType: 'city',
        },
        {
          provider: 'test',
          externalId: 'street-result',
          name: 'Drottninggatan',
          city: 'Stockholm',
          country: 'Sweden',
          countryCode: 'SE',
          latitude: 59.332,
          longitude: 18.063,
          resultType: 'street',
        },
      ],
      query,
    }));

    const service = createDestinationsService({ name: 'test', autocomplete });
    const result = await service.search({
      query: 'Stockholm',
      language: 'en',
      countryCode: 'SE',
      limit: 10,
    });

    expect(autocomplete).toHaveBeenCalledWith({
      query: 'Stockholm',
      language: 'en',
      countryCode: 'SE',
      limit: 10,
      type: 'city',
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      name: 'Stockholm',
      countryCode: 'SE',
      latitude: 59.3293,
      longitude: 18.0686,
      confidence: 0.99,
    });
  });

  it('drops malformed provider rows instead of sending unusable destinations to clients', async () => {
    const service = createDestinationsService({
      name: 'test',
      autocomplete: async () => ({
        provider: 'test',
        results: [
          { name: 'Missing country', latitude: 10, longitude: 20, resultType: 'city' },
          { name: 'Missing coordinates', countryCode: 'SE', resultType: 'city' },
        ],
      }),
    });

    await expect(
      service.search({ query: 'test', language: 'en', limit: 10 }),
    ).resolves.toMatchObject({ results: [] });
  });
});
