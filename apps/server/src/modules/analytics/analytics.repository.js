import { prisma } from '@attravoya/database';

export function createAnalyticsRepository(prismaClient = prisma) {
  return {
    async readUserRegistrationCounts({ createdAfter, createdThrough }) {
      const [totalRegistered, newRegistered] = await prismaClient.$transaction([
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
      ]);

      return { totalRegistered, newRegistered };
    },
  };
}

export const analyticsRepository = createAnalyticsRepository();
