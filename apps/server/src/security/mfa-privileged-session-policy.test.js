import { ROLES } from '@attravoya/constants';
import { describe, expect, it, vi } from 'vitest';

import { createMfaPrivilegedSessionPolicy } from './mfa-privileged-session-policy.js';

const USER_ID = 'admin-one';
const VERIFIED_AT = new Date('2026-09-01T00:00:00.000Z');

function fixture({ roles = [ROLES.SUPER_ADMIN], factorEnabled = true } = {}) {
  const authorization = {
    id: USER_ID,
    status: 'ACTIVE',
    emailVerifiedAt: VERIFIED_AT,
    roles,
  };
  const repository = {
    findAuthorizationContextByUserId: vi.fn(async () => authorization),
  };
  const factorRepository = {
    findEnabledFactor: vi.fn(async () => (factorEnabled ? { enabledAt: VERIFIED_AT } : null)),
  };
  const policy = createMfaPrivilegedSessionPolicy({ repository, factorRepository });
  return { authorization, repository, factorRepository, policy };
}

describe('isolated privileged session MFA policy', () => {
  it('requires MFA for currently privileged accounts with an enabled factor', async () => {
    for (const role of [ROLES.ADMIN, ROLES.SUPER_ADMIN]) {
      const { policy, factorRepository } = fixture({ roles: [role] });
      expect(await policy.evaluate(USER_ID)).toEqual({ decision: 'MFA_REQUIRED' });
      expect(factorRepository.findEnabledFactor).toHaveBeenCalledWith(USER_ID);
    }
  });

  it('blocks a privileged session if no enabled factor exists', async () => {
    const { policy } = fixture({ factorEnabled: false });
    expect(await policy.evaluate(USER_ID)).toEqual({ decision: 'ENROLLMENT_REQUIRED' });
  });

  it('allows password-only evaluation for an ordinary active verified account', async () => {
    const { policy, factorRepository } = fixture({ roles: [ROLES.USER] });
    expect(await policy.evaluate(USER_ID)).toEqual({ decision: 'PASSWORD_ONLY' });
    expect(factorRepository.findEnabledFactor).not.toHaveBeenCalled();
  });

  it('fails closed for invalid, inactive, unverified, or mismatched accounts', async () => {
    const { policy, authorization, repository, factorRepository } = fixture();
    expect(await policy.evaluate('invalid user id')).toEqual({ decision: 'DENY' });
    expect(repository.findAuthorizationContextByUserId).not.toHaveBeenCalled();
    authorization.status = 'SUSPENDED';
    expect(await policy.evaluate(USER_ID)).toEqual({ decision: 'DENY' });
    authorization.status = 'ACTIVE';
    authorization.emailVerifiedAt = null;
    expect(await policy.evaluate(USER_ID)).toEqual({ decision: 'DENY' });
    authorization.emailVerifiedAt = VERIFIED_AT;
    authorization.id = 'another-user';
    expect(await policy.evaluate(USER_ID)).toEqual({ decision: 'DENY' });
    expect(factorRepository.findEnabledFactor).not.toHaveBeenCalled();
  });

  it('denies missing or malformed authorization context', async () => {
    const { repository, policy } = fixture();
    repository.findAuthorizationContextByUserId.mockResolvedValueOnce(null);
    expect(await policy.evaluate(USER_ID)).toEqual({ decision: 'DENY' });
    repository.findAuthorizationContextByUserId.mockResolvedValueOnce({
      id: USER_ID,
      status: 'ACTIVE',
      emailVerifiedAt: VERIFIED_AT,
      roles: null,
    });
    expect(await policy.evaluate(USER_ID)).toEqual({ decision: 'DENY' });
  });

  it('fails closed if authorization or factor persistence is unavailable', async () => {
    const { repository, factorRepository, policy } = fixture();
    repository.findAuthorizationContextByUserId.mockRejectedValueOnce(new Error('db unavailable'));
    await expect(policy.evaluate(USER_ID)).rejects.toThrow('db unavailable');
    factorRepository.findEnabledFactor.mockRejectedValueOnce(new Error('factor db unavailable'));
    await expect(policy.evaluate(USER_ID)).rejects.toThrow('factor db unavailable');
  });

  it('rejects incomplete repository dependencies at creation', () => {
    expect(() =>
      createMfaPrivilegedSessionPolicy({ repository: {}, factorRepository: {} }),
    ).toThrow('dependencies');
  });
});
