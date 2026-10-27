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
    async findPublishedDestination(destinationId) {
      const client = prismaClient ?? (await import('@attravoya/database')).prisma;
      return client.destination.findFirst({
        where: { id: destinationId, status: 'PUBLISHED' },
        select: { id: true },
      });
    },
    async createOwnedTrip({ userId, input }) {
      const client = prismaClient ?? (await import('@attravoya/database')).prisma;
      return client.trip.create({
        data: {
          userId,
          destinationId: input.destinationId,
          title: input.title,
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          endDate: new Date(`${input.endDate}T00:00:00.000Z`),
          status: 'DRAFT',
        },
        select: {
          id: true, title: true, status: true, startDate: true, endDate: true,
          destination: { select: { id: true, slug: true, city: { select: { name: true } } } },
        },
      });
    },
    async listOwnedTrips({ userId, limit = 50 }) {
      const client = prismaClient ?? (await import('@attravoya/database')).prisma;
      return client.trip.findMany({
        where: { userId },
        orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          destination: {
            select: { id: true, slug: true, city: { select: { name: true } } },
          },
        },
      });
    },
    async listOwnedCompanionTrips({ userId, today, limit = 10 }) {
      const client = prismaClient ?? (await import('@attravoya/database')).prisma;
      return client.trip.findMany({
        where: {
          userId,
          status: { in: ['ACTIVE', 'PLANNED'] },
          endDate: { gte: today },
        },
        // Prioritize ACTIVE trips before PLANNED before applying the ten-trip cap.
        // Within ACTIVE, ascending start dates select current trips before future ones.
        orderBy: [{ status: 'asc' }, { startDate: 'asc' }, { id: 'asc' }],
        take: limit,
        select: companionTripSelect,
      });
    },
  };
}
