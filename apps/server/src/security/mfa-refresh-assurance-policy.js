const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_ASSURANCE_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * Isolated authorization decision for a future browser/mobile session refresh.
 *
 * Session IDs and user IDs MUST originate from a validated server-side
 * refresh-session lookup, never from HTTP inputs. The assurance repository
 * MUST return an independently persisted, server-issued MFA proof bound to
 * that exact user and session. Do not trust a JWT/client "mfa" claim.
 *
 * No routes, tokens, cookies or sessions are created by this module.
 * Future integration must enforce this decision on every refresh path.
 *
 * @param {{
 *   sessionPolicy: {evaluate: (userId: string) => Promise<{decision: string}>},
 *   assuranceRepository: {findVerifiedAssurance: (input: {
 *     userId: string, sessionId: string
 *   }) => Promise<any>}
 * }} dependencies
 */
export function createMfaRefreshAssurancePolicy({ sessionPolicy, assuranceRepository }) {
  if (
    typeof sessionPolicy?.evaluate !== 'function' ||
    typeof assuranceRepository?.findVerifiedAssurance !== 'function'
  ) {
    throw new TypeError('MFA refresh assurance dependencies are required.');
  }

  return Object.freeze({
    /** @param {{userId?: string, sessionId?: string, now?: number}} [input] */
    async evaluate({ userId, sessionId, now = Date.now() } = {}) {
      if (
        typeof userId !== 'string' ||
        !ID_PATTERN.test(userId) ||
        typeof sessionId !== 'string' ||
        !ID_PATTERN.test(sessionId) ||
        !Number.isSafeInteger(now) ||
        now < 0
      ) {
        return Object.freeze({ decision: 'DENY' });
      }

      // Current authorization and factor enrollment must be checked on each
      // refresh. A disabled account or role change must not inherit assurance.
      const policy = await sessionPolicy.evaluate(userId);
      if (policy?.decision === 'PASSWORD_ONLY') {
        return Object.freeze({ decision: 'ALLOW_PASSWORD_ONLY' });
      }
      if (policy?.decision !== 'MFA_REQUIRED') {
        return Object.freeze({ decision: 'DENY' });
      }

      // Server-persisted assurance must be independently verified. This
      // interface cannot be satisfied by a request-body or JWT claim.
      const assurance = await assuranceRepository.findVerifiedAssurance({ userId, sessionId });
      const verifiedAt = assurance?.verifiedAt;
      const expiresAt = assurance?.expiresAt;
      if (
        assurance?.userId !== userId ||
        assurance?.sessionId !== sessionId ||
        assurance?.revokedAt != null ||
        !(verifiedAt instanceof Date) ||
        !Number.isFinite(verifiedAt.getTime()) ||
        !(expiresAt instanceof Date) ||
        !Number.isFinite(expiresAt.getTime()) ||
        verifiedAt.getTime() > now ||
        now - verifiedAt.getTime() > MAX_ASSURANCE_AGE_MS ||
        expiresAt.getTime() <= now
      ) {
        return Object.freeze({ decision: 'DENY' });
      }

      // This is only a decision helper. Token issuance must still recheck
      // current authorization and use atomic refresh-token rotation.
      return Object.freeze({ decision: 'ALLOW_MFA_ASSURED' });
    },
  });
}
