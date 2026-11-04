import { describe, expect, it, vi } from 'vitest';

import { createMfaFactorVerificationRepository } from './mfa-factor-verification-repository.js';

function fixture() {
  const factor = {
    userId: 'admin-one',
    secretEnvelope: 'mfa1:encrypted-envelope',
    enabledAt: new Date('2026-11-04T00:00:00Z'),
    lastAcceptedCounter: 100,
  };
  const prismaClient = {
    mfaTotpCredential: {
      findUnique: vi.fn(async () => ({ ...factor })),
      updateMany: vi.fn(async ({ where, data }) => {
        if (
          factor.userId !== where.userId ||
          factor.secretEnvelope !== where.secretEnvelope ||
          !factor.enabledAt ||
          !(where.enabledAt.not === null) ||
          factor.lastAcceptedCounter >= where.lastAcceptedCounter.lt
        ) {
          return { count: 0 };
        }
        factor.lastAcceptedCounter = data.lastAcceptedCounter;
        return { count: 1 };
      }),
    },
  };
  const repository = createMfaFactorVerificationRepository({ prismaClient });
  return { factor, prismaClient, repository };
}

describe('Prisma enabled MFA factor verification repository', () => {
  it('selects only account-bound encrypted factor state', async () => {
    const { prismaClient, repository } = fixture();
    const factor = await repository.findEnabledFactor('admin-one');
    expect(factor).toMatchObject({ lastAcceptedCounter: 100 });
    expect(prismaClient.mfaTotpCredential.findUnique).toHaveBeenCalledWith({
      where: { userId: 'admin-one' },
      select: {
        secretEnvelope: true,
        enabledAt: true,
        lastAcceptedCounter: true,
      },
    });
  });

  it('rejects an inactive or nonexistent factor', async () => {
    const { prismaClient, repository } = fixture();
    prismaClient.mfaTotpCredential.findUnique.mockResolvedValueOnce({ enabledAt: null });
    expect(await repository.findEnabledFactor('admin-one')).toBeNull();
    prismaClient.mfaTotpCredential.findUnique.mockResolvedValueOnce(null);
    expect(await repository.findEnabledFactor('admin-one')).toBeNull();
  });

  it('consumes only a strictly increasing counter on an enabled unchanged factor', async () => {
    const { prismaClient, repository } = fixture();
    const consume = (counter) =>
      repository.consumeTotpCounter({
        userId: 'admin-one',
        expectedEnvelope: 'mfa1:encrypted-envelope',
        counter,
      });
    expect(await consume(101)).toBe(true);
    expect(await consume(101)).toBe(false);
    expect(await consume(100)).toBe(false);
    expect(prismaClient.mfaTotpCredential.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'admin-one',
        secretEnvelope: 'mfa1:encrypted-envelope',
        enabledAt: { not: null },
        lastAcceptedCounter: { lt: 101 },
      },
      data: { lastAcceptedCounter: 101 },
    });
  });

  it('allows only one concurrent update of the same counter', async () => {
    const { repository } = fixture();
    const args = {
      userId: 'admin-one',
      expectedEnvelope: 'mfa1:encrypted-envelope',
      counter: 102,
    };
    const outcomes = await Promise.all([
      repository.consumeTotpCounter(args),
      repository.consumeTotpCounter(args),
    ]);
    expect(outcomes.sort()).toEqual([false, true]);
  });

  it('rejects a replaced factor or inactive factor', async () => {
    const { factor, repository } = fixture();
    expect(
      await repository.consumeTotpCounter({
        userId: 'admin-one',
        expectedEnvelope: 'mfa1:old-envelope',
        counter: 102,
      }),
    ).toBe(false);
    factor.enabledAt = null;
    expect(
      await repository.consumeTotpCounter({
        userId: 'admin-one',
        expectedEnvelope: 'mfa1:encrypted-envelope',
        counter: 102,
      }),
    ).toBe(false);
  });

  it('rejects invalid input before any database query', async () => {
    const { prismaClient, repository } = fixture();
    await expect(repository.findEnabledFactor('bad:id')).rejects.toThrow('identifier');
    for (const counter of [-1, 2_147_483_648, NaN, 1.5]) {
      await expect(
        repository.consumeTotpCounter({
          userId: 'admin-one',
          expectedEnvelope: 'mfa1:encrypted-envelope',
          counter,
        }),
      ).rejects.toThrow('Invalid MFA');
    }
    expect(prismaClient.mfaTotpCredential.updateMany).not.toHaveBeenCalled();
  });

  it('propagates persistence failure without reporting successful verification', async () => {
    const { prismaClient, repository } = fixture();
    prismaClient.mfaTotpCredential.updateMany.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    await expect(
      repository.consumeTotpCounter({
        userId: 'admin-one',
        expectedEnvelope: 'mfa1:encrypted-envelope',
        counter: 101,
      }),
    ).rejects.toThrow('database unavailable');
  });
});
