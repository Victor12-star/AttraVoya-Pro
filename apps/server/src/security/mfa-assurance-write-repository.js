const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function validId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function validDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/**
 * Inactive, server-only MFA assurance persistence.
 *
 * The caller MUST independently complete a single-use MFA challenge and
 * reauthorize the account immediately before calling createVerifiedAssurance.
 * Never accept the proof inputs from a request body or JWT claim.
 *
 * The parameterized INSERT SELECT checks the live session and its owner in
 * the same database statement that creates a single, non-replaceable proof.
 * No routes, login flows or token issuance import this helper.
 */
export function createMfaAssuranceWriteRepository({ prismaClient }) {
  if (
    typeof prismaClient?.$executeRaw !== 'function' ||
    typeof prismaClient?.mfaSessionAssurance?.updateMany !== 'function'
  ) {
    throw new TypeError('MFA assurance write persistence dependencies are required.');
  }

  return Object.freeze({
    /** @param {{userId: string, sessionId: string, verifiedAt: Date, expiresAt: Date, now: Date}} input */
    async createVerifiedAssurance({ userId, sessionId, verifiedAt, expiresAt, now }) {
      if (
        !validId(userId) ||
        !validId(sessionId) ||
        !validDate(verifiedAt) ||
        !validDate(expiresAt) ||
        !validDate(now) ||
        verifiedAt.getTime() > now.getTime() ||
        expiresAt.getTime() <= now.getTime() ||
        expiresAt.getTime() <= verifiedAt.getTime() ||
        now.getTime() - verifiedAt.getTime() > MAX_AGE_MS ||
        expiresAt.getTime() - verifiedAt.getTime() > MAX_AGE_MS
      ) {
        throw new TypeError('Invalid server-issued MFA assurance evidence.');
      }

      // The session must belong to this user, be active, and outlive the
      // bounded MFA assurance. A collision never replaces old assurance.
      const inserted = await prismaClient.$executeRaw`
        INSERT INTO "MfaSessionAssurance"
          ("sessionId", "userId", "verifiedAt", "expiresAt", "createdAt")
        SELECT ${sessionId}, ${userId}, ${verifiedAt}, ${expiresAt}, ${now}
        FROM "AuthSession"
        WHERE "id" = ${sessionId}
          AND "userId" = ${userId}
          AND "revokedAt" IS NULL
          AND "expiresAt" >= ${expiresAt}
          AND "expiresAt" > ${now}
        ON CONFLICT ("sessionId") DO NOTHING
      `;
      return inserted === 1;
    },

    /**
     * Bulk invalidate independently persisted MFA assurance for one account.
     * Invoke after trusted account lockout, factor reset or administrator
     * privilege removal. This helper does not revoke AuthSession tokens:
     * production integration MUST perform both in a controlled transaction.
     *
     * @param {{userId: string, now: Date}} input
     */
    async revokeAllVerifiedAssurances({ userId, now }) {
      if (!validId(userId) || !validDate(now)) {
        throw new TypeError('Invalid MFA assurance account revocation identity.');
      }

      // The user restriction prevents one account's lockout from affecting
      // another account. Conditional updates make repeated calls harmless.
      const changed = await prismaClient.mfaSessionAssurance.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      if (!Number.isSafeInteger(changed?.count) || changed.count < 0) {
        throw new Error('Invalid MFA assurance revocation result.');
      }
      return changed.count;
    },

    /** @param {{userId: string, sessionId: string, now: Date}} input */
    async revokeVerifiedAssurance({ userId, sessionId, now }) {
      if (!validId(userId) || !validId(sessionId) || !validDate(now)) {
        throw new TypeError('Invalid MFA assurance revocation identity.');
      }

      const changed = await prismaClient.mfaSessionAssurance.updateMany({
        where: { userId, sessionId, revokedAt: null },
        data: { revokedAt: now },
      });
      return changed.count === 1;
    },
  });
}
