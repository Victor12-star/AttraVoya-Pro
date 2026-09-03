import { AuthenticationError } from '../errors/app-error.js';
import { ERROR_CODES } from '../errors/error-codes.js';

/**
 * Build a Fastify authentication hook backed by current database state.
 *
 * The access JWT proves that AttraVoya issued the token, but authorization data
 * is intentionally reloaded from PostgreSQL. This prevents a stale token from
 * keeping Admin permissions after a role is removed or an account is suspended.
 */
export function createAuthenticateHook({ repository }) {
  if (!repository?.findAuthorizationContextByUserId) {
    throw new TypeError('Authentication repository is not configured.');
  }

  return async function authenticate(request) {
    let tokenPayload;

    try {
      tokenPayload = await request.jwtVerify();
    } catch {
      // Do not expose JWT parsing/signature details; those details can help an
      // attacker tune invalid tokens and are not useful to normal users.
      throw new AuthenticationError();
    }

    const userId = typeof tokenPayload?.sub === 'string' ? tokenPayload.sub : null;
    if (!userId) {
      throw new AuthenticationError();
    }

    const auth = await repository.findAuthorizationContextByUserId(userId);
    if (!auth) {
      throw new AuthenticationError();
    }

    if (auth.status !== 'ACTIVE') {
      throw new AuthenticationError('This account is not currently active.', {
        code: ERROR_CODES.ACCOUNT_NOT_ACTIVE,
      });
    }

    request.auth = auth;
  };
}
