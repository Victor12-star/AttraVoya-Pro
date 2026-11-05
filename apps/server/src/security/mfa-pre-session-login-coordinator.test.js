import { describe, expect, it, vi } from 'vitest';

import { createMfaPreSessionLoginCoordinator } from './mfa-pre-session-login-coordinator.js';

const USER_ID = 'admin-one';
const TOKEN = 'a'.repeat(43);
const EXPIRY = '2026-11-05T23:00:00.000Z';

function fixture({ decision = 'MFA_REQUIRED' } = {}) {
  const authenticatePassword = vi.fn(async () => {
    /** @type {{ userId: string } | null} */
    const authenticated = { userId: USER_ID };
    return authenticated;
  });
  const sessionPolicy = {
    evaluate: vi.fn(async () => ({ decision })),
  };
  const challengeService = {
    issue: vi.fn(async () => ({ challengeToken: TOKEN, expiresAt: EXPIRY })),
  };
  const coordinator = createMfaPreSessionLoginCoordinator({
    authenticatePassword,
    sessionPolicy,
    challengeService,
  });
  return { coordinator, authenticatePassword, sessionPolicy, challengeService };
}

describe('route-free pre-session MFA login coordinator', () => {
  it('issues a challenge only after password and MFA policy checks', async () => {
    const { coordinator, authenticatePassword, sessionPolicy, challengeService } = fixture();
    const credentials = { email: 'admin@example.test', password: 'valid-password' };
    const result = await coordinator.authenticate(credentials);
    expect(result).toEqual({
      decision: 'MFA_CHALLENGE',
      challengeToken: TOKEN,
      expiresAt: EXPIRY,
    });
    expect(authenticatePassword).toHaveBeenCalledWith(credentials);
    expect(sessionPolicy.evaluate).toHaveBeenCalledWith(USER_ID);
    expect(challengeService.issue).toHaveBeenCalledWith({ userId: USER_ID });
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
    expect(result).not.toHaveProperty('userId');
  });

  it('denies rejected passwords and does not reveal whether MFA is enrolled', async () => {
    const { coordinator, authenticatePassword, sessionPolicy, challengeService } = fixture();
    authenticatePassword.mockResolvedValueOnce(null);
    expect(await coordinator.authenticate({ password: 'invalid' })).toEqual({
      decision: 'DENY',
    });
    expect(sessionPolicy.evaluate).not.toHaveBeenCalled();
    expect(challengeService.issue).not.toHaveBeenCalled();
  });

  it('denies malformed authenticated identities before querying authorization', async () => {
    const { coordinator, authenticatePassword, sessionPolicy } = fixture();
    authenticatePassword.mockResolvedValueOnce({ userId: '../../admin' });
    expect(await coordinator.authenticate({})).toEqual({ decision: 'DENY' });
    expect(sessionPolicy.evaluate).not.toHaveBeenCalled();
  });

  it('returns a non-token result for ordinary verified users', async () => {
    const { coordinator, challengeService } = fixture({ decision: 'PASSWORD_ONLY' });
    expect(await coordinator.authenticate({})).toEqual({
      decision: 'PASSWORD_VERIFIED',
      userId: USER_ID,
    });
    expect(challengeService.issue).not.toHaveBeenCalled();
  });

  it('does not issue sessions for privileged users without enrolled MFA', async () => {
    const { coordinator, challengeService } = fixture({ decision: 'ENROLLMENT_REQUIRED' });
    expect(await coordinator.authenticate({})).toEqual({ decision: 'ENROLLMENT_REQUIRED' });
    expect(challengeService.issue).not.toHaveBeenCalled();
  });

  it('denies inactive or unrecognized policy decisions without a challenge', async () => {
    for (const decision of ['DENY', 'UNKNOWN', '']) {
      const { coordinator, challengeService } = fixture({ decision });
      expect(await coordinator.authenticate({})).toEqual({ decision: 'DENY' });
      expect(challengeService.issue).not.toHaveBeenCalled();
    }
  });

  it('fails closed if the challenge repository returns malformed data', async () => {
    const { coordinator, challengeService } = fixture();
    challengeService.issue.mockResolvedValueOnce({ challengeToken: 'weak', expiresAt: EXPIRY });
    await expect(coordinator.authenticate({})).rejects.toThrow('invalid challenge');
  });

  it('propagates authentication, authorization and persistence errors', async () => {
    const { coordinator, authenticatePassword, sessionPolicy, challengeService } = fixture();
    authenticatePassword.mockRejectedValueOnce(new Error('password database failed'));
    await expect(coordinator.authenticate({})).rejects.toThrow('password database failed');
    sessionPolicy.evaluate.mockRejectedValueOnce(new Error('policy database failed'));
    await expect(coordinator.authenticate({})).rejects.toThrow('policy database failed');
    challengeService.issue.mockRejectedValueOnce(new Error('challenge database failed'));
    await expect(coordinator.authenticate({})).rejects.toThrow('challenge database failed');
  });

  it('requires a password verifier, current policy and challenge persistence', () => {
    expect(() =>
      createMfaPreSessionLoginCoordinator({
        authenticatePassword: /** @type {any} */ (null),
        sessionPolicy: /** @type {any} */ ({}),
        challengeService: /** @type {any} */ ({}),
      }),
    ).toThrow('dependencies');
  });
});
