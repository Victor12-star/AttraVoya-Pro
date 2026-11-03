import { describe, expect, it, vi } from 'vitest';

import { createMfaEnrollmentRepository } from './mfa-enrollment-repository.js';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const EXPIRY = new Date(NOW.getTime() + 600_000);
const HASHES = Array.from({ length: 10 }, (_, index) => index.toString(16).padStart(64, '0'));

function fixture() {
  let credential = null;
  let hashes = [];
  const prismaClient = {
    mfaTotpCredential: {
      updateMany: vi.fn(async ({ where, data }) => {
        if (!credential || credential.userId !== where.userId || credential.enabledAt) {
          return { count: 0 };
        }
        Object.assign(credential, data);
        return { count: 1 };
      }),
      create: vi.fn(async ({ data }) => {
        if (credential) throw Object.assign(new Error('unique conflict'), { code: 'P2002' });
        credential = { ...data, secretEnvelope: data.secretEnvelope, enabledAt: null };
        return credential;
      }),
      findUnique: vi.fn(async () => credential),
    },
    mfaRecoveryCode: { createMany: vi.fn() },
    $transaction: vi.fn(async (callback) => {
      const beforeCredential = credential && { ...credential };
      const beforeHashes = [...hashes];
      const tx = {
        mfaTotpCredential: {
          updateMany: vi.fn(async ({ where, data }) => {
            if (
              !credential ||
              credential.userId !== where.userId ||
              credential.secretEnvelope !== where.secretEnvelope ||
              credential.enabledAt ||
              credential.pendingExpiresAt <= where.pendingExpiresAt.gt ||
              credential.lastAcceptedCounter >= where.lastAcceptedCounter.lt
            ) {
              return { count: 0 };
            }
            Object.assign(credential, data);
            return { count: 1 };
          }),
        },
        mfaRecoveryCode: {
          createMany: vi.fn(async ({ data }) => {
            hashes.push(...data);
            if (prismaClient.failRecoveryInsert) throw new Error('database insert failed');
            return { count: data.length };
          }),
        },
      };
      try {
        return await callback(tx);
      } catch (error) {
        credential = beforeCredential;
        hashes = beforeHashes;
        throw error;
      }
    }),
  };

  return {
    repository: createMfaEnrollmentRepository({ prismaClient }),
    prismaClient,
    getCredential: () => credential,
    getHashes: () => hashes,
  };
}

function pending() {
  return {
    userId: 'user-one',
    secretEnvelope: 'mfa1:opaque-envelope',
    now: NOW,
    expiresAt: EXPIRY,
  };
}

function confirmation() {
  return {
    userId: 'user-one',
    expectedEnvelope: 'mfa1:opaque-envelope',
    counter: 300,
    now: NOW,
    recoveryCodeHashes: HASHES,
  };
}

describe('MFA enrollment repository atomicity', () => {
  it('stores and retrieves pending encrypted credentials without enabling them', async () => {
    const { repository, getCredential } = fixture();
    expect(await repository.createPendingEnrollment(pending())).toBe(true);
    expect(getCredential().enabledAt).toBeNull();
    expect(await repository.findPendingEnrollment('user-one')).toMatchObject({
      secretEnvelope: pending().secretEnvelope,
    });
  });

  it('replaces an unconfirmed pending enrollment but never an active factor', async () => {
    const { repository, getCredential } = fixture();
    await repository.createPendingEnrollment(pending());
    expect(
      await repository.createPendingEnrollment({
        ...pending(),
        secretEnvelope: 'mfa1:new-envelope',
      }),
    ).toBe(true);
    expect(getCredential().secretEnvelope).toBe('mfa1:new-envelope');
    expect(
      await repository.completeEnrollment({
        ...confirmation(),
        expectedEnvelope: 'mfa1:new-envelope',
      }),
    ).toBe(true);
    expect(await repository.createPendingEnrollment(pending())).toBe(false);
  });

  it('activates and inserts ten hashes in a single database transaction', async () => {
    const { repository, prismaClient, getCredential, getHashes } = fixture();
    await repository.createPendingEnrollment(pending());
    expect(await repository.completeEnrollment(confirmation())).toBe(true);
    expect(prismaClient.$transaction).toHaveBeenCalledOnce();
    expect(getCredential().enabledAt).toEqual(NOW);
    expect(getCredential().lastAcceptedCounter).toBe(300);
    expect(getHashes()).toHaveLength(10);
    expect(getHashes()[0]).toEqual({ userId: 'user-one', codeHash: HASHES[0] });
    expect(await repository.completeEnrollment(confirmation())).toBe(false);
    expect(getHashes()).toHaveLength(10);
  });

  it('rejects changed envelope and expired or replayed confirmation', async () => {
    const { repository, getHashes } = fixture();
    await repository.createPendingEnrollment(pending());
    expect(
      await repository.completeEnrollment({
        ...confirmation(),
        expectedEnvelope: 'mfa1:wrong',
      }),
    ).toBe(false);
    expect(
      await repository.completeEnrollment({
        ...confirmation(),
        now: EXPIRY,
      }),
    ).toBe(false);
    expect(getHashes()).toHaveLength(0);
  });

  it('rolls back activation when recovery-code insertion fails', async () => {
    const { repository, prismaClient, getCredential, getHashes } = fixture();
    await repository.createPendingEnrollment(pending());
    prismaClient.failRecoveryInsert = true;
    await expect(repository.completeEnrollment(confirmation())).rejects.toThrow(
      'database insert failed',
    );
    expect(getCredential().enabledAt).toBeNull();
    expect(getHashes()).toHaveLength(0);
  });

  it('rejects malformed and duplicate recovery hashes before writing', async () => {
    const { repository, prismaClient } = fixture();
    await repository.createPendingEnrollment(pending());
    await expect(
      repository.completeEnrollment({
        ...confirmation(),
        recoveryCodeHashes: [...HASHES.slice(0, 9), HASHES[0]],
      }),
    ).rejects.toThrow('distinct');
    expect(prismaClient.$transaction).not.toHaveBeenCalled();
  });

  it('does not swallow unexpected database write errors', async () => {
    const { repository, prismaClient } = fixture();
    prismaClient.mfaTotpCredential.create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(repository.createPendingEnrollment(pending())).rejects.toThrow(
      'database unavailable',
    );
  });
});
