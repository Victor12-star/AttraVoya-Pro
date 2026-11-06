const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Inactive, server-only account incident response helper.
 *
 * The trusted caller must authorize the account-wide action. Revokes every
 * non-revoked refresh session and MFA assurance in a single Prisma transaction,
 * so failures cannot commit only one half of the revocation. This is not
 * connected to any route, administrator action or token issuer.
 *
 * A future live integration must also prevent concurrent session issuance
 * through a coordinated account lock or equivalent transaction protocol.
 */
export function createMfaAccountSessionRevocation({ prismaClient }) {
  if (typeof prismaClient?.$transaction !== 'function') {
    throw new TypeError('Transactional MFA account revocation requires Prisma.');
  }

  return Object.freeze({
    /** @param {{userId: string, now: Date}} input */
    async revokeAll({ userId, now }) {
      if (
        typeof userId !== 'string' ||
        !ID_PATTERN.test(userId) ||
        !(now instanceof Date) ||
        !Number.isFinite(now.getTime())
      ) {
        throw new TypeError('Valid trusted account revocation identity is required.');
      }

      return prismaClient.$transaction(async (tx) => {
        if (
          typeof tx?.authSession?.updateMany !== 'function' ||
          typeof tx?.mfaSessionAssurance?.updateMany !== 'function'
        ) {
          throw new TypeError('Transactional session and MFA repositories are required.');
        }

        // Revoking the sessions and independent proofs must be all-or-nothing.
        // Expired records are included so evidence cannot be reused or revived.
        const sessions = await tx.authSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        });
        const assurances = await tx.mfaSessionAssurance.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        });

        if (
          !Number.isSafeInteger(sessions?.count) ||
          sessions.count < 0 ||
          !Number.isSafeInteger(assurances?.count) ||
          assurances.count < 0
        ) {
          throw new Error('Invalid transactional revocation result.');
        }

        return Object.freeze({
          revokedSessions: sessions.count,
          revokedAssurances: assurances.count,
        });
      });
    },
  });
}
