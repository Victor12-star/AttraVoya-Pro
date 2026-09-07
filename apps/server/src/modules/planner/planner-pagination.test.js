import { describe, expect, it, vi } from 'vitest';

import { createPlannerService } from './planner.service.js';

function storedRequest(id, createdAt) {
  return {
    id,
    userId: 'user-1',
    originCityId: null,
    originAirportId: null,
    originLabel: 'Stockholm',
    targetDestinationId: null,
    earliestDeparture: null,
    latestReturn: null,
    fixedDeparture: new Date('2026-10-10T00:00:00.000Z'),
    fixedReturn: new Date('2026-10-17T00:00:00.000Z'),
    minNights: 2,
    maxNights: 14,
    flexibleDates: false,
    budgetAmount: '25000',
    adults: 2,
    childrenAges: [6],
    interests: ['history'],
    comfortLevel: 'VALUE',
    safetyReservePercent: '7.5',
    status: 'DRAFT',
    createdAt,
    updatedAt: createdAt,
    budgetCurrency: { code: 'SEK' },
    targetDestination: null,
    stayPreference: null,
  };
}

describe('planner request pagination', () => {
  it('returns a bounded first page and an opaque next cursor without a count query', async () => {
    const records = [
      storedRequest('request-3', new Date('2026-09-07T12:00:00.000Z')),
      storedRequest('request-2', new Date('2026-09-07T11:00:00.000Z')),
      storedRequest('request-1', new Date('2026-09-07T10:00:00.000Z')),
    ];
    const repository = {
      listOwnedRequests: vi.fn().mockResolvedValue(records),
    };
    const service = createPlannerService(repository);

    const result = await service.listRequests({ userId: 'user-1', limit: 2 });

    expect(repository.listOwnedRequests).toHaveBeenCalledWith('user-1', 2);
    expect(result.requests.map((request) => request.id)).toEqual(['request-3', 'request-2']);
    expect(result.page).toMatchObject({ limit: 2, hasMore: true });
    expect(result.page.nextCursor).toEqual(expect.any(String));
  });

  it('decodes the next cursor into an owner-scoped keyset boundary', async () => {
    const firstRepository = {
      listOwnedRequests: vi
        .fn()
        .mockResolvedValue([
          storedRequest('request-3', new Date('2026-09-07T12:00:00.000Z')),
          storedRequest('request-2', new Date('2026-09-07T11:00:00.000Z')),
        ]),
    };
    const firstPage = await createPlannerService(firstRepository).listRequests({
      userId: 'user-1',
      limit: 1,
    });
    const nextCursor = firstPage.page.nextCursor;
    if (typeof nextCursor !== 'string') throw new Error('Expected a planner next cursor.');

    const secondRepository = {
      listOwnedRequests: vi
        .fn()
        .mockResolvedValue([storedRequest('request-2', new Date('2026-09-07T11:00:00.000Z'))]),
    };
    const secondPage = await createPlannerService(secondRepository).listRequests({
      userId: 'user-1',
      limit: 1,
      cursor: nextCursor,
    });

    expect(secondRepository.listOwnedRequests).toHaveBeenCalledWith('user-1', 1, {
      id: 'request-3',
      createdAt: new Date('2026-09-07T12:00:00.000Z'),
    });
    expect(secondPage.requests.map((request) => request.id)).toEqual(['request-2']);
    expect(secondPage.page).toEqual({ limit: 1, hasMore: false, nextCursor: null });
  });

  it('rejects malformed cursors before querying the repository', async () => {
    const repository = { listOwnedRequests: vi.fn() };
    const service = createPlannerService(repository);

    await expect(
      service.listRequests({ userId: 'user-1', limit: 20, cursor: 'invalid-cursor' }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'The planner request cursor is invalid.',
    });
    expect(repository.listOwnedRequests).not.toHaveBeenCalled();
  });
});
