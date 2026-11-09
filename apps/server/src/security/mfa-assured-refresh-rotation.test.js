import { describe, expect, it, vi } from 'vitest';

import { createMfaAssuredRefreshRotation } from './mfa-assured-refresh-rotation.js';

const NOW = new Date('2026-11-09T12:00:00.000Z');
const CURRENT_HASH = 'a'.repeat(64);
const NEXT_HASH = 'b'.repeat(64);
const INPUT = {
  userId: 'admin-one',
  sessionId: 'session-one',
  currentHash: CURRENT_HASH,
  nextHash: NEXT_HASH,
  now: NOW,
};

function fixture() {
  const updateMany = vi.fn(async () => ({ count: 1 }));
  const rotation = createMfaAssuredRefreshRotation({
    prismaClient: { authSession: { updateMany } },
  });
  return { rotation, updateMany };
}

describe('inactive atomic MFA-assured refresh rotation', () => {
  it('requires persistence and rejects malformed or reused refresh hashes', async () => {
    expect(() => createMfaAssuredRefreshRotation({ prismaClient: {} })).toThrow(
      'required',
    );
    const { rotation, updateMany } = fixture();
    for (const invalid of [
      { ...INPUT, userId: '../wrong' },
      { ...INPUT, sessionId: '../wrong' },
      { ...INPUT, currentHash: 'not-a-hash' },
      { ...INPUT, nextHash: CURRENT_HASH },
      { ...INPUT, now: new Date(Number.NaN) },
    ]) {
      await expect(rotation.rotate(invalid)).rejects.toThrow('evidence');
    }
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('requires matching active session and fresh unrevoked proof in one update', async () => {
    const { rotation, updateMany } = fixture();
    expect(await rotation.rotate(INPUT)).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: INPUT.sessionId,
        userId: INPUT.userId,
        refreshTokenHash: CURRENT_HASH,
        revokedAt: null,
        expiresAt: { gt: NOW },
        mfaAssurance: {
          is: {
            userId: INPUT.userId,
            revokedAt: null,
            verifiedAt: {
              lte: NOW,
              gte: new Date(NOW.getTime() - 12 * 60 * 60 * 1000),
            },
            expiresAt: { gt: NOW },
          },
        },
      },
      data: { refreshTokenHash: NEXT_HASH, lastUsedAt: NOW },
    });
  });

  it('denies a stale token, missing proof, revocation or expired session', async () => {
    const { rotation, updateMany } = fixture();
    updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await rotation.rotate(INPUT)).toBe(false);
  });

  it('fails closed on persistence errors or impossible mutation counts', async () => {
    const { rotation, updateMany } = fixture();
    updateMany.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(rotation.rotate(INPUT)).rejects.toThrow('database unavailable');
    updateMany.mockResolvedValueOnce({ count: 2 });
    await expect(rotation.rotate(INPUT)).rejects.toThrow('rotation result');
  });
});
