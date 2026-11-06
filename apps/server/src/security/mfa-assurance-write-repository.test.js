import { describe, expect, it, vi } from 'vitest';

import { createMfaAssuranceWriteRepository } from './mfa-assurance-write-repository.js';

const NOW = new Date('2026-11-06T17:00:00.000Z');
const VERIFIED_AT = new Date(NOW.getTime() - 60_000);
const EXPIRES_AT = new Date(NOW.getTime() + 60 * 60 * 1000);
const INPUT = {
  userId: 'admin-one',
  sessionId: 'session-one',
  verifiedAt: VERIFIED_AT,
  expiresAt: EXPIRES_AT,
  now: NOW,
};

function fixture() {
  const executeRaw = vi.fn(async () => 1);
  const updateMany = vi.fn(async () => ({ count: 1 }));
  const repository = createMfaAssuranceWriteRepository({
    prismaClient: { $executeRaw: executeRaw, mfaSessionAssurance: { updateMany } },
  });
  return { repository, executeRaw, updateMany };
}

describe('inactive atomic MFA assurance writes', () => {
  it('rejects missing dependencies and untrusted or malformed evidence before persistence', async () => {
    expect(() => createMfaAssuranceWriteRepository({ prismaClient: {} })).toThrow('required');
    const { repository, executeRaw } = fixture();
    for (const invalid of [
      { ...INPUT, userId: '../other' },
      { ...INPUT, sessionId: '../other' },
      { ...INPUT, now: new Date(Number.NaN) },
      { ...INPUT, verifiedAt: new Date(NOW.getTime() + 1) },
      { ...INPUT, verifiedAt: new Date(NOW.getTime() - 13 * 60 * 60 * 1000) },
      { ...INPUT, expiresAt: NOW },
      { ...INPUT, expiresAt: new Date(NOW.getTime() + 13 * 60 * 60 * 1000) },
    ]) {
      await expect(repository.createVerifiedAssurance(invalid)).rejects.toThrow('evidence');
    }
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it('inserts only for an active matching session without replacing a previous proof', async () => {
    const { repository, executeRaw } = fixture();
    expect(await repository.createVerifiedAssurance(INPUT)).toBe(true);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const recordedCall = /** @type {[TemplateStringsArray, ...unknown[]]} */ (
      /** @type {unknown} */ (executeRaw.mock.calls[0])
    );
    const [fragments, ...parameters] = recordedCall;
    const sql = fragments.join('?');
    expect(sql).toContain('INSERT INTO "MfaSessionAssurance"');
    expect(sql).toContain('FROM "AuthSession"');
    expect(sql).toContain('"revokedAt" IS NULL');
    expect(sql).toContain('"expiresAt" >= ?');
    expect(sql).toContain('ON CONFLICT ("sessionId") DO NOTHING');
    expect(parameters).toContain(INPUT.userId);
    expect(parameters).toContain(INPUT.sessionId);
    expect(parameters).toContain(INPUT.expiresAt);
    expect(parameters).toContain(INPUT.now);
  });

  it('returns false when session is missing, revoked, expired or proof already exists', async () => {
    const { repository, executeRaw } = fixture();
    executeRaw.mockResolvedValueOnce(0);
    expect(await repository.createVerifiedAssurance(INPUT)).toBe(false);
  });

  it('revokes only the matching unrevoked proof, at most once', async () => {
    const { repository, updateMany } = fixture();
    expect(
      await repository.revokeVerifiedAssurance({
        userId: INPUT.userId,
        sessionId: INPUT.sessionId,
        now: NOW,
      }),
    ).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: INPUT.userId, sessionId: INPUT.sessionId, revokedAt: null },
      data: { revokedAt: NOW },
    });
    updateMany.mockResolvedValueOnce({ count: 0 });
    expect(
      await repository.revokeVerifiedAssurance({
        userId: INPUT.userId,
        sessionId: INPUT.sessionId,
        now: NOW,
      }),
    ).toBe(false);
  });

  it('revokes only one account\'s unrevoked MFA proofs and returns the affected count', async () => {
    const { repository, updateMany } = fixture();
    updateMany.mockResolvedValueOnce({ count: 3 });
    expect(
      await repository.revokeAllVerifiedAssurances({ userId: INPUT.userId, now: NOW }),
    ).toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: INPUT.userId, revokedAt: null },
      data: { revokedAt: NOW },
    });
    updateMany.mockResolvedValueOnce({ count: 0 });
    expect(
      await repository.revokeAllVerifiedAssurances({ userId: INPUT.userId, now: NOW }),
    ).toBe(0);
  });

  it('rejects invalid account-wide revocation identities without touching persistence', async () => {
    const { repository, updateMany } = fixture();
    await expect(
      repository.revokeAllVerifiedAssurances({ userId: '../someone', now: NOW }),
    ).rejects.toThrow('identity');
    await expect(
      repository.revokeAllVerifiedAssurances({
        userId: INPUT.userId,
        now: new Date(Number.NaN),
      }),
    ).rejects.toThrow('identity');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('fails closed on account-wide revocation database failures and malformed results', async () => {
    const { repository, updateMany } = fixture();
    updateMany.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      repository.revokeAllVerifiedAssurances({ userId: INPUT.userId, now: NOW }),
    ).rejects.toThrow('database unavailable');
    updateMany.mockResolvedValueOnce(/** @type {any} */ ({ count: -1 }));
    await expect(
      repository.revokeAllVerifiedAssurances({ userId: INPUT.userId, now: NOW }),
    ).rejects.toThrow('revocation result');
  });

  it('fails closed on invalid revocation inputs and database errors', async () => {
    const { repository, updateMany, executeRaw } = fixture();
    await expect(
      repository.revokeVerifiedAssurance({
        userId: INPUT.userId,
        sessionId: '../bad',
        now: NOW,
      }),
    ).rejects.toThrow('identity');
    expect(updateMany).not.toHaveBeenCalled();
    executeRaw.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(repository.createVerifiedAssurance(INPUT)).rejects.toThrow('database unavailable');
    updateMany.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      repository.revokeVerifiedAssurance({
        userId: INPUT.userId,
        sessionId: INPUT.sessionId,
        now: NOW,
      }),
    ).rejects.toThrow('database unavailable');
  });
});
