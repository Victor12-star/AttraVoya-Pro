import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createPrivilegedMfaEnrollmentService } from './mfa-enrollment-composition.js';

const NOW = 1_800_000_000_000;
const ENCRYPTION_KEY = Buffer.alloc(32, 11);
const VERIFIED_AT = new Date('2026-10-01T00:00:00Z');

function totpCode(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let value = 0;
  let bits = 0;
  const bytes = [];
  for (const letter of secret) {
    value = (value << 5) | alphabet.indexOf(letter);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
      value &= (1 << bits) - 1;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(NOW / 30_000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[19] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

function fixture() {
  /** @type {any} */
  const context = {
    id: 'user-one',
    email: 'verified-admin@example.test',
    status: 'ACTIVE',
    emailVerifiedAt: VERIFIED_AT,
    roles: ['ADMIN'],
  };
  const account = {
    passwordHash: 'secure-hash',
    deletedAt: null,
    emailVerifiedAt: VERIFIED_AT,
    status: 'ACTIVE',
  };
  let pending = null;
  /** @type {any} */
  const authenticationRepository = {
    findAuthorizationContextByUserId: vi.fn(async () => context),
    findPasswordHashByUserId: vi.fn(async () => account),
  };
  /** @type {any} */
  const enrollmentRepository = {
    createPendingEnrollment: vi.fn(async ({ secretEnvelope, expiresAt }) => {
      pending = {
        secretEnvelope,
        pendingExpiresAt: expiresAt,
        enabledAt: null,
        lastAcceptedCounter: -1,
      };
      return true;
    }),
    findPendingEnrollment: vi.fn(async () => pending),
    completeEnrollment: vi.fn(async () => true),
  };
  const verifyHash = vi.fn(async () => true);
  const service = createPrivilegedMfaEnrollmentService({
    authenticationRepository,
    enrollmentRepository,
    encryptionKey: ENCRYPTION_KEY,
    verifyHash,
  });
  return { context, account, authenticationRepository, enrollmentRepository, verifyHash, service };
}

describe('privileged MFA enrollment composition', () => {
  it('requires a dedicated 32-byte encryption key', () => {
    expect(() => createPrivilegedMfaEnrollmentService({ encryptionKey: Buffer.alloc(16) })).toThrow(
      '32-byte',
    );
    expect(() => createPrivilegedMfaEnrollmentService({ encryptionKey: 'secret' })).toThrow(
      '32-byte',
    );
  });

  it('uses the trusted account email, never a client-supplied label', async () => {
    const { service, enrollmentRepository, verifyHash } = fixture();
    const forgedInput = /** @type {any} */ ({
      userId: 'user-one',
      password: 'correct',
      account: 'attacker@example.test',
      now: NOW,
    });
    const result = await service.prepare(forgedInput);
    const provisioning = new URL(result.provisioningUri);
    expect(provisioning.pathname).toContain('verified-admin%40example.test');
    expect(provisioning.pathname).not.toContain('attacker');
    expect(verifyHash).toHaveBeenCalledWith('secure-hash', 'correct');
    expect(enrollmentRepository.createPendingEnrollment).toHaveBeenCalledOnce();
  });

  it('rejects forged identity, missing privileges, and suspended accounts', async () => {
    const { service, context, enrollmentRepository } = fixture();
    await expect(
      service.prepare({ userId: 'bad:user', password: 'correct', now: NOW }),
    ).rejects.toThrow();
    context.roles = ['USER'];
    await expect(
      service.prepare({ userId: 'user-one', password: 'correct', now: NOW }),
    ).rejects.toThrow();
    context.roles = ['SUPER_ADMIN'];
    context.status = 'SUSPENDED';
    await expect(
      service.prepare({ userId: 'user-one', password: 'correct', now: NOW }),
    ).rejects.toThrow();
    expect(enrollmentRepository.createPendingEnrollment).not.toHaveBeenCalled();
  });

  it('rejects wrong passwords without creating pending enrollment', async () => {
    const { service, verifyHash, enrollmentRepository } = fixture();
    verifyHash.mockResolvedValueOnce(false);
    await expect(
      service.prepare({ userId: 'user-one', password: 'wrong', now: NOW }),
    ).rejects.toThrow('reauthentication');
    expect(enrollmentRepository.createPendingEnrollment).not.toHaveBeenCalled();
  });

  it('rechecks current administrator privileges before confirmation', async () => {
    const { service, context, enrollmentRepository } = fixture();
    const setup = await service.prepare({ userId: 'user-one', password: 'correct', now: NOW });
    const secret = new URL(setup.provisioningUri).searchParams.get('secret');
    const code = totpCode(secret);
    context.roles = ['USER'];
    await expect(service.confirm({ userId: 'user-one', code, now: NOW })).rejects.toThrow();
    expect(enrollmentRepository.completeEnrollment).not.toHaveBeenCalled();
    context.roles = ['ADMIN'];
    const confirmed = await service.confirm({ userId: 'user-one', code, now: NOW });
    expect(confirmed.recoveryCodes).toHaveLength(10);
    expect(enrollmentRepository.completeEnrollment).toHaveBeenCalledOnce();
  });

  it('rejects authorization context belonging to another account', async () => {
    const { service, context, enrollmentRepository } = fixture();
    context.id = 'different-user';
    await expect(
      service.prepare({ userId: 'user-one', password: 'correct', now: NOW }),
    ).rejects.toThrow('unavailable');
    expect(enrollmentRepository.createPendingEnrollment).not.toHaveBeenCalled();
  });

  it('does not allow confirmation of an expired enrollment', async () => {
    const { service, enrollmentRepository } = fixture();
    const setup = await service.prepare({ userId: 'user-one', password: 'correct', now: NOW });
    const secret = new URL(setup.provisioningUri).searchParams.get('secret');
    await expect(
      service.confirm({ userId: 'user-one', code: totpCode(secret), now: NOW + 600_000 }),
    ).rejects.toThrow('unavailable');
    expect(enrollmentRepository.completeEnrollment).not.toHaveBeenCalled();
  });
});
