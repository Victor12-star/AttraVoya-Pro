import { prisma } from '@attravoya/database';

import { ROLES } from '@attravoya/constants';

export function createAdminInviteRepository(database = prisma) {
  return {
    async ownerCredential(userId) {
      return database.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, status: true, emailVerifiedAt: true, deletedAt: true },
      });
    },
    async confirmOwner(userId, expectedHash) {
      const owner = await database.user.findUnique({
        where: { id: userId },
        select: {
          passwordHash: true,
          status: true,
          emailVerifiedAt: true,
          deletedAt: true,
          roles: { select: { role: { select: { key: true } } } },
        },
      });
      return Boolean(owner && owner.passwordHash === expectedHash &&
        owner.status === 'ACTIVE' && owner.emailVerifiedAt && !owner.deletedAt &&
        owner.roles.some(({ role }) => role.key === ROLES.SUPER_ADMIN));
    },
    async recordInvitation({ actorId, emailFingerprint }) {
      return database.adminAuditLog.create({
        data: {
          actorUserId: actorId,
          action: 'ADMIN_REGISTRATION_INVITATION_SENT',
          resourceType: 'USER_INVITATION',
          metadata: { recipientSha256: emailFingerprint, grantsPrivileges: false },
        },
      });
    },
  };
}

export const adminInviteRepository = createAdminInviteRepository();
