import { describe, expect, it, vi } from 'vitest';

import { createMfaAccountLockCoordinator } from './mfa-account-lock-coordinator.js';

const NOW = new Date('2026-11-11T12:00:00.000Z');
const USER_ID = 'admin-one';
const ROTATION = {
  userId: USER_ID,
  sessionId: 'session-one',
  currentHash: 'a'.repeat(64),
  nextHash: 'b'.repeat(64),
  now: NOW,
};

function fixture() {
  const sequence = [];
  const queryRaw = vi.fn(async () => {
    sequence.push('lock');
    return [{ pg_advisory_xact_lock: null }];
  });
  const updateSessions = vi.fn(async () => {
    sequence.push('sessions');
    return { count: 2 };
  });
  const updateAssurances = vi.fn(async () => {
    sequence.push('assurances');
    return { count: 1 };
  });
  const updateRotation = vi.fn(async () => {
    sequence.push('rotation');
    return { count: 1 };
  });
  const transaction = vi.fn(async (action) => {
    sequence.push('begin');
    const result = await action({
      $queryRaw: queryRaw,
      authSession: { updateMany: updateRotation },
      mfaSessionAssurance: { updateMany: updateAssurances },
    });
    sequence.push('commit');
    return result;
  });
  const coordinator = createMfaAccountLockCoordinator({
    prismaClient: { $transaction: transaction },
  });
  return { coordinator, transaction, queryRaw, updateSessions, updateAssurances, updateRotation, sequence };
}

describe('inactive MFA account transaction lock coordinator', () => {
  it('rejects missing transactions and malformed account identity before database work', async () => {
    expect(() => createMfaAccountLockCoordinator({ prismaClient: {} })).toThrow('transactions');
    const { coordinator, transaction } = fixture();
    await expect(coordinator.rotate({ ...ROTATION, userId: '../escape' })).rejects.toThrow(
      'identity',
    );
    await expect(coordinator.revokeAll({ userId: '', now: NOW })).rejects.toThrow('identity');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('holds the same parameterized per-user advisory lock through refresh rotation', async () => {
    const { coordinator, transaction, queryRaw, updateRotation, sequence } = fixture();
    await expect(coordinator.rotate(ROTATION)).resolves.toBe(true);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    const [parts, userId] = queryRaw.mock.calls[0];
    expect(parts.join('?')).toContain('pg_advisory_xact_lock(hashtextextended(?, 0))');
    expect(userId).toBe(USER_ID);
    expect(updateRotation).toHaveBeenCalledTimes(1);
    expect(sequence).toEqual(['begin', 'lock', 'rotation', 'commit']);
  });

  it('acquires the matching lock before revoking sessions and assurances', async () => {
    const { coordinator, queryRaw, updateRotation, updateAssurances, sequence } = fixture();
    updateRotation.mockResolvedValueOnce({ count: 2 });
    await expect(coordinator.revokeAll({ userId: USER_ID, now: NOW })).resolves.toEqual({
      revokedSessions: 2,
      revokedAssurances: 1,
    });
    expect(queryRaw.mock.calls[0][1]).toBe(USER_ID);
    expect(updateRotation).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
      data: { revokedAt: NOW },
    });
    expect(updateAssurances).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
      data: { revokedAt: NOW },
    });
    expect(sequence).toEqual(['begin', 'lock', 'rotation', 'assurances', 'commit']);
  });

  it('fails closed when database advisory locking is missing or unavailable', async () => {
    const { coordinator, queryRaw, updateRotation } = fixture();
    queryRaw.mockRejectedValueOnce(new Error('database lock unavailable'));
    await expect(coordinator.rotate(ROTATION)).rejects.toThrow('database lock unavailable');
    expect(updateRotation).not.toHaveBeenCalled();

    const unguarded = createMfaAccountLockCoordinator({
      prismaClient: { $transaction: (action) => action({ authSession: { updateMany: updateRotation } }) },
    });
    await expect(unguarded.rotate(ROTATION)).rejects.toThrow('advisory lock');
    expect(updateRotation).not.toHaveBeenCalled();
  });

  it('propagates a failed revocation without returning successful completion', async () => {
    const { coordinator, updateAssurances } = fixture();
    updateAssurances.mockRejectedValueOnce(new Error('assurance update failed'));
    await expect(coordinator.revokeAll({ userId: USER_ID, now: NOW })).rejects.toThrow(
      'assurance update failed',
    );
  });
});
