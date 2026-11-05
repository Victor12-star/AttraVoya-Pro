import { ROLES } from '@attravoya/constants';

import { authRepository } from '../modules/auth/auth.repository.js';
import { mfaFactorVerificationRepository } from './mfa-factor-verification-repository.js';

const PRIVILEGED_ROLES = new Set([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Evaluate the current server-side authorization and factor enrollment
 * before a future privileged login or session renewal.
 *
 * This is a decision helper, NOT a token or session issuance permission.
 * The future login integration must enforce the decision on every web,
 * mobile, refresh and alternative credential path, then recheck current
 * authorization before issuing credentials. No live routes use this yet.
 *
 * Fail closed on invalid identities, inactive/deleted/unverified accounts,
 * missing factor enrollment, and persistence errors.
 */
export function createMfaPrivilegedSessionPolicy({
  repository = authRepository,
  factorRepository = mfaFactorVerificationRepository,
} = {}) {
  if (
    typeof repository?.findAuthorizationContextByUserId !== 'function' ||
    typeof factorRepository?.findEnabledFactor !== 'function'
  ) {
    throw new TypeError('MFA privileged session policy dependencies are required.');
  }

  return Object.freeze({
    async evaluate(userId) {
      if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId)) {
        return Object.freeze({ decision: 'DENY' });
      }

      const authorization = await repository.findAuthorizationContextByUserId(userId);
      if (
        !authorization ||
        authorization.id !== userId ||
        authorization.status !== 'ACTIVE' ||
        !(authorization.emailVerifiedAt instanceof Date) ||
        !Number.isFinite(authorization.emailVerifiedAt.getTime()) ||
        !Array.isArray(authorization.roles)
      ) {
        return Object.freeze({ decision: 'DENY' });
      }

      if (!authorization.roles.some((role) => PRIVILEGED_ROLES.has(role))) {
        return Object.freeze({ decision: 'PASSWORD_ONLY' });
      }

      const factor = await factorRepository.findEnabledFactor(userId);
      if (
        !factor ||
        !(factor.enabledAt instanceof Date) ||
        !Number.isFinite(factor.enabledAt.getTime())
      ) {
        return Object.freeze({ decision: 'ENROLLMENT_REQUIRED' });
      }
      return Object.freeze({ decision: 'MFA_REQUIRED' });
    },
  });
}
