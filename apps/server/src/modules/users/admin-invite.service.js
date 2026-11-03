import { createHash } from 'node:crypto';

import argon2 from 'argon2';

import { AuthenticationError, ServiceUnavailableError } from '../../errors/app-error.js';
import { ERROR_CODES } from '../../errors/error-codes.js';

/**
 * A registration invitation is informational, not an authorization token.
 * After the invited person registers and verifies their address, the owner
 * must separately assign ADMIN with the protected role-management operation.
 */
export function createAdminInviteService({ repository, sendInvitation }) {
  if (!repository) throw new TypeError('Invite repository is required.');
  return {
    async invite({ actorId, email, currentPassword }) {
      const owner = await repository.ownerCredential(actorId);
      const passwordValid = owner?.passwordHash
        ? await argon2.verify(owner.passwordHash, currentPassword)
        : false;
      if (
        !owner ||
        owner.status !== 'ACTIVE' ||
        owner.deletedAt ||
        !owner.emailVerifiedAt ||
        !passwordValid
      ) {
        throw new AuthenticationError('Owner password confirmation failed.', {
          code: ERROR_CODES.INVALID_CREDENTIALS,
        });
      }

      // Recheck privilege and unchanged credentials directly from PostgreSQL.
      const authorized = await repository.confirmOwner(actorId, owner.passwordHash);
      if (!authorized) {
        throw new AuthenticationError('Owner authorization changed. Sign in again.');
      }
      if (typeof sendInvitation !== 'function') {
        throw new ServiceUnavailableError('Administrator invitation email is not configured.');
      }

      await sendInvitation({ to: email });
      const emailFingerprint = createHash('sha256').update(email.toLowerCase()).digest('hex');
      await repository.recordInvitation({
        actorId,
        email: email.toLowerCase(),
        emailFingerprint,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      return { sent: true, requiresRegistrationAndOwnerApproval: true };
    },

    async list({ page, limit }) {
      return repository.listInvitations({ page, limit });
    },

    async revoke({ actorId, currentPassword, invitationId }) {
      const owner = await repository.ownerCredential(actorId);
      const valid = owner?.passwordHash
        ? await argon2.verify(owner.passwordHash, currentPassword)
        : false;
      if (!owner || owner.status !== 'ACTIVE' || owner.deletedAt ||
          !owner.emailVerifiedAt || !valid) {
        throw new AuthenticationError('Owner password confirmation failed.', {
          code: ERROR_CODES.INVALID_CREDENTIALS,
        });
      }
      const revoked = await repository.revokeInvitation({
        actorId,
        expectedPasswordHash: owner.passwordHash,
        invitationId,
      });
      if (!revoked) {
        throw new AuthenticationError('Invitation could not be revoked. Please refresh and sign in again.');
      }
      return { revoked: true };
    },
  };
}
