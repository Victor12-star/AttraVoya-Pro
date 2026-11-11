import { ROLES } from '@attravoya/constants';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const MAX_ASSURANCE_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * Inactive MFA-assured refresh rotation for a server-validated session.
 *
 * The single conditional database UPDATE prevents an expired/revoked MFA proof
 * or revoked/expired session from rotating credentials after a separate read.
 * The same write also checks current active, verified, privileged account
 * status and MFA enrollment that took effect no later than the check time.\n * The future production token issuer must
 * separately enforce revocation and role-change serialization.
 * No HTTP route or live session service imports this helper.
 */
export function createMfaAssuredRefreshRotation({ prismaClient }) {
  if (typeof prismaClient?.authSession?.updateMany !== 'function') {
    throw new TypeError('MFA refresh rotation persistence is required.');
  }

  return Object.freeze({
    /** @param {{userId: string, sessionId: string, currentHash: string, nextHash: string, now: Date}} input */
    async rotate({ userId, sessionId, currentHash, nextHash, now }) {
      if (
        typeof userId !== 'string' ||
        !ID_PATTERN.test(userId) ||
        typeof sessionId !== 'string' ||
        !ID_PATTERN.test(sessionId) ||
        typeof currentHash !== 'string' ||
        !HASH_PATTERN.test(currentHash) ||
        typeof nextHash !== 'string' ||
        !HASH_PATTERN.test(nextHash) ||
        currentHash === nextHash ||
        !(now instanceof Date) ||
        !Number.isFinite(now.getTime())
      ) {
        throw new TypeError('Invalid trusted MFA refresh rotation evidence.');
      }

      const updated = await prismaClient.authSession.updateMany({
        where: {
          id: sessionId,
          userId,
          refreshTokenHash: currentHash,
          revokedAt: null,
          expiresAt: { gt: now },
          user: {
            is: {
              status: 'ACTIVE',
              deletedAt: null,
              emailVerifiedAt: { lte: now },
              roles: {
                some: { role: { is: { key: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } } } },
              },
              mfaTotpCredential: { is: { enabledAt: { lte: now } } },
            },
          },
          mfaAssurance: {
            is: {
              userId,
              revokedAt: null,
              verifiedAt: {
                lte: now,
                gte: new Date(now.getTime() - MAX_ASSURANCE_AGE_MS),
              },
              expiresAt: { gt: now },
            },
          },
        },
        data: {
          refreshTokenHash: nextHash,
          lastUsedAt: now,
        },
      });

      if (updated?.count === 0) return false;
      if (updated?.count !== 1) {
        throw new Error('Invalid MFA refresh rotation result.');
      }
      return true;
    },
  });
}
