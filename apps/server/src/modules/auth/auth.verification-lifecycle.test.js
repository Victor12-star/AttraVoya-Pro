import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createAuthController } from './auth.controller.js';
import { createAuthService } from './auth.service.js';

function createVerificationRepository() {
  /** @type {{ id: string, email: string, deletedAt: null, emailVerifiedAt: Date | null }} */
  const user = {
    id: 'user-1',
    email: 'traveller@example.test',
    deletedAt: null,
    emailVerifiedAt: null,
  };
  const stored = new Map();
  const snapshots = [];
  return {
    snapshots,
    async findUserByEmailForLogin(email) {
      return email === user.email ? user : null;
    },
    async createEmailVerificationToken({ userId, tokenHash, expiresAt }) {
      expect(userId).toBe(user.id);
      for (const item of stored.values()) item.used = true;
      stored.set(tokenHash, { used: false, expiresAt });
      snapshots.push({ tokenHash, expiresAt });
    },
    async verifyEmailByTokenHash(tokenHash) {
      const record = stored.get(tokenHash);
      if (!record || record.used || record.expiresAt <= new Date()) return null;
      record.used = true;
      user.emailVerifiedAt = new Date();
      return user;
    },
  };
}

function createReply() {
  return {
    send: vi.fn((payload) => payload),
  };
}

describe('email verification resend lifecycle', () => {
  it('stores only token hashes and invalidates the previous link after resend', async () => {
    const repository = createVerificationRepository();
    const service = createAuthService({ repository, issueAccessToken: () => 'unused' });
    const first = await service.resendVerification('traveller@example.test');
    const second = await service.resendVerification('traveller@example.test');

    if (!first.verificationToken || !second.verificationToken) {
      throw new Error('Expected verification tokens');
    }
    expect(first.verificationToken).not.toBe(second.verificationToken);
    expect(repository.snapshots).toHaveLength(2);
    for (const { tokenHash, expiresAt } of repository.snapshots) {
      expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
    expect(repository.snapshots[0].tokenHash).toBe(
      createHash('sha256').update(first.verificationToken).digest('hex'),
    );
    expect(repository.snapshots[0].tokenHash).not.toContain(first.verificationToken);

    await expect(service.verifyEmail(first.verificationToken)).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
    await expect(service.verifyEmail(second.verificationToken)).resolves.toMatchObject({
      id: 'user-1',
    });
    await expect(service.verifyEmail(second.verificationToken)).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  it('does not disclose whether an unknown or already verified address exists', async () => {
    const repository = createVerificationRepository();
    const service = createAuthService({ repository, issueAccessToken: () => 'unused' });
    await expect(service.resendVerification('unknown@example.test')).resolves.toEqual({
      email: null,
      verificationToken: null,
    });
    const issued = await service.resendVerification('traveller@example.test');
    await service.verifyEmail(issued.verificationToken);
    await expect(service.resendVerification('traveller@example.test')).resolves.toEqual({
      email: null,
      verificationToken: null,
    });
    expect(repository.snapshots).toHaveLength(1);
  });

  it('keeps the resend response generic when email delivery fails', async () => {
    const repository = createVerificationRepository();
    const service = createAuthService({ repository, issueAccessToken: () => 'unused' });
    const log = { warn: vi.fn() };
    const delivery = vi.fn().mockRejectedValue(new Error('test-only provider outage'));
    const controller = createAuthController({
      service,
      env: {},
      onVerificationRequested: delivery,
      onPasswordResetRequested: undefined,
    });
    const reply = createReply();

    await controller.resendVerification(
      { body: { email: 'traveller@example.test' }, log },
      reply,
    );

    expect(delivery).toHaveBeenCalledTimes(1);
    expect(reply.send).toHaveBeenCalledWith({
      message:
        'If the account exists and still needs verification, a new verification email will be sent.',
    });
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(repository.snapshots).toHaveLength(1);
  });
});
