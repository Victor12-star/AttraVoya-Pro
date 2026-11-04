import { createPrivilegedMfaEnrollmentService } from './mfa-enrollment-composition.js';
import { parseMfaEncryptionKey } from './mfa-key-configuration.js';

/**
 * Build the isolated privileged enrollment service from a separately managed
 * MFA key. No environment is read at module import time and no HTTP routes
 * are registered here. Missing or malformed configuration fails closed.
 *
 * @param {{ encodedEncryptionKey?: string, authenticationRepository?: any,
 *   enrollmentRepository?: any,
 *   verifyHash?: ((hash: string, password: string) => Promise<boolean>) }} options
 */
export function createConfiguredPrivilegedMfaEnrollmentService({
  encodedEncryptionKey,
  authenticationRepository,
  enrollmentRepository,
  verifyHash,
} = {}) {
  const encryptionKey = parseMfaEncryptionKey(encodedEncryptionKey);
  return createPrivilegedMfaEnrollmentService({
    encryptionKey,
    ...(authenticationRepository ? { authenticationRepository } : {}),
    ...(enrollmentRepository ? { enrollmentRepository } : {}),
    ...(verifyHash ? { verifyHash } : {}),
  });
}
