import { buildCompanionTripContext } from './trips.contracts.js';

function utcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('A valid current date is required.');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function createTripsService(repository, options = {}) {
  if (!repository) throw new TypeError('Trips repository is required.');
  const now = options.now ?? (() => new Date());

  return {
    async listOwnedTrips({ userId }) {
      const records = await repository.listOwnedTrips({ userId, limit: 50 });
      return records.map((record) => ({
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
      }));
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
