import { prisma } from '@attravoya/database';

export function createAnalyticsRepository(prismaClient = prisma) {
  return {
    async readUserRegistrationCounts({ createdAfter, createdThrough, previousStart }) {
      const counts = await prismaClient.$transaction([
        prismaClient.user.count({
          where: { deletedAt: null },
        }),
        prismaClient.user.count({
          where: {
            deletedAt: null,
            createdAt: {
              gte: createdAfter,
              lte: createdThrough,
            },
          },
        }),
        prismaClient.user.count({
          where: {
            deletedAt: null,
            createdAt: { gte: previousStart, lt: createdAfter },
          },
        }),
        prismaClient.user.count({
          where: {
            deletedAt: null,
            lastLoginAt: { gte: createdAfter, lte: createdThrough },
          },
        }),
        prismaClient.trip.count({
          where: {
            createdAt: { gte: createdAfter, lte: createdThrough },
            user: { deletedAt: null },
          },
        }),
        prismaClient.user.count({
          where: {
            deletedAt: null,
            trips: { some: { createdAt: { gte: createdAfter, lte: createdThrough } } },
          },
        }),
      ]);

      return {
        totalRegistered: counts[0],
        newRegistered: counts[1],
        previousRegistered: counts[2],
        recentlyLoggedIn: counts[3],
        tripsCreated: counts[4],
        uniqueTripCreators: counts[5],
      };
    },
  };
}

export const analyticsRepository = createAnalyticsRepository();
