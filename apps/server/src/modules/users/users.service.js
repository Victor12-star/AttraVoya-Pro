import { randomBytes } from 'node:crypto';

import argon2 from 'argon2';

import { AuthenticationError } from '../../errors/app-error.js';
import { ERROR_CODES } from '../../errors/error-codes.js';

export function createUsersService(repository) {
  if (!repository) throw new TypeError('Users repository is required.');

  return {
    async deleteCurrentAccount({ userId, password }) {
      const user = await repository.findForAccountDeletion(userId);
      const passwordMatches =
        user?.passwordHash && (await argon2.verify(user.passwordHash, password));

      if (!user || user.deletedAt || !passwordMatches) {
        throw new AuthenticationError('Password confirmation is incorrect.', {
          code: ERROR_CODES.INVALID_CREDENTIALS,
        });
      }

      // Replace the credential even though the account is deactivated. This
      // prevents a retained password hash from remaining useful after erasure.
      const replacementPasswordHash = await argon2.hash(randomBytes(32), {
        type: argon2.argon2id,
      });
      const deleted = await repository.deleteAccountData({
        userId,
        replacementPasswordHash,
        deletedAt: new Date(),
      });

      if (!deleted) {
        throw new AuthenticationError('This account is no longer active.', {
          code: ERROR_CODES.ACCOUNT_NOT_ACTIVE,
        });
      }
    },
  };
}
