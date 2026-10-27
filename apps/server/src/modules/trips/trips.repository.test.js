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

  it('uses the authenticated user as owner and creates a draft trip', async () => {
    const create = vi.fn().mockResolvedValue({});
    const repository = createTripsRepository({ trip: { create } });
    await repository.createOwnedTrip({
      userId: 'logged-in-user',
      input: {
        destinationId: 'destination-1',
        title: 'Stockholm visit',
        startDate: '2026-11-05',
        endDate: '2026-11-07',
      },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'logged-in-user',
          destinationId: 'destination-1',
          title: 'Stockholm visit',
          startDate: new Date('2026-11-05T00:00:00.000Z'),
          endDate: new Date('2026-11-07T00:00:00.000Z'),
          status: 'DRAFT',
        },
      }),
    );
  });

  it('requires a published destination before trip creation', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = createTripsRepository({ destination: { findFirst } });
    await repository.findPublishedDestination('destination-1');
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'destination-1', status: 'PUBLISHED' },
      select: { id: true },
    });
  });

  it('retrieves a single saved trip only when its owner matches', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = createTripsRepository({ trip: { findFirst } });

    await repository.getOwnedTrip({ userId: 'owner-123', tripId: 'trip-456' });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'trip-456', userId: 'owner-123' },
      }),
    );
  });
});
