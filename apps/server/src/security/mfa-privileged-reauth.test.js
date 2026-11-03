import { describe, expect, it, vi } from 'vitest';

import { createPrivilegedMfaPasswordVerifier } from './mfa-privileged-reauth.js';

const ACTIVE = {
  passwordHash: '$argon2id$existing-hash',
  status: 'ACTIVE',
  emailVerifiedAt: new Date('2026-11-03T10:00:00Z'),
  deletedAt: null,
};
const ADMIN = {
  status: 'ACTIVE',
  emailVerifiedAt: new Date('2026-11-03T10:00:00Z'),
  roles: ['ADMIN'],
};

/**
 * @param {any} [account]
 * @param {any} [authorization]
 * @param {boolean} [correctPassword]
 */
function fixture(account = ACTIVE, authorization = ADMIN, correctPassword = true) {
  /** @type {any} */
  const repository = {
    findPasswordHashByUserId: vi.fn(async () => account),
    findAuthorizationContextByUserId: vi.fn(async () => authorization),
  };
  const verifyHash = vi.fn(async () => correctPassword);
  const verifyPassword = createPrivilegedMfaPasswordVerifier({ repository, verifyHash });
  return { repository, verifyHash, verifyPassword };
}

describe('privileged MFA enrollment reauthentication', () => {
  it('requires the current password and confirms current administrator privilege', async () => {
    const { repository, verifyHash, verifyPassword } = fixture();
    expect(await verifyPassword({ userId: 'user-one', password: 'valid' })).toBe(true);
    expect(repository.findAuthorizationContextByUserId).toHaveBeenCalledWith('user-one');
    expect(verifyHash).toHaveBeenCalledWith(ACTIVE.passwordHash, 'valid');
  });

  it('rejects wrong passwords without returning the hash', async () => {
    const { verifyPassword } = fixture(ACTIVE, ADMIN, false);
    expect(await verifyPassword({ userId: 'user-one', password: 'wrong' })).toBe(false);
  });

  it('rejects non-admin, revoked, and missing role assignments', async () => {
    for (const roles of [['USER'], [], undefined]) {
      const { verifyPassword, verifyHash } = fixture(ACTIVE, { ...ADMIN, roles });
      expect(await verifyPassword({ userId: 'user-one', password: 'valid' })).toBe(false);
      expect(verifyHash).not.toHaveBeenCalled();
    }
  });

  it('accepts current SUPER_ADMIN role without trusting a client role claim', async () => {
    const { verifyPassword } = fixture(ACTIVE, { ...ADMIN, roles: ['SUPER_ADMIN'] });
    expect(await verifyPassword({ userId: 'user-one', password: 'valid' })).toBe(true);
  });

  it('rejects inactive, deleted, unverified, or missing accounts', async () => {
    for (const account of [
      null,
      { ...ACTIVE, status: 'SUSPENDED' },
      { ...ACTIVE, deletedAt: new Date() },
      { ...ACTIVE, emailVerifiedAt: null },
      { ...ACTIVE, passwordHash: null },
    ]) {
      const { verifyPassword, verifyHash } = fixture(account);
      expect(await verifyPassword({ userId: 'user-one', password: 'valid' })).toBe(false);
      expect(verifyHash).not.toHaveBeenCalled();
    }
  });

  it('rejects stale authorization state before password verification', async () => {
    for (const authorization of [
      null,
      { ...ADMIN, status: 'SUSPENDED' },
      { ...ADMIN, emailVerifiedAt: null },
    ]) {
      const { verifyPassword, verifyHash } = fixture(ACTIVE, authorization);
      expect(await verifyPassword({ userId: 'user-one', password: 'valid' })).toBe(false);
      expect(verifyHash).not.toHaveBeenCalled();
    }
  });

  it('rejects malformed identity and password inputs without database queries', async () => {
    const { verifyPassword, repository } = fixture();
    for (const input of [
      { userId: '', password: 'valid' },
      { userId: 'bad:user', password: 'valid' },
      { userId: 'user-one', password: '' },
      { userId: 'user-one', password: null },
      { userId: null, password: 'valid' },
    ]) {
      expect(await verifyPassword(input)).toBe(false);
    }
    expect(repository.findPasswordHashByUserId).not.toHaveBeenCalled();
  });

  it('fails closed when the password check throws', async () => {
    const { verifyPassword, verifyHash } = fixture();
    verifyHash.mockRejectedValueOnce(new Error('password verifier unavailable'));
    await expect(verifyPassword({ userId: 'user-one', password: 'valid' })).rejects.toThrow(
      'password verifier unavailable',
    );
  });
});
