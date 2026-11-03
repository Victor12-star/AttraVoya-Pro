import { describe, expect, it, vi } from 'vitest';

import { provisionFirstOwner } from './first-owner-provisioning.js';

/**
 * @param {{
 *   alreadyExists?: boolean,
 *   user?: {id: string, status: string, deletedAt: Date | null, emailVerifiedAt: Date | null} | null,
 *   role?: {id: string} | null,
 * }} [options]
 */
function createDatabase({
  alreadyExists = false,
  user = {
    id: 'account-1',
    status: 'ACTIVE',
    deletedAt: null,
    emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  role = { id: 'super-role' },
} = {}) {
  const tx = {
    $queryRaw: vi.fn(async () => [{ pg_advisory_xact_lock: null }]),
    userRole: {
      count: vi.fn(async () => (alreadyExists ? 1 : 0)),
      create: vi.fn(async () => ({})),
    },
    user: { findUnique: vi.fn(async () => user) },
    role: { findUnique: vi.fn(async () => role) },
    adminAuditLog: { create: vi.fn(async () => ({})) },
  };
  const database = {
    $transaction: vi.fn(async (callback) => callback(tx)),
  };
  return { database, tx };
}

describe('first owner provisioning', () => {
  it('promotes only a preexisting active verified account and writes an audit entry', async () => {
    const { database, tx } = createDatabase();
    await expect(provisionFirstOwner(database, 'OWNER@EXAMPLE.TEST')).resolves.toEqual({
      provisioned: true,
    });
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'owner@example.test' },
      select: expect.any(Object),
    });
    expect(tx.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'account-1', roleId: 'super-role' },
    });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'FIRST_OWNER_PROVISIONED',
        resourceId: 'account-1',
      }),
    });
    expect(database.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    );
  });

  it('cannot run after another Super Admin has already been assigned', async () => {
    const { database, tx } = createDatabase({ alreadyExists: true });
    await expect(provisionFirstOwner(database, 'owner@example.test')).rejects.toThrow(
      'already exists',
    );
    expect(tx.user.findUnique).not.toHaveBeenCalled();
    expect(tx.userRole.create).not.toHaveBeenCalled();
  });

  it.each([
    [null],
    [{ id: 'account-1', status: 'ACTIVE', deletedAt: new Date(), emailVerifiedAt: new Date() }],
    [{ id: 'account-1', status: 'PENDING_VERIFICATION', deletedAt: null, emailVerifiedAt: null }],
  ])('rejects missing, deleted and unverified accounts (%j)', async (user) => {
    const { database, tx } = createDatabase({ user });
    await expect(provisionFirstOwner(database, 'owner@example.test')).rejects.toThrow(
      'existing, active, email-verified',
    );
    expect(tx.userRole.create).not.toHaveBeenCalled();
  });

  it('rejects invalid inputs before accessing the database', async () => {
    const { database } = createDatabase();
    await expect(provisionFirstOwner(database, 'not-an-email')).rejects.toThrow('valid');
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it('does not assign ownership without a seeded Super Admin role', async () => {
    const { database, tx } = createDatabase({ role: null });
    await expect(provisionFirstOwner(database, 'owner@example.test')).rejects.toThrow(
      'role is missing',
    );
    expect(tx.userRole.create).not.toHaveBeenCalled();
  });
});
