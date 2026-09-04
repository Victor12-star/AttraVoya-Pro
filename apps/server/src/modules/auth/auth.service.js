import { createHash, randomBytes } from 'node:crypto';

import argon2 from 'argon2';

import {
  AuthenticationError,
  ConflictError,
  ServiceUnavailableError,
  ValidationError,
} from '../../errors/app-error.js';
import { ERROR_CODES } from '../../errors/error-codes.js';
import { AUTH_TOKEN_BYTES, TOKEN_HASH_ALGORITHM } from './auth.contracts.js';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// Use a real Argon2id hash when an email does not exist so failed logins take
// roughly comparable work and reveal less information through timing.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$92MtwVsaoXu8abiCXihzkA$ODo6hVQNrmeaQ/JrYX75p5viQqJw4Yi74j/Cyy41QEA';

function createOpaqueToken() {
  return randomBytes(AUTH_TOKEN_BYTES).toString('base64url');
}

function hashToken(token) {
  return createHash(TOKEN_HASH_ALGORITHM).update(token).digest('hex');
}

function hashIp(ip) {
  if (!ip) return null;
  // Store a one-way representation of the address for session-abuse analysis
  // rather than retaining raw IP history indefinitely.
  return createHash('sha256').update(ip).digest('hex');
}

function publicUser(auth) {
  return {
    id: auth.id,
    email: auth.email,
    roles: auth.roles ?? [],
    emailVerified: Boolean(auth.emailVerifiedAt),
  };
}

export function createAuthService({ repository, issueAccessToken, refreshSessionDays = 30 }) {
  if (!repository) throw new TypeError('Authentication repository is required.');
  if (typeof issueAccessToken !== 'function') {
    throw new TypeError('Access-token issuer is required.');
  }

  return {
    async register(input) {
      const existing = await repository.findUserByEmailForLogin(input.email);
      if (existing && !existing.deletedAt) {
        // A stable conflict is more useful to a legitimate signup flow than a
        // silent duplicate; login/forgot-password still use generic failures.
        throw new ConflictError('An account with this email already exists.');
      }

      const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

      let user;
      try {
        user = await repository.createUser({ ...input, passwordHash });
      } catch (error) {
        if (error?.code === 'P2002') {
          throw new ConflictError('An account with this email already exists.');
        }
        if (String(error?.message ?? '').includes('USER role')) {
          throw new ServiceUnavailableError('Account registration is temporarily unavailable.', {
            cause: error,
          });
        }
        throw error;
      }

      const verificationToken = createOpaqueToken();
      await repository.createEmailVerificationToken({
        userId: user.id,
        tokenHash: hashToken(verificationToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      });

      // The raw token is returned only to the application layer so the email
      // provider can send it. It must never be logged or stored in PostgreSQL.
      return { user, verificationToken };
    },

    async verifyEmail(token) {
      const user = await repository.verifyEmailByTokenHash(hashToken(token));
      if (!user) {
        throw new ValidationError('This verification link is invalid or has expired.', {
          code: ERROR_CODES.INVALID_OR_EXPIRED_TOKEN,
        });
      }
      return user;
    },

    async login({ email, password, userAgent, ip }) {
      const user = await repository.findUserByEmailForLogin(email);

      // Run a real Argon2 verification only when a hash exists. We deliberately
      // return the same public error for unknown emails and wrong passwords to
      // avoid turning login into an account-enumeration endpoint.
      const validPassword = await argon2.verify(
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        password,
      );

      if (!user || user.deletedAt || !validPassword) {
        throw new AuthenticationError('Email or password is incorrect.', {
          code: ERROR_CODES.INVALID_CREDENTIALS,
        });
      }

      if (!user.emailVerifiedAt) {
        throw new AuthenticationError('Please verify your email before signing in.', {
          code: ERROR_CODES.EMAIL_NOT_VERIFIED,
        });
      }

      if (user.status !== 'ACTIVE') {
        throw new AuthenticationError('This account is not currently active.', {
          code: ERROR_CODES.ACCOUNT_NOT_ACTIVE,
        });
      }

      const auth = await repository.findAuthorizationContextByUserId(user.id);
      if (!auth) throw new AuthenticationError();

      const refreshToken = createOpaqueToken();
      const session = await repository.createSession({
        userId: user.id,
        refreshTokenHash: hashToken(refreshToken),
        userAgent,
        ipHash: hashIp(ip),
        expiresAt: new Date(Date.now() + refreshSessionDays * 24 * 60 * 60 * 1000),
      });

      await repository.updateLastLogin(user.id);

      return {
        accessToken: issueAccessToken(auth),
        refreshToken,
        refreshExpiresAt: session.expiresAt,
        user: publicUser(auth),
      };
    },

    async refresh(refreshToken) {
      if (!refreshToken) throw new AuthenticationError();

      const currentHash = hashToken(refreshToken);
      const session = await repository.findActiveSessionByRefreshHash(currentHash);
      if (!session || session.auth.status !== 'ACTIVE') {
        throw new AuthenticationError('Your session has expired. Please sign in again.');
      }

      // Rotate refresh credentials after every use. A copied old token becomes
      // useless immediately after the legitimate client refreshes its session.
      const nextRefreshToken = createOpaqueToken();
      await repository.rotateSession({
        sessionId: session.id,
        refreshTokenHash: hashToken(nextRefreshToken),
        lastUsedAt: new Date(),
      });

      return {
        accessToken: issueAccessToken(session.auth),
        refreshToken: nextRefreshToken,
        refreshExpiresAt: session.expiresAt,
        user: publicUser(session.auth),
      };
    },

    async logout(refreshToken) {
      if (refreshToken) {
        await repository.revokeSessionByRefreshHash(hashToken(refreshToken));
      }
    },

    async forgotPassword(email) {
      const userId = await repository.findUserIdByEmail(email);
      if (!userId) return { resetToken: null };

      const resetToken = createOpaqueToken();
      await repository.createPasswordResetToken({
        userId,
        tokenHash: hashToken(resetToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      });

      return { resetToken };
    },

    async resetPassword({ token, password }) {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      const user = await repository.resetPasswordByTokenHash({
        tokenHash: hashToken(token),
        passwordHash,
      });

      if (!user) {
        throw new ValidationError('This password-reset link is invalid or has expired.', {
          code: ERROR_CODES.INVALID_OR_EXPIRED_TOKEN,
        });
      }

      return user;
    },
  };
}
