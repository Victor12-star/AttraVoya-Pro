import argon2 from 'argon2';
import { describe, expect, it, vi } from 'vitest';

import { createAuthService } from './auth.service.js';

function serviceFor(repository) {
  return createAuthService({
    repository,
    issueAccessToken: () => 'access-token',
  });
}

describe('authenticated password change', () => {
  it('requires the current password and revokes sessions on success', async () => {
    const oldHash = await argon2.hash('OriginalPassword123', { type: argon2.argon2id });
    let changedHash = '';
    const repository = {
      findPasswordHashByUserId: vi.fn(async () => ({
        passwordHash: oldHash,
        status: 'ACTIVE',
        deletedAt: null,
        emailVerifiedAt: new Date(),
      })),
      changePasswordAndRevokeSessions: vi.fn(async (input) => {
        changedHash = input.passwordHash;
        return true;
      }),
    };
    await serviceFor(repository).changePassword({
      userId: 'user-1',
      currentPassword: 'OriginalPassword123',
      newPassword: 'DifferentPassword456',
    });
    expect(repository.changePasswordAndRevokeSessions).toHaveBeenCalledWith({
      userId: 'user-1',
      expectedHash: oldHash,
      passwordHash: expect.any(String),
    });
    expect(await argon2.verify(changedHash, 'DifferentPassword456')).toBe(true);
  });

  it('rejects an incorrect current password without making changes', async () => {
    const oldHash = await argon2.hash('OriginalPassword123', { type: argon2.argon2id });
    const repository = {
      findPasswordHashByUserId: async () => ({
        passwordHash: oldHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        deletedAt: null,
      }),
      changePasswordAndRevokeSessions: vi.fn(),
    };
    await expect(
      serviceFor(repository).changePassword({
        userId: 'user-1',
        currentPassword: 'WrongPassword999',
        newPassword: 'DifferentPassword456',
      }),
    ).rejects.toThrow('Current password is incorrect');
    expect(repository.changePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('rejects password reuse', async () => {
    const oldHash = await argon2.hash('OriginalPassword123', { type: argon2.argon2id });
    const repository = {
      findPasswordHashByUserId: async () => ({
        passwordHash: oldHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        deletedAt: null,
      }),
      changePasswordAndRevokeSessions: vi.fn(),
    };
    await expect(
      serviceFor(repository).changePassword({
        userId: 'user-1',
        currentPassword: 'OriginalPassword123',
        newPassword: 'OriginalPassword123',
      }),
    ).rejects.toThrow('different');
    expect(repository.changePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('rejects a stale concurrent password update', async () => {
    const oldHash = await argon2.hash('OriginalPassword123', { type: argon2.argon2id });
    const repository = {
      findPasswordHashByUserId: async () => ({
        passwordHash: oldHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        deletedAt: null,
      }),
      changePasswordAndRevokeSessions: vi.fn(async () => false),
    };
    await expect(
      serviceFor(repository).changePassword({
        userId: 'user-1',
        currentPassword: 'OriginalPassword123',
        newPassword: 'DifferentPassword456',
      }),
    ).rejects.toThrow('could not be completed');
  });
});
