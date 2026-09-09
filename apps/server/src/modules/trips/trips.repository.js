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

export function createTripsRepository() {
  return {
    async listOwnedCompanionTrips({ userId, today, limit = 10 }) {
      const { prisma } = await import('@attravoya/database');
      return prisma.trip.findMany({
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
