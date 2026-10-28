import { describe, expect, it, vi } from 'vitest';

import { createPlannerRepository } from './planner.repository.js';
import { plannerSchemas } from './planner.schema.js';

describe('Country and city candidate discovery', () => {
  it('requires a country and accepts an optional city', () => {
    const schema = plannerSchemas.countryCityCandidates.querystring;
    expect(schema.safeParse({ countryCode: 'IT' }).success).toBe(true);
    expect(schema.safeParse({ countryCode: 'IT', cityId: 'rome-id' }).success).toBe(true);
    expect(schema.safeParse({ countryCode: 'I' }).success).toBe(false);
    expect(schema.safeParse({ countryCode: 'IT', destinationId: 'wrong' }).success).toBe(false);
  });

  it('limits published catalog candidates to the selected country', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createPlannerRepository(/** @type {any} */ ({ destination: { findMany } }));
    await repository.listPublishedDestinationsInCountry({ countryCode: 'IT', limit: 20 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          city: { country: { iso2: 'IT' } },
        },
        take: 20,
      }),
    );
  });

  it('limits a specific city to that city in the selected country', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createPlannerRepository(/** @type {any} */ ({ destination: { findMany } }));
    await repository.listPublishedDestinationsInCountry({
      countryCode: 'IT',
      cityId: 'rome-id',
      limit: 20,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          city: { country: { iso2: 'IT' }, id: 'rome-id' },
        },
      }),
    );
  });
});
