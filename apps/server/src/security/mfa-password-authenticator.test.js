import { describe, expect, it, vi } from 'vitest';

import { createMfaPasswordAuthenticator } from './mfa-password-authenticator.js';

const ACCOUNT = {
  id: 'admin-one',
  passwordHash: 'stored-password-hash',
  status: 'ACTIVE',
  deletedAt: null,
  emailVerifiedAt: new Date('2026-11-05T12:00:00.000Z'),
};

/** @param {any} [user] */
function fixture(user = ACCOUNT) {
  const repository = {
    findUserByEmailForLogin: vi.fn(async () => user),
  };
  const verifyPassword = vi.fn(async () => true);
  const authenticate = createMfaPasswordAuthenticator({ repository, verifyPassword });
  return { repository, verifyPassword, authenticate };
}

describe('isolated pre-session MFA password authenticator', () => {
  it('returns only a trusted user ID after password and active-account checks', async () => {
    const { authenticate, repository, verifyPassword } = fixture();
    const result = await authenticate({ email: 'admin@example.test', password: 'correct' });
    expect(result).toEqual({ userId: 'admin-one' });
    expect(Object.isFrozen(result)).toBe(true);
    expect(repository.findUserByEmailForLogin).toHaveBeenCalledWith('admin@example.test');
    expect(verifyPassword).toHaveBeenCalledWith('stored-password-hash', 'correct');
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
    expect(result).not.toHaveProperty('roles');
  });

  it('uses a dummy Argon2 verification for unknown users', async () => {
    const { authenticate, verifyPassword } = fixture(null);
    expect(await authenticate({ email: 'unknown@example.test', password: 'incorrect' })).toBeNull();
    expect(verifyPassword).toHaveBeenCalledOnce();
    expect(verifyPassword).toHaveBeenCalledWith(
      expect.stringMatching(/^\$argon2id\$/),
      'incorrect',
    );
  });

  it('denies wrong passwords without returning account information', async () => {
    const { authenticate, verifyPassword } = fixture();
    verifyPassword.mockResolvedValueOnce(false);
    expect(await authenticate({ email: 'admin@example.test', password: 'incorrect' })).toBeNull();
  });

  it('denies deleted, unverified, inactive or malformed users', async () => {
    for (const invalid of [
      { ...ACCOUNT, deletedAt: new Date() },
      { ...ACCOUNT, emailVerifiedAt: null },
      { ...ACCOUNT, emailVerifiedAt: new Date('invalid') },
      { ...ACCOUNT, status: 'SUSPENDED' },
      { ...ACCOUNT, id: '../admin' },
    ]) {
      const { authenticate } = fixture(invalid);
      expect(await authenticate({ email: 'admin@example.test', password: 'correct' })).toBeNull();
    }
  });

  it('denies malformed input without calling persistence or password verifier', async () => {
    const { authenticate, repository, verifyPassword } = fixture();
    for (const input of [
      undefined,
      {},
      { email: null, password: 'secret' },
      { email: 'admin@example.test', password: null },
      { email: 'admin@example.test', password: '' },
      { email: 'x'.repeat(255), password: 'secret' },
    ]) {
      expect(await authenticate(input)).toBeNull();
    }
    expect(repository.findUserByEmailForLogin).not.toHaveBeenCalled();
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('fails closed when persistence or password verification is unavailable', async () => {
    const { authenticate, repository, verifyPassword } = fixture();
    repository.findUserByEmailForLogin.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(authenticate({ email: 'admin@example.test', password: 'a' })).rejects.toThrow(
      'database unavailable',
    );
    verifyPassword.mockRejectedValueOnce(new Error('verifier unavailable'));
    await expect(authenticate({ email: 'admin@example.test', password: 'a' })).rejects.toThrow(
      'verifier unavailable',
    );
  });

  it('rejects incomplete security dependencies', () => {
    expect(() =>
      createMfaPasswordAuthenticator({
        repository: /** @type {any} */ ({}),
        verifyPassword: /** @type {any} */ (null),
      }),
    ).toThrow('dependencies');
  });
});
