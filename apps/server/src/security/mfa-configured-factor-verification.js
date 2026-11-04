import { createMfaFactorVerificationCore } from './mfa-factor-verification-core.js';
import { mfaFactorVerificationRepository } from './mfa-factor-verification-repository.js';
import { parseMfaEncryptionKey } from './mfa-key-configuration.js';

/**
 * Compose MFA factor verification with a dedicated, explicitly supplied key.
 * No environment is read at module import time. This does not register routes,
 * issue sessions, or activate MFA. A future challenge handler must enforce
 * challenge expiry, one-time use, throttling and account authorization.
 *
 * @param {{ encodedEncryptionKey?: string, repository?: any }} [options]
 */
export function createConfiguredMfaFactorVerifier({
  encodedEncryptionKey,
  repository = mfaFactorVerificationRepository,
} = {}) {
  const encryptionKey = parseMfaEncryptionKey(encodedEncryptionKey);
  return createMfaFactorVerificationCore({ repository, encryptionKey });
}
