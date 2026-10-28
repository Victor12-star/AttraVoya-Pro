import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../errors/app-error.js';
import { createPlannerService } from './planner.service.js';

describe('Owned country and city candidates', () => {
  it('rejects a missing or other-user planning brief before discovery', async () => {
    const repository = {
      findOwnedRequestById: vi.fn().mockResolvedValue(null),
      listPublishedDestinationsInCountry: vi.fn(),
    };
    const service = createPlannerService(/** @type {any} */ (repository));
    await expect(
      service.getOwnedCountryCityCandidates({
        userId: 'owner-1',
        requestId: 'brief-1',
        countryCode: 'IT',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.findOwnedRequestById).toHaveBeenCalledWith({
      userId: 'owner-1',
      requestId: 'brief-1',
    });
    expect(repository.listPublishedDestinationsInCountry).not.toHaveBeenCalled();
  });

  it('keeps candidates in the chosen city and reports prices as unverified', async () => {
    const repository = {
      findOwnedRequestById: vi.fn().mockResolvedValue({
        originCityId: 'stockholm',
        targetDestinationId: null,
      }),
      listPublishedDestinationsInCountry: vi.fn().mockResolvedValue([]),
    };
    const service = createPlannerService(/** @type {any} */ (repository));
    const result = await service.getOwnedCountryCityCandidates({
      userId: 'owner-1',
      requestId: 'brief-1',
      countryCode: 'IT',
      cityId: 'rome',
    });
    expect(repository.listPublishedDestinationsInCountry).toHaveBeenCalledWith({
      countryCode: 'IT',
      cityId: 'rome',
      limit: 20,
    });
    expect(result.scope).toBe('SPECIFIC_CITY');
    expect(result.evaluation.priceDataAvailable).toBe(false);
    expect(result.evaluation.rankingApplied).toBe(false);
  });
});
