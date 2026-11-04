import { createHash, randomBytes } from 'node:crypto';

const PURPOSE = 'ADMIN_LOGIN';
const LIFETIME_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function validUserId(userId) {
  return typeof userId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(userId);
}

function challengeDigest(token) {
  return createHash('sha256').update('attravoya:mfa:login:v1:').update(token).digest('hex');
}

/**
 * Isolated pre-session MFA challenge; it never creates an access token,
 * refresh token, or authenticated session, and it registers no HTTP routes.
 * Caller MUST independently establish password validity, account status
 * and current privileged role before issuing a challenge.
 *
 * Repository contract:
 * - createChallenge persists only the token hash.
 * - findChallenge returns a stored challenge by hash.
 * - recordFailedAttempt atomically increments attempts only if active,
 *   unconsumed, unexpired and still below MAX_ATTEMPTS.
 * - consumeChallenge atomically marks a matching, active, unconsumed,
 *   unexpired challenge consumed, with attempts below MAX_ATTEMPTS.
 * All repository operations MUST fail closed on unavailable persistence.
 *
 * @param {{repository: any, verifyFactor: (input: {userId: string, code: string, now: number}) => Promise<boolean>}} dependencies
 */
export function createMfaLoginChallengeCore({ repository, verifyFactor }) {
  if (
    typeof repository?.createChallenge !== 'function' ||
    typeof repository?.findChallenge !== 'function' ||
    typeof repository?.recordFailedAttempt !== 'function' ||
    typeof repository?.consumeChallenge !== 'function' ||
    typeof verifyFactor !== 'function'
  ) {
    throw new TypeError('Protected MFA login challenge dependencies are required.');
  }

  return Object.freeze({
    async issue({ userId, now = Date.now() }) {
      if (!validUserId(userId)) throw new TypeError('Invalid MFA account identifier.');
      if (!Number.isSafeInteger(now) || now < 0) throw new RangeError('Invalid MFA time.');
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(now + LIFETIME_MS);
      await repository.createChallenge({
        userId,
        challengeHash: challengeDigest(token),
        purpose: PURPOSE,
        expiresAt,
      });
      return { challengeToken: token, expiresAt: expiresAt.toISOString() };
    },

    async complete({ userId, challengeToken, code, now = Date.now() }) {
      if (
        !validUserId(userId) ||
        typeof challengeToken !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(challengeToken) ||
        typeof code !== 'string' ||
        !/^[0-9]{6}$/.test(code)
      ) {
        return false;
      }
      if (!Number.isSafeInteger(now) || now < 0) throw new RangeError('Invalid MFA time.');
      const challengeHash = challengeDigest(challengeToken);
      const record = await repository.findChallenge(challengeHash);
      if (
        !record ||
        record.userId !== userId ||
        record.purpose !== PURPOSE ||
        record.consumedAt !== null ||
        !(record.expiresAt instanceof Date) ||
        !Number.isFinite(record.expiresAt.getTime()) ||
        record.expiresAt.getTime() <= now ||
        !Number.isSafeInteger(record.attempts) ||
        record.attempts < 0 ||
        record.attempts >= MAX_ATTEMPTS
      ) {
        return false;
      }

      const verified = (await verifyFactor({ userId, code, now })) === true;
      if (!verified) {
        await repository.recordFailedAttempt({
          userId,
          challengeHash,
          purpose: PURPOSE,
          now: new Date(now),
          maxAttempts: MAX_ATTEMPTS,
        });
        return false;
      }

      // One-time challenge consumption is required in addition to TOTP
      // replay protection. A race may consume the TOTP before losing the
      // challenge compare-and-swap, but MUST NOT issue another session.
      return (
        (await repository.consumeChallenge({
          userId,
          challengeHash,
          purpose: PURPOSE,
          now: new Date(now),
          maxAttempts: MAX_ATTEMPTS,
        })) === true
      );
    },
  });
}
