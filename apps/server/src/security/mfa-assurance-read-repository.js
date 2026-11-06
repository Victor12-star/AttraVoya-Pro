const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Read-only Prisma adapter for independently persisted MFA session assurance.
 * Caller identities MUST come from a validated server-owned refresh-session lookup.
 * No request data, JWT MFA claims, routes, or token issuance are trusted here.
 *
 * This adapter checks current session revocation/expiry as well as MFA proof
 * revocation. The refresh policy separately enforces the verification age.
 */
export function createMfaAssuranceReadRepository({ prismaClient }) {
  if (typeof prismaClient?.mfaSessionAssurance?.findFirst !== 'function') {
    throw new TypeError('MFA assurance Prisma repository is required.');
  }

  return Object.freeze({
    /** @param {{userId: string, sessionId: string}} input */
    async findVerifiedAssurance({ userId, sessionId }) {
      if (
        typeof userId !== 'string' ||
        !ID_PATTERN.test(userId) ||
        typeof sessionId !== 'string' ||
        !ID_PATTERN.test(sessionId)
      ) {
        throw new TypeError('Valid server-owned MFA assurance identity is required.');
      }

      // A proof for a revoked/expired session cannot be reused. Prisma's
      // relational filter enforces ownership in the same database read.
      const now = new Date();
      const proof = await prismaClient.mfaSessionAssurance.findFirst({
        where: {
          userId,
          sessionId,
          revokedAt: null,
          expiresAt: { gt: now },
          verifiedAt: { lte: now },
          session: {
            is: {
              userId,
              revokedAt: null,
              expiresAt: { gt: now },
            },
          },
        },
        select: {
          userId: true,
          sessionId: true,
          verifiedAt: true,
          expiresAt: true,
          revokedAt: true,
        },
      });

      // A missing, inconsistent, or unavailable record must never become
      // a positive assurance decision.
      if (proof?.userId !== userId || proof?.sessionId !== sessionId) return null;
      return proof;
    },
  });
}
