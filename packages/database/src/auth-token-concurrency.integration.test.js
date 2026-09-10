import { afterAll, describe, expect, it } from 'vitest';

import { authRepository } from '../../../apps/server/src/modules/auth/auth.repository.js';
import { closeDatabase, prisma } from './index.js';

const describeAuthTokenConcurrency =
  process.env.DATABASE_POOL_EXHAUSTION_TEST === '1' ? describe : describe.skip;

function uniqueFixtureId(prefix) {
  return `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

afterAll(async () => {
  if (process.env.DATABASE_POOL_EXHAUSTION_TEST === '1') {
    await closeDatabase();
  }
});

describeAuthTokenConcurrency('single-use authentication token concurrency', () => {
  it('allows only one concurrent email verification claim', async () => {
    const suffix = uniqueFixtureId('verify');
    const user = await prisma.user.create({
      data: {
        email: `${suffix}@example.test`,
        passwordHash: 'fixture-password-hash',
      },
      select: { id: true },
    });
    const tokenHash = `${suffix}-token`;
    const now = new Date();

    try {
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(now.getTime() + 60_000),
        },
      });

      const results = await Promise.all([
        authRepository.verifyEmailByTokenHash(tokenHash, now),
        authRepository.verifyEmailByTokenHash(tokenHash, now),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);

      const [storedUser, storedToken] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id }, select: { status: true } }),
        prisma.emailVerificationToken.findUnique({
          where: { tokenHash },
          select: { usedAt: true },
        }),
      ]);

      expect(storedUser?.status).toBe('ACTIVE');
      expect(storedToken?.usedAt).toEqual(now);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it('allows only one concurrent password reset and prevents last-writer-wins', async () => {
    const suffix = uniqueFixtureId('reset');
    const user = await prisma.user.create({
      data: {
        email: `${suffix}@example.test`,
        passwordHash: 'original-password-hash',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    const tokenHash = `${suffix}-token`;
    const now = new Date();

    try {
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(now.getTime() + 60_000),
        },
      });
      await prisma.authSession.createMany({
        data: [
          {
            userId: user.id,
            refreshTokenHash: `${suffix}-session-a`,
            expiresAt: new Date(now.getTime() + 60_000),
          },
          {
            userId: user.id,
            refreshTokenHash: `${suffix}-session-b`,
            expiresAt: new Date(now.getTime() + 60_000),
          },
        ],
      });

      const attempts = await Promise.all([
        authRepository
          .resetPasswordByTokenHash({
            tokenHash,
            passwordHash: 'replacement-password-hash-a',
            now,
          })
          .then((result) => ({ result, passwordHash: 'replacement-password-hash-a' })),
        authRepository
          .resetPasswordByTokenHash({
            tokenHash,
            passwordHash: 'replacement-password-hash-b',
            now,
          })
          .then((result) => ({ result, passwordHash: 'replacement-password-hash-b' })),
      ]);

      const winners = attempts.filter(({ result }) => Boolean(result));
      expect(winners).toHaveLength(1);

      const [storedUser, storedToken, activeSessions] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }),
        prisma.passwordResetToken.findUnique({
          where: { tokenHash },
          select: { usedAt: true },
        }),
        prisma.authSession.count({ where: { userId: user.id, revokedAt: null } }),
      ]);

      expect(storedUser?.passwordHash).toBe(winners[0].passwordHash);
      expect(storedToken?.usedAt).toEqual(now);
      expect(activeSessions).toBe(0);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
