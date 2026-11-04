import { randomBytes } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createConfiguredPrivilegedMfaEnrollmentService } from './mfa-configured-enrollment.js';

const VERIFIED_AT = new Date('2026-10-01T00:00:00Z');

function dependencies() {
  const authenticationRepository = {
    findAuthorizationContextByUserId: vi.fn(async () => ({
      id: 'user-one',
      email: 'admin@example.test',
      status: 'ACTIVE',
      emailVerifiedAt: VERIFIED_AT,
      roles: ['ADMIN'],
    })),
    findPasswordHashByUserId: vi.fn(async () => ({
      passwordHash: 'hash',
      status: 'ACTIVE',
      deletedAt: null,
      emailVerifiedAt: VERIFIED_AT,
    })),
  };
  const enrollmentRepository = {
    createPendingEnrollment: vi.fn(async () => true),
    findPendingEnrollment: vi.fn(async () => null),
    completeEnrollment: vi.fn(async () => false),
  };
  const verifyHash = vi.fn(async () => true);
  return { authenticationRepository, enrollmentRepository, verifyHash };
}

describe('configured privileged MFA enrollment composition', () => {
  it('rejects missing or malformed dedicated configuration before enrollment', () => {
    const deps = dependencies();
    for (const encodedEncryptionKey of [undefined, '', 'shared-session-secret', 'invalid=']) {
      expect(() =>
        createConfiguredPrivilegedMfaEnrollmentService({ ...deps, encodedEncryptionKey }),
      ).toThrow('dedicated 32-byte');
    }
    expect(deps.authenticationRepository.findAuthorizationContextByUserId).not.toHaveBeenCalled();
    expect(deps.enrollmentRepository.createPendingEnrollment).not.toHaveBeenCalled();
  });

  it('uses an explicitly provided canonical key for protected enrollment', async () => {
    const deps = dependencies();
    const service = createConfiguredPrivilegedMfaEnrollmentService({
      ...deps,
      encodedEncryptionKey: randomBytes(32).toString('base64url'),
    });
    const result = await service.prepare({
      userId: 'user-one',
      password: 'correct',
      now: 1_800_000_000_000,
    });
    expect(result.provisioningUri).toMatch(/^otpauth:\/\/totp\//);
    expect(deps.verifyHash).toHaveBeenCalledWith('hash', 'correct');
    expect(deps.enrollmentRepository.createPendingEnrollment).toHaveBeenCalledOnce();
  });

  it('does not accept a client supplied account identity in place of server authorization', async () => {
    const deps = dependencies();
    const service = createConfiguredPrivilegedMfaEnrollmentService({
      ...deps,
      encodedEncryptionKey: randomBytes(32).toString('base64url'),
    });
    const input = /** @type {any} */ ({
      userId: 'user-one',
      password: 'correct',
      account: 'forged@example.test',
      now: 1_800_000_000_000,
    });
    const result = await service.prepare(input);
    expect(result.provisioningUri).toContain('admin%40example.test');
    expect(result.provisioningUri).not.toContain('forged');
  });
});
