import argon2 from 'argon2';
import { AuthenticationError } from '../../errors/app-error.js';
import { ERROR_CODES } from '../../errors/error-codes.js';

export function createAdminRoleService(repository) {
  return {
    async setAdminRole({ actorId, currentPassword, email, action }) {
      const actor = await repository.ownerCredential(actorId);
      const valid = actor?.passwordHash
        ? await argon2.verify(actor.passwordHash, currentPassword)
        : false;

      if (!actor || actor.deletedAt || actor.status !== 'ACTIVE' || !actor.emailVerifiedAt || !valid) {
        throw new AuthenticationError('Owner password confirmation failed.', {
          code: ERROR_CODES.INVALID_CREDENTIALS,
        });
      }

      return repository.setAdminRole({
        actorId,
        expectedPasswordHash: actor.passwordHash,
        email,
        action,
      });
    },
  };
}
