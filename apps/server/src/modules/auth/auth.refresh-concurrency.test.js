import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateMany } = vi.hoisted(() => ({ updateMany: vi.fn() }));

vi.mock('@attravoya/database', () => ({
  prisma: {
    authSession: { updateMany },
  },
}));

const [{ authRepository }, { createAuthService }] = await Promise.all([
  import('./auth.repository.js'),
  import('./auth.service.js'),
]);

beforeEach(() => {
  updateMany.mockReset();
});

describe('refresh-session concurrency', () => {
  it('uses the current refresh hash as an atomic compare-and-swap condition', async () => {
    const lastUsedAt = new Date('2026-09-10T12:00:00.000Z');
    updateMany.mockResolvedValue({ count: 1 });

    const rotated = await authRepository.rotateSession({
      sessionId: 'session-1',
      currentRefreshTokenHash: 'current-hash',
      nextRefreshTokenHash: 'next-hash',
      lastUsedAt,
    });

    expect(rotated).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        refreshTokenHash: 'current-hash',
        revokedAt: null,
      },
      data: {
        refreshTokenHash: 'next-hash',
        lastUsedAt,
      },
    });
  });

  it('reports a stale rotation when another request already changed the session', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      authRepository.rotateSession({
        sessionId: 'session-1',
        currentRefreshTokenHash: 'stale-hash',
        nextRefreshTokenHash: 'unused-next-hash',
        lastUsedAt: new Date(),
      }),
    ).resolves.toBe(false);
  });

  it('allows exactly one of two concurrent refreshes using the same token to succeed', async () => {
    const session = {
      id: 'session-1',
      expiresAt: new Date(Date.now() + 60_000),
      auth: {
        id: 'user-1',
        email: 'traveller@example.test',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        roles: ['USER'],
        permissions: [],
      },
    };

    let storedRefreshHash;
    let lookupCount = 0;
    const repository = {
      async findActiveSessionByRefreshHash(refreshTokenHash) {
        storedRefreshHash ??= refreshTokenHash;
        lookupCount += 1;
        return refreshTokenHash === storedRefreshHash ? session : null;
      },
      async rotateSession({ currentRefreshTokenHash, nextRefreshTokenHash }) {
        if (storedRefreshHash !== currentRefreshTokenHash) return false;
        storedRefreshHash = nextRefreshTokenHash;
        return true;
      },
    };

    const service = createAuthService({
      repository,
      issueAccessToken: () => 'access-token',
    });

    const outcomes = await Promise.allSettled([
      service.refresh('shared-refresh-token'),
      service.refresh('shared-refresh-token'),
    ]);

    const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');

    expect(lookupCount).toBe(2);
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(fulfilled[0].value.refreshToken).not.toBe('shared-refresh-token');
    expect(rejected[0].reason).toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });
});
