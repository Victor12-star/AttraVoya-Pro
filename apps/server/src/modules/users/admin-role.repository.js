import { prisma } from '@attravoya/database';
import { ROLES } from '@attravoya/constants';
import { ConflictError, ValidationError } from '../../errors/app-error.js';

export function createAdminRoleRepository(database = prisma) {
  return {
    async ownerCredential(userId) {
      return database.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, status: true, emailVerifiedAt: true, deletedAt: true },
      });
    },

    async setAdminRole({ actorId, expectedPasswordHash, email, action }) {
      return database.$transaction(
        async (tx) => {
          // Prevent concurrent changes from racing and audit each effective mutation.
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(21473, 515)`;

          const actor = await tx.user.findUnique({
            where: { id: actorId },
            select: {
              id: true,
              passwordHash: true,
              status: true,
              deletedAt: true,
              roles: { select: { role: { select: { key: true } } } },
            },
          });
          if (
            !actor ||
            actor.status !== 'ACTIVE' ||
            actor.deletedAt ||
            actor.passwordHash !== expectedPasswordHash ||
            !actor.roles.some(({ role }) => role.key === ROLES.SUPER_ADMIN)
          ) {
            throw new ConflictError('Owner authorization has changed. Sign in again.');
          }

          const target = await tx.user.findUnique({
            where: { email },
            select: {
              id: true,
              emailVerifiedAt: true,
              status: true,
              deletedAt: true,
              roles: { select: { role: { select: { key: true } } } },
            },
          });
          if (
            !target ||
            target.deletedAt ||
            !target.emailVerifiedAt ||
            target.status !== 'ACTIVE'
          ) {
            throw new ValidationError(
              'The target must have an existing, active and verified account.',
            );
          }
          if (
            target.id === actorId ||
            target.roles.some(({ role }) => role.key === ROLES.SUPER_ADMIN)
          ) {
            throw new ValidationError('Owner accounts cannot be modified through this control.');
          }

          const admin = await tx.role.findUnique({
            where: { key: ROLES.ADMIN },
            select: { id: true },
          });
          if (!admin) throw new ConflictError('Administrator role is not configured.');

          const assigned = target.roles.some(({ role }) => role.key === ROLES.ADMIN);
          if ((action === 'grant' && assigned) || (action === 'revoke' && !assigned)) {
            return { changed: false, role: ROLES.ADMIN, action };
          }

          if (action === 'grant') {
            await tx.userRole.create({ data: { userId: target.id, roleId: admin.id } });
          } else {
            await tx.userRole.delete({
              where: { userId_roleId: { userId: target.id, roleId: admin.id } },
            });
          }

          // Require a fresh login for either privilege elevation or revocation.
          await tx.authSession.updateMany({
            where: { userId: target.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });

          await tx.adminAuditLog.create({
            data: {
              actorUserId: actorId,
              action: action === 'grant' ? 'ADMIN_ROLE_GRANTED' : 'ADMIN_ROLE_REVOKED',
              resourceType: 'USER',
              resourceId: target.id,
              metadata: { role: ROLES.ADMIN },
            },
          });
          return { changed: true, role: ROLES.ADMIN, action };
        },
        { isolationLevel: 'Serializable', timeout: 10000 },
      );
    },
  };
}

export const adminRoleRepository = createAdminRoleRepository();
