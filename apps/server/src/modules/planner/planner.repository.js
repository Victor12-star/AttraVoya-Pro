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

const destinationCandidateSelect = {
  id: true,
  cityId: true,
  slug: true,
  summary: true,
  city: {
    select: {
      name: true,
      regionName: true,
      country: { select: { iso2: true, name: true } },
    },
  },
};

/** @param {unknown} error */
function isUniqueConstraintError(error) {
  if (!error || typeof error !== 'object') return false;
  return /** @type {{ code?: string }} */ (error).code === 'P2002';
}

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

    async createOwnedRequestIdempotently({ requestId, userId, currencyId, input }) {
      const { prisma } = await import('@attravoya/database');
      const { accommodation, ...requestInput } = input;

      try {
        const record = await prisma.travelPlanRequest.create({
          data: {
            id: requestId,
            ...requestInput,
            userId,
            budgetCurrencyId: currencyId,
            ...(accommodation ? { stayPreference: { create: accommodation } } : {}),
          },
          select: plannerRequestSelect,
        });
        return { record, created: true };
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;

        // A concurrent retry on another replica can win the deterministic ID
        // race. Recover only when that exact request is now owned by this user;
        // any unrelated uniqueness failure remains an error.
        const record = await prisma.travelPlanRequest.findFirst({
          where: { id: requestId, userId },
          select: plannerRequestSelect,
        });
        if (!record) throw error;
        return { record, created: false };
      }
    },

    async listOwnedRequests(userId, limit = 20, cursor) {
      const { prisma } = await import('@attravoya/database');
      return prisma.travelPlanRequest.findMany({
        where: {
          userId,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
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

    async findPublishedDestinationCandidateById(destinationId) {
      const { prisma } = await import('@attravoya/database');
      return prisma.destination.findFirst({
        where: { id: destinationId, status: 'PUBLISHED' },
        select: destinationCandidateSelect,
      });
    },

    /** @param {{excludeCityId?: string, limit?: number}} [options] */
    async listPublishedDestinationCandidates(options = {}) {
      const { excludeCityId, limit = 20 } = options;
      const { prisma } = await import('@attravoya/database');
      return prisma.destination.findMany({
        where: {
          status: 'PUBLISHED',
          ...(excludeCityId ? { cityId: { not: excludeCityId } } : {}),
        },
        orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
        take: limit,
        select: destinationCandidateSelect,
      });
    },
  };
}
