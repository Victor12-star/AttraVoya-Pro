import { describe, expect, it, vi } from 'vitest';

import { createMfaLoginChallengeRepository } from './mfa-login-challenge-repository.js';

const NOW = new Date('2026-11-04T21:00:00.000Z');
const LATER = new Date(NOW.getTime() + 300_000);
const HASH = 'a'.repeat(64);
const INPUT = { userId: 'admin-one', challengeHash: HASH, purpose: 'ADMIN_LOGIN' };

function fixture() {
  /** @type {any} */
  let stored = null;
  const prismaClient = {
    mfaChallenge: {
      create: vi.fn(async ({ data }) => {
        stored = { ...data, attempts: 0, consumedAt: null };
        return stored;
      }),
      findUnique: vi.fn(async ({ where }) =>
        stored?.challengeHash === where.challengeHash ? { ...stored } : null,
      ),
      updateMany: vi.fn(async ({ where, data }) => {
        if (
          !stored ||
          stored.userId !== where.userId ||
          stored.challengeHash !== where.challengeHash ||
          stored.purpose !== where.purpose ||
          stored.consumedAt !== null ||
          stored.expiresAt <= where.expiresAt.gt ||
          stored.attempts >= where.attempts.lt
        ) {
          return { count: 0 };
        }
        if (data.attempts) stored.attempts += data.attempts.increment;
        if (data.consumedAt) stored.consumedAt = data.consumedAt;
        return { count: 1 };
      }),
    },
  };
  const repository = createMfaLoginChallengeRepository({ prismaClient });
  const create = () => repository.createChallenge({ ...INPUT, expiresAt: LATER });
  return { prismaClient, repository, create, getStored: () => stored };
}

describe('atomic Prisma MFA login challenge repository', () => {
  it('refuses missing database methods', () => {
    expect(() => createMfaLoginChallengeRepository({ prismaClient: {} })).toThrow('required');
  });

  it('persists only hashed challenge material and reads narrow challenge fields', async () => {
    const { repository, prismaClient, create } = fixture();
    await create();
    expect(prismaClient.mfaChallenge.create).toHaveBeenCalledWith({
      data: { ...INPUT, expiresAt: LATER },
    });
    expect(await repository.findChallenge(HASH)).toMatchObject({
      ...INPUT,
      attempts: 0,
      consumedAt: null,
    });
    expect(prismaClient.mfaChallenge.findUnique).toHaveBeenCalledWith({
      where: { challengeHash: HASH },
      select: {
        userId: true,
        purpose: true,
        expiresAt: true,
        consumedAt: true,
        attempts: true,
      },
    });
  });

  it('atomically increments failed attempts and refuses attempts after lockout', async () => {
    const { repository, prismaClient, create, getStored } = fixture();
    await create();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        await repository.recordFailedAttempt({
          ...INPUT,
          now: NOW,
          maxAttempts: 5,
        }),
      ).toBe(true);
    }
    expect(getStored().attempts).toBe(5);
    expect(
      await repository.recordFailedAttempt({ ...INPUT, now: NOW, maxAttempts: 5 }),
    ).toBe(false);
    expect(prismaClient.mfaChallenge.updateMany).toHaveBeenCalledWith({
      where: {
        ...INPUT,
        consumedAt: null,
        expiresAt: { gt: NOW },
        attempts: { lt: 5 },
      },
      data: { attempts: { increment: 1 } },
    });
  });

  it('consumes an active challenge exactly once, even during concurrent requests', async () => {
    const { repository, create, getStored } = fixture();
    await create();
    const input = { ...INPUT, now: NOW, maxAttempts: 5 };
    const results = await Promise.all([
      repository.consumeChallenge(input),
      repository.consumeChallenge(input),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect(getStored().consumedAt).toEqual(NOW);
    expect(await repository.recordFailedAttempt(input)).toBe(false);
  });

  it('rejects expired, differently bound and attempt-locked challenges', async () => {
    const { repository, create } = fixture();
    await create();
    const input = { ...INPUT, now: LATER, maxAttempts: 5 };
    expect(await repository.consumeChallenge(input)).toBe(false);
    expect(
      await repository.recordFailedAttempt({ ...input, now: NOW, userId: 'another-user' }),
    ).toBe(false);
    expect(
      await repository.consumeChallenge({ ...input, now: NOW, purpose: 'OTHER' }),
    ).rejects.toThrow('identity');
  });

  it('fails closed on unavailable database and invalid persistence inputs', async () => {
    const { repository, prismaClient, create } = fixture();
    await create();
    prismaClient.mfaChallenge.updateMany.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      repository.consumeChallenge({ ...INPUT, now: NOW, maxAttempts: 5 }),
    ).rejects.toThrow('database unavailable');
    await expect(
      repository.recordFailedAttempt({ ...INPUT, now: NOW, maxAttempts: 100 }),
    ).rejects.toThrow('bounds');
    await expect(repository.findChallenge('raw-secret')).rejects.toThrow('hash');
  });
});
