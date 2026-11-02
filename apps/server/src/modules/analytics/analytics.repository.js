import { prisma } from '@attravoya/database';

export function createAnalyticsRepository(prismaClient = prisma) {
  return {
    async readUserRegistrationCounts({ createdAfter, createdThrough, previousStart }) {
      const [totalRegistered, newRegistered, previousRegistered, recentlyLoggedIn, tripsCreated, uniqueTripCreators] =
        await prismaClient.$transaction([
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
        totalRegistered,
        newRegistered,
        previousRegistered,
        recentlyLoggedIn,
        tripsCreated,
        uniqueTripCreators,
      };
    },
  };
}

export const analyticsRepository = createAnalyticsRepository();
