import { ROLES } from '@attravoya/constants';

/**
 * Explicit one-time provisioning of an EXISTING verified account.
 * This is an operator-only database operation, never exposed over HTTP.
 * All checks and the role assignment share one serializable transaction.
 */
export async function provisionFirstOwner(database, email) {
  if (!database || typeof database.$transaction !== 'function') {
    throw new TypeError('A database client is required.');
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 320) {
    throw new Error('A valid first-owner email is required.');
  }
  const normalizedEmail = email.trim().toLowerCase();

  return database.$transaction(
    async (tx) => {
      // Serialize competing operator invocations across connections.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(21473, 514)`;

      const priorOwners = await tx.userRole.count({
        where: { role: { key: ROLES.SUPER_ADMIN } },
      });
      if (priorOwners !== 0) {
        throw new Error('A Super Admin already exists. First-owner provisioning is disabled.');
      }

      const user = await tx.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          status: true,
          deletedAt: true,
          emailVerifiedAt: true,
        },
      });
      if (!user || user.deletedAt || user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
        throw new Error('An existing, active, email-verified account is required.');
      }

      const role = await tx.role.findUnique({
        where: { key: ROLES.SUPER_ADMIN },
        select: { id: true },
      });
      if (!role) {
        throw new Error('SUPER_ADMIN role is missing. Run the reference-data seed first.');
      }

      await tx.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      await tx.adminAuditLog.create({
        data: {
          actorUserId: user.id,
          action: 'FIRST_OWNER_PROVISIONED',
          resourceType: 'USER',
          resourceId: user.id,
          metadata: { source: 'explicit_operator_bootstrap' },
        },
      });

      return { provisioned: true };
    },
    { isolationLevel: 'Serializable', timeout: 10_000 },
  );
}
