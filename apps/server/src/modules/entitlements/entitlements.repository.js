import { PRO_PLAN_KEYS } from '@attravoya/constants';
import { prisma } from '@attravoya/database';

export function createEntitlementsRepository(prismaClient = prisma) {
  return {
    async findActiveProSubscription({ userId, now }) {
      return prismaClient.subscription.findFirst({
        where: {
          userId,
          status: { in: ['ACTIVE', 'TRIALING'] },
          startsAt: { lte: now },
          currentPeriodEnd: { gt: now },
          plan: {
            is: {
              isActive: true,
              key: { in: PRO_PLAN_KEYS },
            },
          },
        },
        orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
        select: {
          status: true,
          currentPeriodEnd: true,
          plan: {
            select: {
              key: true,
              entitlements: {
                select: {
                  entitlement: {
                    select: { key: true },
                  },
                },
              },
            },
          },
        },
      });
    },
  };
}

export const entitlementsRepository = createEntitlementsRepository();
