import { prisma } from '@attravoya/database';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const USER_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const PURPOSE = 'ADMIN_LOGIN';

function validDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function assertIdentity({ userId, challengeHash, purpose }) {
  if (
    typeof userId !== 'string' ||
    !USER_PATTERN.test(userId) ||
    typeof challengeHash !== 'string' ||
    !HASH_PATTERN.test(challengeHash) ||
    purpose !== PURPOSE
  ) {
    throw new TypeError('Invalid MFA login challenge identity.');
  }
}

/**
 * Isolated Prisma adapter for pre-session MFA challenges.
 *
 * The database updateMany predicates, rather than an earlier read, enforce
 * expiry, five-attempt lockout, account binding and single-use consumption
 * atomically. No live routes or token issuance depend on this module.
 */
export function createMfaLoginChallengeRepository({ prismaClient }) {
  if (
    typeof prismaClient?.mfaChallenge?.create !== 'function' ||
    typeof prismaClient?.mfaChallenge?.findUnique !== 'function' ||
    typeof prismaClient?.mfaChallenge?.updateMany !== 'function'
  ) {
    throw new TypeError('MFA challenge Prisma repository is required.');
  }

  return Object.freeze({
    async createChallenge({ userId, challengeHash, purpose, expiresAt }) {
      assertIdentity({ userId, challengeHash, purpose });
      if (!validDate(expiresAt)) throw new TypeError('Valid MFA challenge expiry is required.');
      await prismaClient.mfaChallenge.create({
        data: { userId, challengeHash, purpose, expiresAt },
      });
    },

    async findChallenge(challengeHash) {
      if (typeof challengeHash !== 'string' || !HASH_PATTERN.test(challengeHash)) {
        throw new TypeError('Invalid MFA challenge hash.');
      }
      return prismaClient.mfaChallenge.findUnique({
        where: { challengeHash },
        select: {
          userId: true,
          purpose: true,
          expiresAt: true,
          consumedAt: true,
          attempts: true,
        },
      });
    },

    async recordFailedAttempt({ userId, challengeHash, purpose, now, maxAttempts }) {
      assertIdentity({ userId, challengeHash, purpose });
      if (!validDate(now) || !Number.isSafeInteger(maxAttempts) || maxAttempts !== 5) {
        throw new TypeError('Invalid MFA challenge attempt bounds.');
      }
      const result = await prismaClient.mfaChallenge.updateMany({
        where: {
          userId,
          challengeHash,
          purpose,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: maxAttempts },
        },
        data: { attempts: { increment: 1 } },
      });
      return result.count === 1;
    },

    async consumeChallenge({ userId, challengeHash, purpose, now, maxAttempts }) {
      assertIdentity({ userId, challengeHash, purpose });
      if (!validDate(now) || !Number.isSafeInteger(maxAttempts) || maxAttempts !== 5) {
        throw new TypeError('Invalid MFA challenge consumption bounds.');
      }
      const result = await prismaClient.mfaChallenge.updateMany({
        where: {
          userId,
          challengeHash,
          purpose,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: maxAttempts },
        },
        data: { consumedAt: now },
      });
      return result.count === 1;
    },
  });
}

export const mfaLoginChallengeRepository = createMfaLoginChallengeRepository({
  prismaClient: prisma,
});
