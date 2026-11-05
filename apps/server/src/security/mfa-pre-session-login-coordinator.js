const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Build a route-free pre-session login coordinator. The caller supplies a
 * password authenticator that returns a trusted userId only after validating
 * password, account activation, email verification and deletion status.
 *
 * This helper never signs JWTs, creates refresh sessions, sets cookies or
 * activates MFA. Future HTTP integration must enforce the result on every
 * browser/mobile login and refresh path; it must recheck authorization
 * immediately before any token issuance, including after completed MFA.
 *
 * @param {{
 *   authenticatePassword: (input: any) => Promise<{ userId: string } | null>,
 *   sessionPolicy: { evaluate: (userId: string) => Promise<{ decision: string }> },
 *   challengeService: { issue: (input: { userId: string }) => Promise<any> }
 * }} dependencies
 */
export function createMfaPreSessionLoginCoordinator({
  authenticatePassword,
  sessionPolicy,
  challengeService,
}) {
  if (
    typeof authenticatePassword !== 'function' ||
    typeof sessionPolicy?.evaluate !== 'function' ||
    typeof challengeService?.issue !== 'function'
  ) {
    throw new TypeError('MFA pre-session login dependencies are required.');
  }

  return Object.freeze({
    async authenticate(input) {
      const credentials = await authenticatePassword(input);
      const userId = credentials?.userId;
      if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId)) {
        return Object.freeze({ decision: 'DENY' });
      }

      // Current authorization and factor enrollment always come from the
      // trusted server-side policy; never accept a role from user input.
      const { decision } = await sessionPolicy.evaluate(userId);
      if (decision === 'PASSWORD_ONLY') {
        return Object.freeze({ decision: 'PASSWORD_VERIFIED', userId });
      }
      if (decision === 'ENROLLMENT_REQUIRED') {
        return Object.freeze({ decision: 'ENROLLMENT_REQUIRED' });
      }
      if (decision !== 'MFA_REQUIRED') {
        return Object.freeze({ decision: 'DENY' });
      }

      // Issue an opaque, time-limited challenge only AFTER validating
      // credentials and checking current privileged account requirements.
      const challenge = await challengeService.issue({ userId });
      if (
        typeof challenge?.challengeToken !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(challenge.challengeToken) ||
        typeof challenge.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(challenge.expiresAt))
      ) {
        throw new TypeError('MFA challenge service returned an invalid challenge.');
      }
      return Object.freeze({
        decision: 'MFA_CHALLENGE',
        challengeToken: challenge.challengeToken,
        expiresAt: challenge.expiresAt,
      });
    },
  });
}
