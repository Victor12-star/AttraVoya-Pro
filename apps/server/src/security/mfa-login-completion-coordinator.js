const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CODE_PATTERN = /^[0-9]{6}$/;

/**
 * Route-free completion of a pre-session privileged MFA challenge.
 *
 * The challenge service MUST enforce account binding, expiry, replay
 * protection and atomic single-use consumption. Recheck current privileged
 * authorization both before and after challenge completion, so disabled
 * accounts, role removal and factor changes fail closed.
 *
 * This result is NOT a permission to issue a session. The future HTTP
 * integration must recheck current authorization at token issuance and
 * protect every web/mobile/refresh/alternate path; no routes use this helper.
 *
 * @param {{
 *   sessionPolicy: { evaluate: (userId: string) => Promise<{decision: string}> },
 *   challengeService: { complete: (input: {
 *     userId: string, challengeToken: string, code: string, now?: number
 *   }) => Promise<boolean> }
 * }} dependencies
 */
export function createMfaLoginCompletionCoordinator({ sessionPolicy, challengeService }) {
  if (
    typeof sessionPolicy?.evaluate !== 'function' ||
    typeof challengeService?.complete !== 'function'
  ) {
    throw new TypeError('MFA login completion dependencies are required.');
  }

  return Object.freeze({
    async complete({ userId, challengeToken, code, now } = {}) {
      if (
        typeof userId !== 'string' ||
        !USER_ID_PATTERN.test(userId) ||
        typeof challengeToken !== 'string' ||
        !TOKEN_PATTERN.test(challengeToken) ||
        typeof code !== 'string' ||
        !CODE_PATTERN.test(code) ||
        (now !== undefined && (!Number.isSafeInteger(now) || now < 0))
      ) {
        return Object.freeze({ decision: 'DENY' });
      }

      const before = await sessionPolicy.evaluate(userId);
      if (before?.decision !== 'MFA_REQUIRED') {
        return Object.freeze({ decision: 'DENY' });
      }

      const consumed = await challengeService.complete({
        userId,
        challengeToken,
        code,
        ...(now === undefined ? {} : { now }),
      });
      if (consumed !== true) {
        return Object.freeze({ decision: 'DENY' });
      }

      // Consumed challenges are never reusable, including if a role or
      // enrollment change prevents the post-verification authorization.
      const after = await sessionPolicy.evaluate(userId);
      if (after?.decision !== 'MFA_REQUIRED') {
        return Object.freeze({ decision: 'DENY' });
      }

      return Object.freeze({ decision: 'MFA_VERIFIED', userId });
    },
  });
}
