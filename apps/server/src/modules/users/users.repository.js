import { prisma } from '@attravoya/database';

export function createUsersRepository(prismaClient = prisma) {
  return {
    async findForAccountDeletion(userId) {
      return prismaClient.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          passwordHash: true,
          deletedAt: true,
        },
      });
    },

    async deleteAccountData({ userId, replacementPasswordHash, deletedAt }) {
      return prismaClient.$transaction(async (tx) => {
        const activeUser = await tx.user.findFirst({
          where: { id: userId, deletedAt: null },
          select: { id: true },
        });
        if (!activeUser) return false;

        // Delete traveller-owned content before anonymizing the retained user
        // row. The row remains only because immutable administrator audit logs
        // use it as a referential-integrity anchor.
        await tx.trip.deleteMany({ where: { userId } });
        await tx.travelPlanRecommendation.deleteMany({
          where: { request: { userId } },
        });
        await tx.travelPlanRequest.deleteMany({ where: { userId } });
        await tx.favorite.deleteMany({ where: { userId } });
        await tx.recentSearch.deleteMany({ where: { userId } });
        await tx.subscription.deleteMany({ where: { userId } });
        await tx.userProfile.deleteMany({ where: { userId } });
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.authSession.deleteMany({ where: { userId } });
        await tx.emailVerificationToken.deleteMany({ where: { userId } });
        await tx.passwordResetToken.deleteMany({ where: { userId } });

        const result = await tx.user.updateMany({
          where: { id: userId, deletedAt: null },
          data: {
            email: `deleted-${userId}@deleted.invalid`,
            passwordHash: replacementPasswordHash,
            status: 'DEACTIVATED',
            emailVerifiedAt: null,
            lastLoginAt: null,
            deletedAt,
          },
        });

        return result.count === 1;
      });
    },
  };
}

export const usersRepository = createUsersRepository();
