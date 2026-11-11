import { createMfaAccountSessionRevocation } from './mfa-account-session-revocation.js';
import { createMfaAssuredRefreshRotation } from './mfa-assured-refresh-rotation.js';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Inactive account-scoped synchronization protocol for MFA refresh and logout.
 *
 * The PostgreSQL transaction advisory lock is identical for both operations.
 * Every future session creation, privileged role mutation, and token issuer
 * must participate in a coordinated protocol before this can be used live.
 * A successful rotation does not itself authorize access-token issuance.
 *
 * No live routes or auth services import this coordinator.
 */
export function createMfaAccountLockCoordinator({ prismaClient }) {
  if (typeof prismaClient?.$transaction !== 'function') {
    throw new TypeError('MFA account lock coordinator requires Prisma transactions.');
  }

  async function withAccountLock(userId, action) {
    if (typeof userId !== 'string' || !ID_PATTERN.test(userId)) {
      throw new TypeError('Valid MFA account lock identity is required.');
    }
    return prismaClient.$transaction(async (tx) => {
      if (typeof tx?.$queryRaw !== 'function') {
        throw new TypeError('PostgreSQL transaction advisory lock is required.');
      }

      // Parameterized tagged template: no untrusted SQL string interpolation.
      // Same userId must be used for all cooperating account operations.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
      return action(tx);
    });
  }

  return Object.freeze({
    async revokeAll(input) {
      return withAccountLock(input?.userId, (tx) => {
        const repository = createMfaAccountSessionRevocation({
          // Execute the existing all-or-nothing revocation in this lock-held tx.
          prismaClient: { $transaction: (action) => action(tx) },
        });
        return repository.revokeAll(input);
      });
    },

    async rotate(input) {
      return withAccountLock(input?.userId, (tx) => {
        const rotation = createMfaAssuredRefreshRotation({ prismaClient: tx });
        return rotation.rotate(input);
      });
    },
  });
}
