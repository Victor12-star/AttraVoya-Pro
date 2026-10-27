import { describe, expect, it, vi } from 'vitest';

import { createTripsRepository } from './trips.repository.js';

describe('Trips repository companion context', () => {
  it('prioritizes active trips in SQL before applying the result limit', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createTripsRepository({ trip: { findMany } });
    const today = new Date('2026-10-27T00:00:00.000Z');

    await repository.listOwnedCompanionTrips({
      userId: 'owner-123',
      today,
      limit: 10,
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'owner-123',
          status: { in: ['ACTIVE', 'PLANNED'] },
          endDate: { gte: today },
        },
        orderBy: [{ status: 'asc' }, { startDate: 'asc' }, { id: 'asc' }],
        take: 10,
      }),
    );
  });
  it('restricts saved trip listing to the authenticated owner and caps results', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createTripsRepository({ trip: { findMany } });
    await repository.listOwnedTrips({ userId: 'owner-123', limit: 50 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'owner-123' },
        orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
        take: 50,
      }),
    );
  });

});
