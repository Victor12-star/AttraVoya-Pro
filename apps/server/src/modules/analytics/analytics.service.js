const DAY_MS = 24 * 60 * 60 * 1000;

function validNow(now) {
  const value = now();
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError('Analytics current time must be a valid date.');
  }
  return date;
}

export function createAnalyticsService(repository, options = {}) {
  if (!repository || typeof repository.readUserRegistrationCounts !== 'function') {
    throw new TypeError('Analytics repository is required.');
  }

  const now = options.now ?? (() => new Date());

  return {
    async getUserRegistrationSummary({ windowDays }) {
      const windowEnd = validNow(now);
      const windowStart = new Date(windowEnd.getTime() - windowDays * DAY_MS);
      const counts = await repository.readUserRegistrationCounts({
        createdAfter: windowStart,
        createdThrough: windowEnd,
      });

      return {
        window: {
          days: windowDays,
          start: windowStart.toISOString(),
          end: windowEnd.toISOString(),
        },
        users: {
          totalRegistered: counts.totalRegistered,
          newRegistered: counts.newRegistered,
        },
      };
    },
  };
}
