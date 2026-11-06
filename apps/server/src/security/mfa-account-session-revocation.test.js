import { describe, expect, it, vi } from 'vitest';

import { createMfaAccountSessionRevocation } from './mfa-account-session-revocation.js';

const NOW = new Date('2026-11-06T20:00:00.000Z');
const USER_ID = 'admin-one';

function fixture() {
  const updateSessions = vi.fn(async () => ({ count: 3 }));
  const updateAssurances = vi.fn(async () => ({ count: 2 }));
  const transaction = vi.fn(async (action) =>
    action({
      authSession: { updateMany: updateSessions },
      mfaSessionAssurance: { updateMany: updateAssurances },
    }),
  );
  const service = createMfaAccountSessionRevocation({
    prismaClient: { $transaction: transaction },
  });
  return { service, transaction, updateSessions, updateAssurances };
}

describe('isolated transactional MFA account session revocation', () => {
  it('requires a transaction and rejects untrusted identifiers and dates', async () => {
    expect(() => createMfaAccountSessionRevocation({ prismaClient: {} })).toThrow(
      'Prisma',
    );
    const { service, transaction } = fixture();
    for (const input of [
      { userId: '../other', now: NOW },
      { userId: '', now: NOW },
      { userId: USER_ID, now: new Date(Number.NaN) },
    ]) {
      await expect(service.revokeAll(input)).rejects.toThrow('identity');
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it('revokes both resources with identical account scope and timestamp', async () => {
    const { service, transaction, updateSessions, updateAssurances } = fixture();
    expect(await service.revokeAll({ userId: USER_ID, now: NOW })).toEqual({
      revokedSessions: 3,
      revokedAssurances: 2,
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateSessions).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
      data: { revokedAt: NOW },
    });
    expect(updateAssurances).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
      data: { revokedAt: NOW },
    });
  });

  it('is idempotent when both repositories report no remaining records', async () => {
    const { service, updateSessions, updateAssurances } = fixture();
    updateSessions.mockResolvedValueOnce({ count: 0 });
    updateAssurances.mockResolvedValueOnce({ count: 0 });
    expect(await service.revokeAll({ userId: USER_ID, now: NOW })).toEqual({
      revokedSessions: 0,
      revokedAssurances: 0,
    });
  });

  it('propagates failures so the Prisma transaction can roll back', async () => {
    const { service, updateSessions, updateAssurances } = fixture();
    updateSessions.mockRejectedValueOnce(new Error('session database failure'));
    const attempt = service.revokeAll({ userId: USER_ID, now: NOW });
    await expect(attempt).rejects.toThrow('session database failure');
    expect(updateAssurances).not.toHaveBeenCalled();
    updateAssurances.mockRejectedValueOnce(new Error('assurance database failure'));
    const retry = service.revokeAll({ userId: USER_ID, now: NOW });
    await expect(retry).rejects.toThrow('assurance database failure');
  });

  it('rejects missing transaction dependencies and invalid mutation counts', async () => {
    const transaction = vi.fn(async (action) =>
      action({
        authSession: { updateMany: vi.fn(async () => ({ count: 1 })) },
      }),
    );
    const service = createMfaAccountSessionRevocation({
      prismaClient: { $transaction: transaction },
    });
    const incomplete = service.revokeAll({ userId: USER_ID, now: NOW });
    await expect(incomplete).rejects.toThrow('repositories');
    const { service: validService, updateAssurances } = fixture();
    updateAssurances.mockResolvedValueOnce({ count: -1 });
    const invalid = validService.revokeAll({ userId: USER_ID, now: NOW });
    await expect(invalid).rejects.toThrow('revocation result');
  });
});
