import { prisma } from '@attravoya/database';

export function createAnalyticsRepository(prismaClient = prisma) {
  return {
    async readUserRegistrationCounts({ createdAfter, createdThrough, previousStart }) {
      const [totalRegistered, newRegistered, previousRegistered] = await prismaClient.$transaction([
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
      ]);

      return { totalRegistered, newRegistered, previousRegistered };
    },
  };
}

export const analyticsRepository = createAnalyticsRepository();
