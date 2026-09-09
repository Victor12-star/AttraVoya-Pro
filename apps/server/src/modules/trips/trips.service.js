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
