import { describe, expect, it, vi } from 'vitest';

import { createMfaAssuranceReadRepository } from './mfa-assurance-read-repository.js';

const USER_ID = 'admin-one';
const SESSION_ID = 'session-one';
const VERIFIED_AT = new Date('2026-11-06T12:00:00.000Z');
const EXPIRES_AT = new Date('2026-11-06T14:00:00.000Z');

function fixture() {
  const findFirst = vi.fn(async () => ({
    userId: USER_ID,
    sessionId: SESSION_ID,
    verifiedAt: VERIFIED_AT,
    expiresAt: EXPIRES_AT,
    revokedAt: null,
  }));
  const repository = createMfaAssuranceReadRepository({
    prismaClient: { mfaSessionAssurance: { findFirst } },
  });
  return { findFirst, repository };
}

describe('isolated server-owned MFA assurance read repository', () => {
  it('rejects missing Prisma dependencies and malformed identities', async () => {
    expect(() => createMfaAssuranceReadRepository({ prismaClient: {} })).toThrow('required');
    const { repository, findFirst } = fixture();
    await expect(
      repository.findVerifiedAssurance({ userId: '../other', sessionId: SESSION_ID }),
    ).rejects.toThrow('identity');
    await expect(
      repository.findVerifiedAssurance({ userId: USER_ID, sessionId: '../wrong' }),
    ).rejects.toThrow('identity');
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('queries only matching proof for active, unrevoked matching session', async () => {
    const { repository, findFirst } = fixture();
    expect(
      await repository.findVerifiedAssurance({ userId: USER_ID, sessionId: SESSION_ID }),
    ).toMatchObject({ userId: USER_ID, sessionId: SESSION_ID });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        sessionId: SESSION_ID,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
        verifiedAt: { lte: expect.any(Date) },
        session: {
          is: {
            userId: USER_ID,
            revokedAt: null,
            expiresAt: { gt: expect.any(Date) },
          },
        },
      },
      select: {
        userId: true,
        sessionId: true,
        verifiedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  });

  it('denies absent and mismatched persistence results', async () => {
    const { repository, findFirst } = fixture();
    for (const result of [
      null,
      { userId: 'another-user', sessionId: SESSION_ID },
      { userId: USER_ID, sessionId: 'another-session' },
    ]) {
      findFirst.mockResolvedValueOnce(/** @type {any} */ (result));
      expect(
        await repository.findVerifiedAssurance({ userId: USER_ID, sessionId: SESSION_ID }),
      ).toBeNull();
    }
  });

  it('propagates database failures without returning assurance', async () => {
    const { repository, findFirst } = fixture();
    findFirst.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      repository.findVerifiedAssurance({ userId: USER_ID, sessionId: SESSION_ID }),
    ).rejects.toThrow('database unavailable');
  });
});
