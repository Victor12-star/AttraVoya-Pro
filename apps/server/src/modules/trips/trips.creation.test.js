import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../errors/app-error.js';
import { createTripsService } from './trips.service.js';
import { tripsSchemas } from './trips.schema.js';

const validInput = {
  destinationId: 'destination-1',
  title: 'Stockholm visit',
  startDate: '2026-11-05',
  endDate: '2026-11-07',
};

describe('Trip creation', () => {
  it('rejects impossible dates and reverse travel ranges', () => {
    const schema = tripsSchemas.create.body;
    expect(schema.safeParse({ ...validInput, startDate: '2026-02-30' }).success).toBe(false);
    expect(schema.safeParse({ ...validInput, endDate: '2026-11-04' }).success).toBe(false);
    expect(schema.safeParse({ ...validInput, userId: 'another-owner' }).success).toBe(false);
    expect(schema.safeParse(validInput).success).toBe(true);
  });

  it('does not persist trips for unpublished destinations', async () => {
    const repository = {
      findPublishedDestination: vi.fn().mockResolvedValue(null),
      createOwnedTrip: vi.fn(),
    };
    const service = createTripsService(repository);
    await expect(
      service.createTrip({ userId: 'owner-123', input: validInput }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.createOwnedTrip).not.toHaveBeenCalled();
  });

  it('uses owner-scoped repository creation for a published destination', async () => {
    const repository = {
      findPublishedDestination: vi.fn().mockResolvedValue({ id: 'destination-1' }),
      createOwnedTrip: vi.fn().mockResolvedValue({
        id: 'trip-1',
        title: validInput.title,
        status: 'DRAFT',
        startDate: new Date('2026-11-05T00:00:00.000Z'),
        endDate: new Date('2026-11-07T00:00:00.000Z'),
        destination: { id: 'destination-1', slug: 'stockholm', city: { name: 'Stockholm' } },
      }),
    };
    const service = createTripsService(repository);
    const trip = await service.createTrip({ userId: 'owner-123', input: validInput });
    expect(repository.createOwnedTrip).toHaveBeenCalledWith({
      userId: 'owner-123',
      input: validInput,
    });
    expect(trip.status).toBe('DRAFT');
    expect(trip.startDate).toBe('2026-11-05');
  });
});
