import argon2 from 'argon2';
import { ROLES } from '@attravoya/constants';

import { authRepository } from '../modules/auth/auth.repository.js';

const PRIVILEGED_ROLES = new Set([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

/**
 * Server-side reauthentication for a future authenticated enrollment route.
 * The user ID must come from the verified session, never the request body.
 * This does not authorize route access or switch on MFA enforcement.
 */
export function createPrivilegedMfaPasswordVerifier({
  repository = authRepository,
  verifyHash = (hash, password) => argon2.verify(hash, password),
} = {}) {
  if (
    typeof repository?.findPasswordHashByUserId !== 'function' ||
    typeof repository?.findAuthorizationContextByUserId !== 'function' ||
    typeof verifyHash !== 'function'
  ) {
    throw new TypeError('MFA reauthentication dependencies are required.');
  }

  return async function verifyPassword({ userId, password }) {
    if (
      typeof userId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(userId) ||
      typeof password !== 'string' ||
      password.length === 0
    ) {
      return false;
    }

    // Fetch both checks from trusted server persistence. Reject deleted,
    // inactive, unverified, and no-longer-privileged users.
    const [account, authorization] = await Promise.all([
      repository.findPasswordHashByUserId(userId),
      repository.findAuthorizationContextByUserId(userId),
    ]);
    if (
      !account ||
      account.deletedAt ||
      account.status !== 'ACTIVE' ||
      !account.emailVerifiedAt ||
      typeof account.passwordHash !== 'string' ||
      !authorization ||
      authorization.status !== 'ACTIVE' ||
      !authorization.emailVerifiedAt ||
      !Array.isArray(authorization.roles) ||
      !authorization.roles.some((role) => PRIVILEGED_ROLES.has(role))
    ) {
      return false;
    }

    // The caller receives only a boolean, never the database password hash.
    return (await verifyHash(account.passwordHash, password)) === true;
  };
}
