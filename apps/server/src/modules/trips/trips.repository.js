const companionTripSelect = {
  id: true,
  title: true,
  status: true,
  startDate: true,
  endDate: true,
  destination: {
    select: {
      id: true,
      slug: true,
      city: {
        select: {
          name: true,
          country: { select: { iso2: true, name: true } },
        },
      },
    },
  },
};

// Accepting an optional Prisma client keeps normal production behavior unchanged
// while allowing the PostgreSQL CI contract to observe the exact SQL emitted by
// this repository without mocking away relation loading.
export function createTripsRepository(prismaClient) {
  return {
    async listOwnedCompanionTrips({ userId, today, limit = 10 }) {
      const client = prismaClient ?? (await import('@attravoya/database')).prisma;
      return client.trip.findMany({
        where: {
          userId,
          status: { in: ['ACTIVE', 'PLANNED'] },
          endDate: { gte: today },
        },
        orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
        take: limit,
        select: companionTripSelect,
      });
    },
  };
}
