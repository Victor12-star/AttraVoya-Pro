import { decryptTotpSecret } from './mfa-secret-crypto.js';
import { verifyTotp } from './totp.js';

/**
 * Verify an already enabled factor without granting a session or token.
 * The repository MUST atomically compare and advance lastAcceptedCounter.
 * This primitive is intentionally not connected to any HTTP or login route.
 */
export function createMfaFactorVerificationCore({ repository, encryptionKey }) {
  if (
    !repository ||
    typeof repository.findEnabledFactor !== 'function' ||
    typeof repository.consumeTotpCounter !== 'function' ||
    !Buffer.isBuffer(encryptionKey) ||
    encryptionKey.length !== 32
  ) {
    throw new TypeError('Protected MFA verification dependencies are required.');
  }

  return Object.freeze({
    async verify({ userId, code, now = Date.now() }) {
      if (
        typeof userId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(userId) ||
        typeof code !== 'string' ||
        !/^[0-9]{6}$/.test(code)
      ) {
        return false;
      }
      if (!Number.isSafeInteger(now) || now < 0) {
        throw new RangeError('Invalid MFA verification time.');
      }
      const factor = await repository.findEnabledFactor(userId);
      if (
        !factor ||
        !(factor.enabledAt instanceof Date) ||
        !Number.isFinite(factor.enabledAt.getTime()) ||
        factor.enabledAt.getTime() > now ||
        typeof factor.secretEnvelope !== 'string' ||
        !Number.isSafeInteger(factor.lastAcceptedCounter) ||
        factor.lastAcceptedCounter < -1
      ) {
        return false;
      }

      // Wrong key, forged account binding or tampered ciphertext must fail
      // without consuming a counter or creating an authentication session.
      const secret = decryptTotpSecret({
        envelope: factor.secretEnvelope,
        userId,
        key: encryptionKey,
      });
      const counter = verifyTotp({
        secret,
        code,
        now,
        lastAcceptedCounter: factor.lastAcceptedCounter,
      });
      if (counter === null) return false;

      // A concurrent request and an identical code MUST NOT both succeed.
      // Database compare-and-swap checks enabled state, unchanged envelope,
      // and a strictly increasing counter, in the same atomic operation.
      return (
        (await repository.consumeTotpCounter({
          userId,
          expectedEnvelope: factor.secretEnvelope,
          counter,
        })) === true
      );
    },
  });
}
