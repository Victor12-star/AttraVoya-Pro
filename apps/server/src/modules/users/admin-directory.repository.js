import { prisma } from '@attravoya/database';

/**
 * Owner-only user directory with bounded pagination and explicit public
 * fields. Password hashes, session data and private profile fields are never
 * retrieved by this read query.
 */
export function createAdminDirectoryRepository(database = prisma) {
  return {
    async listUsers({ page, limit }) {
      const where = { deletedAt: null };
      const [total, users] = await database.$transaction([
        database.user.count({ where }),
        database.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            email: true,
            status: true,
            emailVerifiedAt: true,
            createdAt: true,
            roles: { select: { role: { select: { key: true } } } },
          },
        }),
      ]);
      return {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          status: user.status,
          verified: Boolean(user.emailVerifiedAt),
          createdAt: user.createdAt.toISOString(),
          roles: user.roles.map(({ role }) => role.key).sort(),
        })),
      };
    },
  };
}
export const adminDirectoryRepository = createAdminDirectoryRepository();
