const plannerRequestSelect = {
  id: true,
  userId: true,
  originCityId: true,
  originAirportId: true,
  originLabel: true,
  targetDestinationId: true,
  earliestDeparture: true,
  latestReturn: true,
  fixedDeparture: true,
  fixedReturn: true,
  minNights: true,
  maxNights: true,
  flexibleDates: true,
  budgetAmount: true,
  adults: true,
  childrenAges: true,
  interests: true,
  comfortLevel: true,
  safetyReservePercent: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  budgetCurrency: { select: { code: true } },
  targetDestination: {
    select: {
      id: true,
      slug: true,
      status: true,
      city: { select: { name: true, country: { select: { iso2: true } } } },
    },
  },
  stayPreference: {
    select: {
      types: true,
      unitType: true,
      breakfast: true,
      kitchen: true,
      privateBathroom: true,
      requiredAmenities: true,
      preferredAmenities: true,
      nearPriorities: true,
      maxNightlyAmount: true,
      maxTotalStayAmount: true,
      longStayFriendly: true,
      familyFriendly: true,
    },
  },
};

export function createPlannerRepository() {
  return {
    async findCurrencyByCode(code) {
      const { prisma } = await import('@attravoya/database');
      return prisma.currency.findUnique({ where: { code }, select: { id: true, code: true } });
    },

    async findDestinationById(destinationId) {
      const { prisma } = await import('@attravoya/database');
      return prisma.destination.findUnique({
        where: { id: destinationId },
        select: { id: true, status: true },
      });
    },

    async findOriginCityById(cityId) {
      const { prisma } = await import('@attravoya/database');
      return prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
    },

    async findOriginAirportById(airportId) {
      const { prisma } = await import('@attravoya/database');
      return prisma.airport.findUnique({
        where: { id: airportId },
        select: { id: true, cityId: true },
      });
    },

    async createOwnedRequest({ userId, currencyId, input }) {
      const { prisma } = await import('@attravoya/database');
      const { accommodation, ...requestInput } = input;

      return prisma.travelPlanRequest.create({
        data: {
          ...requestInput,
          userId,
          budgetCurrencyId: currencyId,
          ...(accommodation ? { stayPreference: { create: accommodation } } : {}),
        },
        select: plannerRequestSelect,
      });
    },

    async listOwnedRequests(userId, limit = 20) {
      const { prisma } = await import('@attravoya/database');
      return prisma.travelPlanRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: plannerRequestSelect,
      });
    },

    async findOwnedRequestById({ userId, requestId }) {
      const { prisma } = await import('@attravoya/database');
      return prisma.travelPlanRequest.findFirst({
        where: { id: requestId, userId },
        select: plannerRequestSelect,
      });
    },
  };
}
