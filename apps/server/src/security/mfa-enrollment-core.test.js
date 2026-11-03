import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { createMfaEnrollmentCore } from './mfa-enrollment-core.js';

const NOW = 1_800_000_000_000;
const KEY = Buffer.alloc(32, 7);

function codeFor(secret, now) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of secret) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits -= 8)) & 255);
      value &= (1 << bits) - 1;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[19] & 15;
  const numeric = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(numeric % 1_000_000).padStart(6, '0');
}

function fixture(passwordAccepted = true) {
  let pending = null;
  const repository = {
    createPendingEnrollment: vi.fn(async ({ secretEnvelope, expiresAt }) => {
      if (pending?.enabledAt) return false;
      pending = {
        secretEnvelope,
        pendingExpiresAt: expiresAt,
        enabledAt: null,
        lastAcceptedCounter: -1,
      };
      return true;
    }),
    findPendingEnrollment: vi.fn(async () => pending),
    completeEnrollment: vi.fn(async ({ expectedEnvelope, counter, recoveryCodeHashes }) => {
      if (
        !pending ||
        pending.enabledAt ||
        pending.secretEnvelope !== expectedEnvelope ||
        pending.pendingExpiresAt.getTime() <= NOW ||
        counter <= pending.lastAcceptedCounter
      ) {
        return false;
      }
      expect(recoveryCodeHashes).toHaveLength(10);
      expect(recoveryCodeHashes.every((value) => /^[a-f0-9]{64}$/.test(value))).toBe(true);
      pending.enabledAt = new Date(NOW);
      pending.lastAcceptedCounter = counter;
      return true;
    }),
  };
  const verifyPassword = vi.fn(async () => passwordAccepted);
  const service = createMfaEnrollmentCore({
    repository,
    encryptionKey: KEY,
    verifyPassword,
  });
  return { service, repository, verifyPassword, getPending: () => pending };
}

describe('protected MFA enrollment core', () => {
  it('requires password reconfirmation before saving or revealing a secret', async () => {
    const { service, repository, verifyPassword } = fixture(false);
    await expect(
      service.prepare({
        userId: 'user-one',
        account: 'admin@example.test',
        password: 'wrong',
        now: NOW,
      }),
    ).rejects.toThrow('reauthentication');
    expect(verifyPassword).toHaveBeenCalledWith({ userId: 'user-one', password: 'wrong' });
    expect(repository.createPendingEnrollment).not.toHaveBeenCalled();
  });

  it('stores encrypted pending data and only then returns provisioning details', async () => {
    const { service, getPending } = fixture();
    const result = await service.prepare({
      userId: 'user-one',
      account: 'admin@example.test',
      password: 'correct',
      now: NOW,
    });
    expect(result.provisioningUri).toContain('otpauth://totp/');
    expect(result.expiresAt).toBe(new Date(NOW + 600_000).toISOString());
    const secret = new URL(result.provisioningUri).searchParams.get('secret');
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(getPending().secretEnvelope).not.toContain(secret);
    expect(getPending().enabledAt).toBeNull();
  });

  it('confirms the valid code once and returns ten single-display recovery codes', async () => {
    const { service, repository } = fixture();
    const result = await service.prepare({
      userId: 'user-one',
      account: 'admin@example.test',
      password: 'correct',
      now: NOW,
    });
    const secret = new URL(result.provisioningUri).searchParams.get('secret');
    const code = codeFor(secret, NOW);
    const confirmed = await service.confirm({ userId: 'user-one', code, now: NOW });
    expect(confirmed.recoveryCodes).toHaveLength(10);
    expect(new Set(confirmed.recoveryCodes).size).toBe(10);
    expect(repository.completeEnrollment).toHaveBeenCalledOnce();
    await expect(service.confirm({ userId: 'user-one', code, now: NOW })).rejects.toThrow();
  });

  it('rejects invalid and expired confirmation without creating recovery codes', async () => {
    const { service, repository } = fixture();
    await service.prepare({
      userId: 'user-one',
      account: 'admin@example.test',
      password: 'correct',
      now: NOW,
    });
    await expect(
      service.confirm({ userId: 'user-one', code: 'invalid', now: NOW }),
    ).rejects.toThrow();
    await expect(
      service.confirm({ userId: 'user-one', code: '123456', now: NOW + 600_000 }),
    ).rejects.toThrow();
    expect(repository.completeEnrollment).not.toHaveBeenCalled();
  });

  it('does not release recovery codes if the atomic completion is rejected', async () => {
    const { service, repository } = fixture();
    const enrollment = await service.prepare({
      userId: 'user-one',
      account: 'admin@example.test',
      password: 'correct',
      now: NOW,
    });
    const secret = new URL(enrollment.provisioningUri).searchParams.get('secret');
    repository.completeEnrollment.mockResolvedValueOnce(false);
    await expect(
      service.confirm({ userId: 'user-one', code: codeFor(secret, NOW), now: NOW }),
    ).rejects.toThrow('MFA confirmation failed.');
  });
});
