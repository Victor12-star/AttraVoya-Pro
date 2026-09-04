import { prisma } from '@attravoya/database';
import { ROLES } from '@attravoya/constants';

function mapAuthorizationContext(user) {
  if (!user || user.deletedAt) return null;

  const roles = user.roles.map(({ role }) => role.key);
  const permissions = [
    ...new Set(
      user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)),
    ),
  ];

  return {
    id: user.id,
    email: user.email,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    roles,
    permissions,
  };
}

const authorizationSelect = {
  id: true,
  email: true,
  status: true,
  emailVerifiedAt: true,
  deletedAt: true,
  roles: {
    select: {
      role: {
        select: {
          key: true,
          permissions: {
            select: {
              permission: { select: { key: true } },
            },
          },
        },
      },
    },
  },
};

/**
 * Authentication persistence is kept behind this repository so services do not
 * depend on Prisma query shapes. It also gives security tests a clean place to
 * inject in-memory doubles without opening a real PostgreSQL connection.
 */
export const authRepository = Object.freeze({
  async findAuthorizationContextByUserId(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: authorizationSelect,
    });

    return mapAuthorizationContext(user);
  },

  async findUserByEmailForLogin(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
        emailVerifiedAt: true,
        deletedAt: true,
      },
    });
  },

  async createUser({ email, passwordHash, firstName, lastName }) {
    return prisma.$transaction(async (tx) => {
      const userRole = await tx.role.findUnique({ where: { key: ROLES.USER } });
      if (!userRole) {
        throw new Error('Required USER role has not been seeded.');
      }

      return tx.user.create({
        data: {
          email,
          passwordHash,
          profile: {
            create: {
              firstName: firstName ?? null,
              lastName: lastName ?? null,
            },
          },
          roles: {
            create: { roleId: userRole.id },
          },
        },
        select: { id: true, email: true, status: true, emailVerifiedAt: true },
      });
    });
  },

  async createEmailVerificationToken({ userId, tokenHash, expiresAt }) {
    return prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  },

  async verifyEmailByTokenHash(tokenHash, now = new Date()) {
    return prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!token || token.usedAt || token.expiresAt <= now || token.user.deletedAt) {
        return null;
      }

      await tx.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: now },
      });

      return tx.user.update({
        where: { id: token.userId },
        data: { status: 'ACTIVE', emailVerifiedAt: now },
        select: { id: true, email: true, status: true, emailVerifiedAt: true },
      });
    });
  },

  async createSession({ userId, refreshTokenHash, userAgent, ipHash, expiresAt }) {
    return prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash,
        userAgent: userAgent ?? null,
        ipHash: ipHash ?? null,
        expiresAt,
      },
      select: { id: true, userId: true, expiresAt: true },
    });
  },

  async findActiveSessionByRefreshHash(refreshTokenHash, now = new Date()) {
    return prisma.authSession
      .findUnique({
        where: { refreshTokenHash },
        include: {
          user: {
            select: authorizationSelect,
          },
        },
      })
      .then((session) => {
        if (!session || session.revokedAt || session.expiresAt <= now) return null;
        const auth = mapAuthorizationContext(session.user);
        if (!auth) return null;
        return { ...session, auth };
      });
  },

  async rotateSession({ sessionId, refreshTokenHash, lastUsedAt }) {
    return prisma.authSession.update({
      where: { id: sessionId },
      data: { refreshTokenHash, lastUsedAt },
      select: { id: true, userId: true, expiresAt: true },
    });
  },

  async revokeSessionByRefreshHash(refreshTokenHash, revokedAt = new Date()) {
    return prisma.authSession.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt },
    });
  },

  async updateLastLogin(userId, at = new Date()) {
    return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: at } });
  },

  async createPasswordResetToken({ userId, tokenHash, expiresAt }) {
    // Invalidate prior unused reset tokens so only the newest email can reset
    // the password. This narrows the window if an older email is exposed.
    return prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      return tx.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
    });
  },

  async findUserIdByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, deletedAt: true },
    });
    return user && !user.deletedAt ? user.id : null;
  },

  async resetPasswordByTokenHash({ tokenHash, passwordHash, now = new Date() }) {
    return prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!token || token.usedAt || token.expiresAt <= now || token.user.deletedAt) {
        return null;
      }

      await tx.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: now } });
      await tx.authSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });

      return tx.user.update({
        where: { id: token.userId },
        data: { passwordHash },
        select: { id: true, email: true },
      });
    });
  },
});
