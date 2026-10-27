import { NotFoundError } from '../../errors/app-error.js';

import { buildCompanionTripContext } from './trips.contracts.js';

function utcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('A valid current date is required.');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function createTripsService(repository, options = {}) {
  if (!repository) throw new TypeError('Trips repository is required.');
  const now = options.now ?? (() => new Date());

  function mapSavedTrip(record) {
    return {
      id: record.id,
      title: record.title,
      status: record.status,
      startDate: record.startDate.toISOString().slice(0, 10),
      endDate: record.endDate.toISOString().slice(0, 10),
      destination: {
        id: record.destination.id,
        slug: record.destination.slug,
        name: record.destination.city.name,
      },
    };
  }

  return {
    async createTrip({ userId, input }) {
      const destination = await repository.findPublishedDestination(input.destinationId);
      if (!destination) throw new NotFoundError('The selected destination was not found.');
      const record = await repository.createOwnedTrip({ userId, input });
      return mapSavedTrip(record);
    },
    async getOwnedTrip({ userId, tripId }) {
      const record = await repository.getOwnedTrip({ userId, tripId });
      if (!record) throw new NotFoundError('The requested trip was not found.');
      return mapSavedTrip(record);
    },
    async listOwnedTrips({ userId }) {
      const records = await repository.listOwnedTrips({ userId, limit: 50 });
      return records.map(mapSavedTrip);
    },
    async getCompanionContext({ userId }) {
      const today = utcDay(now());
      const records = await repository.listOwnedCompanionTrips({
        userId,
        today,
        limit: 10,
      });

      return buildCompanionTripContext(records, today);
    },
  };
}
