import { encryptTotpSecret, decryptTotpSecret } from './mfa-secret-crypto.js';
import { generateMfaRecoveryCodes, hashMfaRecoveryCode } from './mfa-recovery-codes.js';
import { generateTotpSecret, totpProvisioningUri, verifyTotp } from './totp.js';

const PENDING_LIFETIME_MS = 10 * 60 * 1000;

/**
 * Service boundary for a protected, inactive MFA enrollment.
 * The repository must compare and swap pending state and atomically enable
 * the factor with recovery hashes; these methods intentionally expose no route.
 */
export function createMfaEnrollmentCore({ repository, encryptionKey, verifyPassword }) {
  if (
    !repository ||
    typeof repository.createPendingEnrollment !== 'function' ||
    typeof repository.findPendingEnrollment !== 'function' ||
    typeof repository.completeEnrollment !== 'function' ||
    typeof verifyPassword !== 'function'
  ) {
    throw new TypeError('Protected MFA enrollment dependencies are required.');
  }

  async function prepare({ userId, account, password, now = Date.now() }) {
    if (!Number.isSafeInteger(now) || now < 0) throw new RangeError('Invalid time.');
    if (typeof password !== 'string' || !password) throw new TypeError('Password required.');

    // Reauthentication MUST happen server-side against the current user,
    // not a client-declared flag or a session token alone.
    if ((await verifyPassword({ userId, password })) !== true) {
      throw new Error('MFA reauthentication failed.');
    }

    const secret = generateTotpSecret();
    const secretEnvelope = encryptTotpSecret({ secret, userId, key: encryptionKey });
    const expiresAt = new Date(now + PENDING_LIFETIME_MS);
    const created = await repository.createPendingEnrollment({
      userId,
      secretEnvelope,
      expiresAt,
      now: new Date(now),
    });
    if (created !== true) throw new Error('MFA enrollment is unavailable.');

    // No provisioning material is returned before the pending write succeeds.
    return {
      provisioningUri: totpProvisioningUri({ secret, issuer: 'AttraVoya Pro', account }),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async function confirm({ userId, code, now = Date.now() }) {
    if (!Number.isSafeInteger(now) || now < 0) throw new RangeError('Invalid time.');
    const pending = await repository.findPendingEnrollment(userId);
    if (
      !pending ||
      pending.enabledAt ||
      !(pending.pendingExpiresAt instanceof Date) ||
      pending.pendingExpiresAt.getTime() <= now
    ) {
      throw new Error('MFA enrollment is unavailable.');
    }

    const secret = decryptTotpSecret({
      envelope: pending.secretEnvelope,
      userId,
      key: encryptionKey,
    });
    const counter = verifyTotp({
      secret,
      code,
      now,
      lastAcceptedCounter: pending.lastAcceptedCounter,
    });
    if (counter === null) throw new Error('MFA confirmation failed.');

    const recoveryCodes = generateMfaRecoveryCodes();
    const recoveryCodeHashes = recoveryCodes.map((recoveryCode) =>
      hashMfaRecoveryCode({ userId, code: recoveryCode }),
    );
    const completed = await repository.completeEnrollment({
      userId,
      expectedEnvelope: pending.secretEnvelope,
      counter,
      now: new Date(now),
      recoveryCodeHashes,
    });
    // The DB operation must perform a single atomic compare-and-swap of the
    // pending credential, counter and all recovery hashes, or return false.
    if (completed !== true) throw new Error('MFA confirmation failed.');

    // Raw recovery codes may be displayed once; never log or persist them.
    return { recoveryCodes };
  }

  return Object.freeze({ prepare, confirm });
}
