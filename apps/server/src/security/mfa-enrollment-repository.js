import { prisma } from '@attravoya/database';

function assertHashes(hashes) {
  if (
    !Array.isArray(hashes) ||
    hashes.length !== 10 ||
    new Set(hashes).size !== 10 ||
    !hashes.every((hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash))
  ) {
    throw new TypeError('Ten distinct recovery-code hashes are required.');
  }
}

/**
 * Inactive enrollment persistence. No routes or login paths import this yet.
 * The database transaction is the authority for one-time activation.
 */
export function createMfaEnrollmentRepository({ prismaClient }) {
  if (!prismaClient?.mfaTotpCredential || typeof prismaClient.$transaction !== 'function') {
    throw new TypeError('MFA Prisma client is required.');
  }

  return Object.freeze({
    async createPendingEnrollment({ userId, secretEnvelope, expiresAt, now }) {
      if (
        typeof userId !== 'string' ||
        !userId ||
        typeof secretEnvelope !== 'string' ||
        !secretEnvelope ||
        !(expiresAt instanceof Date) ||
        !(now instanceof Date) ||
        !Number.isFinite(expiresAt.getTime()) ||
        !Number.isFinite(now.getTime()) ||
        expiresAt <= now
      ) {
        throw new TypeError('Invalid pending MFA enrollment.');
      }

      // Never replace an enabled factor. The unique userId index also prevents
      // concurrent first-enrollment requests from creating multiple records.
      const replaced = await prismaClient.mfaTotpCredential.updateMany({
        where: { userId, enabledAt: null },
        data: {
          secretEnvelope,
          pendingExpiresAt: expiresAt,
          lastAcceptedCounter: -1,
        },
      });
      if (replaced.count === 1) return true;
      try {
        await prismaClient.mfaTotpCredential.create({
          data: { userId, secretEnvelope, pendingExpiresAt: expiresAt },
        });
        return true;
      } catch (error) {
        if (error?.code === 'P2002') return false;
        throw error;
      }
    },

    async findPendingEnrollment(userId) {
      return prismaClient.mfaTotpCredential.findUnique({
        where: { userId },
        select: {
          secretEnvelope: true,
          pendingExpiresAt: true,
          enabledAt: true,
          lastAcceptedCounter: true,
        },
      });
    },

    async completeEnrollment({ userId, expectedEnvelope, counter, now, recoveryCodeHashes }) {
      if (
        typeof userId !== 'string' ||
        !userId ||
        typeof expectedEnvelope !== 'string' ||
        !expectedEnvelope ||
        !Number.isSafeInteger(counter) ||
        counter < 0 ||
        !(now instanceof Date) ||
        !Number.isFinite(now.getTime())
      ) {
        throw new TypeError('Invalid MFA confirmation.');
      }
      assertHashes(recoveryCodeHashes);

      return prismaClient.$transaction(async (tx) => {
        // Compare-and-swap prevents races, replay, expired confirmation, and
        // accidental replacement of an already enabled authenticator.
        const activated = await tx.mfaTotpCredential.updateMany({
          where: {
            userId,
            secretEnvelope: expectedEnvelope,
            enabledAt: null,
            pendingExpiresAt: { gt: now },
            lastAcceptedCounter: { lt: counter },
          },
          data: {
            enabledAt: now,
            pendingExpiresAt: null,
            lastAcceptedCounter: counter,
          },
        });
        if (activated.count !== 1) return false;

        // A failure here rolls back the credential activation as well. This
        // must never be changed into an unawaited or separate database write.
        await tx.mfaRecoveryCode.createMany({
          data: recoveryCodeHashes.map((codeHash) => ({ userId, codeHash })),
        });
        return true;
      });
    },
  });
}

export const mfaEnrollmentRepository = createMfaEnrollmentRepository({
  prismaClient: prisma,
});
