import { ROLES } from '@attravoya/constants';

import { authRepository } from '../modules/auth/auth.repository.js';
import { createMfaEnrollmentCore } from './mfa-enrollment-core.js';
import { mfaEnrollmentRepository } from './mfa-enrollment-repository.js';
import { createPrivilegedMfaPasswordVerifier } from './mfa-privileged-reauth.js';

const PRIVILEGED_ROLES = new Set([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

function assertPrivilegedContext(context, userId) {
  if (
    !context ||
    context.id !== userId ||
    context.status !== 'ACTIVE' ||
    !context.emailVerifiedAt ||
    typeof context.email !== 'string' ||
    !context.email ||
    !Array.isArray(context.roles) ||
    !context.roles.some((role) => PRIVILEGED_ROLES.has(role))
  ) {
    throw new Error('MFA enrollment is unavailable.');
  }
}

/**
 * Composes the protected MFA enrollment primitives without exposing a route.
 * The caller must obtain userId from a verified authenticated session.
 * The account label is always fetched from trusted server-side persistence.
 */
export function createPrivilegedMfaEnrollmentService({
  authenticationRepository = authRepository,
  enrollmentRepository = mfaEnrollmentRepository,
  encryptionKey,
  verifyHash,
} = {}) {
  if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32) {
    throw new TypeError('A dedicated 32-byte MFA encryption key is required.');
  }
  if (typeof authenticationRepository?.findAuthorizationContextByUserId !== 'function') {
    throw new TypeError('MFA authorization repository is required.');
  }

  const verifyPassword = createPrivilegedMfaPasswordVerifier({
    repository: authenticationRepository,
    ...(verifyHash ? { verifyHash } : {}),
  });
  const enrollment = createMfaEnrollmentCore({
    repository: enrollmentRepository,
    encryptionKey,
    verifyPassword,
  });

  async function requireCurrentPrivileges(userId) {
    if (typeof userId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
      throw new Error('MFA enrollment is unavailable.');
    }
    const context = await authenticationRepository.findAuthorizationContextByUserId(userId);
    assertPrivilegedContext(context, userId);
    return context;
  }

  return Object.freeze({
    async prepare({ userId, password, now }) {
      const context = await requireCurrentPrivileges(userId);
      return enrollment.prepare({ userId, account: context.email, password, now });
    },

    async confirm({ userId, code, now }) {
      // Do not allow an enrollment initiated before privilege revocation
      // to be confirmed after the account loses administrator access.
      await requireCurrentPrivileges(userId);
      return enrollment.confirm({ userId, code, now });
    },
  });
}
