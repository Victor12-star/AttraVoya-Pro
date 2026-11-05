import argon2 from 'argon2';

import { authRepository } from '../modules/auth/auth.repository.js';

// Match the existing authentication service's constant-work nonexistent-user
// password check. Never expose whether a supplied email has an account.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$92MtwVsaoXu8abiCXihzkA$ODo6hVQNrmeaQ/JrYX75p5viQqJw4Yi74j/Cyy41QEA';

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Password verification for a future pre-session MFA login.
 *
 * This module is deliberately separate from the active auth service: it does
 * not create refresh sessions, sign JWTs, return account roles, set cookies
 * or register routes. Its caller must evaluate current server-side MFA policy
 * and recheck authorization before eventual credential issuance.
 *
 * @param {{
 *   repository?: {findUserByEmailForLogin: (email: string) => Promise<any>},
 *   verifyPassword?: (hash: string, password: string) => Promise<boolean>
 * }} [options]
 */
export function createMfaPasswordAuthenticator({
  repository = authRepository,
  verifyPassword = argon2.verify,
} = {}) {
  if (
    typeof repository?.findUserByEmailForLogin !== 'function' ||
    typeof verifyPassword !== 'function'
  ) {
    throw new TypeError('MFA password verification dependencies are required.');
  }

  return async function authenticatePassword(input) {
    const email = input?.email;
    const password = input?.password;
    if (
      typeof email !== 'string' ||
      email.length === 0 ||
      email.length > 254 ||
      typeof password !== 'string' ||
      password.length === 0 ||
      password.length > 1024
    ) {
      return null;
    }

    const user = await repository.findUserByEmailForLogin(email);
    // Unknown accounts must still incur an Argon2 password verification.
    const validPassword = (await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, password)) === true;

    if (
      !validPassword ||
      !user ||
      typeof user.id !== 'string' ||
      !USER_ID_PATTERN.test(user.id) ||
      user.deletedAt != null ||
      user.status !== 'ACTIVE' ||
      !(user.emailVerifiedAt instanceof Date) ||
      !Number.isFinite(user.emailVerifiedAt.getTime())
    ) {
      return null;
    }

    return Object.freeze({ userId: user.id });
  };
}
