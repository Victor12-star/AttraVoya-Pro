import { prisma } from '@attravoya/database';

/**
 * Repository for already-enabled MFA factors.
 *
 * The atomic update is the authority for replay protection. This repository
 * does not issue sessions or tokens and is not attached to authentication
 * routes.
 */
export function createMfaFactorVerificationRepository({ prismaClient }) {
  if (
    typeof prismaClient?.mfaTotpCredential?.findUnique !== 'function' ||
    typeof prismaClient?.mfaTotpCredential?.updateMany !== 'function'
  ) {
    throw new TypeError('MFA factor Prisma repository is required.');
  }

  return Object.freeze({
    async findEnabledFactor(userId) {
      if (typeof userId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
        throw new TypeError('Invalid MFA account identifier.');
      }
      const factor = await prismaClient.mfaTotpCredential.findUnique({
        where: { userId },
        select: {
          secretEnvelope: true,
          enabledAt: true,
          lastAcceptedCounter: true,
        },
      });
      return factor?.enabledAt instanceof Date ? factor : null;
    },

    async consumeTotpCounter({ userId, expectedEnvelope, counter }) {
      if (
        typeof userId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(userId) ||
        typeof expectedEnvelope !== 'string' ||
        !expectedEnvelope ||
        !Number.isSafeInteger(counter) ||
        counter < 0 ||
        counter > 2_147_483_647
      ) {
        throw new TypeError('Invalid MFA factor verification.');
      }

      // Single database compare-and-swap: concurrent requests with the same
      // counter can never both update the same enabled, unchanged factor.
      const updated = await prismaClient.mfaTotpCredential.updateMany({
        where: {
          userId,
          secretEnvelope: expectedEnvelope,
          enabledAt: { not: null },
          lastAcceptedCounter: { lt: counter },
        },
        data: { lastAcceptedCounter: counter },
      });
      return updated.count === 1;
    },
  });
}

export const mfaFactorVerificationRepository = createMfaFactorVerificationRepository({
  prismaClient: prisma,
});
