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
      return Boolean(
        owner &&
        owner.passwordHash === expectedHash &&
        owner.status === 'ACTIVE' &&
        owner.emailVerifiedAt &&
        !owner.deletedAt &&
        owner.roles.some(({ role }) => role.key === ROLES.SUPER_ADMIN),
      );
    },
    async recordInvitation({ actorId, email, emailFingerprint, expiresAt }) {
      return database.$transaction(async (tx) => {
        const invitation = await tx.adminInvitation.create({
          data: { email, invitedByUserId: actorId, expiresAt },
          select: { id: true },
        });
        await tx.adminAuditLog.create({
          data: {
            actorUserId: actorId,
            action: 'ADMIN_REGISTRATION_INVITATION_SENT',
            resourceType: 'USER_INVITATION',
            resourceId: invitation.id,
            metadata: { recipientSha256: emailFingerprint, grantsPrivileges: false },
          },
        });
        return invitation;
      });
    },

    async listInvitations({ page, limit, now = new Date() }) {
      const where = {};
      const [total, invitations] = await database.$transaction([
        database.adminInvitation.count({ where }),
        database.adminInvitation.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            email: true,
            invitedByUserId: true,
            sentAt: true,
            expiresAt: true,
            revokedAt: true,
          },
        }),
      ]);
      const emails = [...new Set(invitations.map((invitation) => invitation.email))];
      const recipients = emails.length
        ? await database.user.findMany({
            where: { email: { in: emails }, deletedAt: null },
            select: {
              email: true,
              status: true,
              emailVerifiedAt: true,
              roles: { select: { role: { select: { key: true } } } },
            },
          })
        : [];
      const byEmail = new Map(recipients.map((user) => [user.email, user]));
      return {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        invitations: invitations.map((invitation) => {
          const user = byEmail.get(invitation.email);
          const isAdmin = user?.roles.some(
            ({ role }) => role.key === ROLES.ADMIN || role.key === ROLES.SUPER_ADMIN,
          );
          const status = invitation.revokedAt
            ? 'REVOKED'
            : isAdmin
              ? 'ADMIN_ASSIGNED'
              : invitation.expiresAt <= now
                ? 'EXPIRED'
                : !user
                  ? 'SENT'
                  : user.status === 'ACTIVE' && user.emailVerifiedAt
                    ? 'REGISTERED_VERIFIED'
                    : 'REGISTERED_UNVERIFIED';
          return {
            id: invitation.id,
            email: invitation.email,
            sentAt: invitation.sentAt.toISOString(),
            expiresAt: invitation.expiresAt.toISOString(),
            status,
          };
        }),
      };
    },

    async revokeInvitation({ actorId, expectedPasswordHash, invitationId }) {
      return database.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(21473, 518)`;
          const owner = await tx.user.findUnique({
            where: { id: actorId },
            select: {
              passwordHash: true,
              status: true,
              emailVerifiedAt: true,
              deletedAt: true,
              roles: { select: { role: { select: { key: true } } } },
            },
          });
          if (
            !owner ||
            owner.passwordHash !== expectedPasswordHash ||
            owner.status !== 'ACTIVE' ||
            !owner.emailVerifiedAt ||
            owner.deletedAt ||
            !owner.roles.some(({ role }) => role.key === ROLES.SUPER_ADMIN)
          ) {
            return false;
          }
          const updated = await tx.adminInvitation.updateMany({
            where: { id: invitationId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          if (updated.count !== 1) return false;
          await tx.adminAuditLog.create({
            data: {
              actorUserId: actorId,
              action: 'ADMIN_REGISTRATION_INVITATION_REVOKED',
              resourceType: 'USER_INVITATION',
              resourceId: invitationId,
              metadata: { grantsPrivileges: false },
            },
          });
          return true;
        },
        { isolationLevel: 'Serializable', timeout: 10000 },
      );
    },
  };
}

export const adminInviteRepository = createAdminInviteRepository();
