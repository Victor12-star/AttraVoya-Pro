import { describe, expect, it, vi } from 'vitest';

import { createMfaRefreshAssurancePolicy } from './mfa-refresh-assurance-policy.js';

const USER_ID = 'admin-one';
const SESSION_ID = 'session-one';
const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

function fixture(decision = 'MFA_REQUIRED') {
  const sessionPolicy = {
    evaluate: vi.fn(async () => ({ decision })),
  };
  const assuranceRepository = {
    findVerifiedAssurance: vi.fn(async () => ({
      userId: USER_ID,
      sessionId: SESSION_ID,
      verifiedAt: new Date(NOW - HOUR),
      expiresAt: new Date(NOW + HOUR),
      revokedAt: null,
    })),
  };
  const policy = createMfaRefreshAssurancePolicy({ sessionPolicy, assuranceRepository });
  const input = { userId: USER_ID, sessionId: SESSION_ID, now: NOW };
  return { policy, sessionPolicy, assuranceRepository, input };
}

describe('route-free privileged refresh assurance policy', () => {
  it('permits an active ordinary user without requesting MFA assurance', async () => {
    const { policy, sessionPolicy, assuranceRepository, input } = fixture('PASSWORD_ONLY');
    expect(await policy.evaluate(input)).toEqual({ decision: 'ALLOW_PASSWORD_ONLY' });
    expect(sessionPolicy.evaluate).toHaveBeenCalledWith(USER_ID);
    expect(assuranceRepository.findVerifiedAssurance).not.toHaveBeenCalled();
  });

  it('rechecks password-only eligibility before refresh authorization', async () => {
    const { policy, sessionPolicy, assuranceRepository, input } = fixture('PASSWORD_ONLY');
    expect(await policy.evaluate(input)).toEqual({ decision: 'ALLOW_PASSWORD_ONLY' });
    expect(sessionPolicy.evaluate).toHaveBeenCalledTimes(2);
    expect(assuranceRepository.findVerifiedAssurance).not.toHaveBeenCalled();
  });

  it('denies password-only refresh after privilege promotion, suspension or policy change', async () => {
    for (const newDecision of ['MFA_REQUIRED', 'DENY', 'ENROLLMENT_REQUIRED', 'UNKNOWN']) {
      const { policy, sessionPolicy, assuranceRepository, input } = fixture('PASSWORD_ONLY');
      sessionPolicy.evaluate
        .mockResolvedValueOnce({ decision: 'PASSWORD_ONLY' })
        .mockResolvedValueOnce({ decision: newDecision });
      expect(await policy.evaluate(input)).toEqual({ decision: 'DENY' });
      expect(sessionPolicy.evaluate).toHaveBeenCalledTimes(2);
      expect(assuranceRepository.findVerifiedAssurance).not.toHaveBeenCalled();
    }
  });

  it('does not grant password-only authorization if the second lookup fails', async () => {
    const { policy, sessionPolicy, assuranceRepository, input } = fixture('PASSWORD_ONLY');
    sessionPolicy.evaluate
      .mockResolvedValueOnce({ decision: 'PASSWORD_ONLY' })
      .mockRejectedValueOnce(new Error('authorization unavailable'));
    await expect(policy.evaluate(input)).rejects.toThrow('authorization unavailable');
    expect(assuranceRepository.findVerifiedAssurance).not.toHaveBeenCalled();
  });

  it('requires fresh, bound, unrevoked server assurance for privileged users', async () => {
    const { policy, sessionPolicy, assuranceRepository, input } = fixture();
    expect(await policy.evaluate(input)).toEqual({ decision: 'ALLOW_MFA_ASSURED' });
    expect(sessionPolicy.evaluate).toHaveBeenCalledWith(USER_ID);
    expect(assuranceRepository.findVerifiedAssurance).toHaveBeenCalledWith({
      userId: USER_ID,
      sessionId: SESSION_ID,
    });
  });

  it('rechecks current privileges after proof lookup before allowing MFA', async () => {
    const { policy, sessionPolicy, assuranceRepository, input } = fixture();
    expect(await policy.evaluate(input)).toEqual({ decision: 'ALLOW_MFA_ASSURED' });
    expect(sessionPolicy.evaluate).toHaveBeenCalledTimes(2);
    expect(assuranceRepository.findVerifiedAssurance).toHaveBeenCalledTimes(2);
  });

  it('denies if access is revoked or enrollment changes while proof is read', async () => {
    for (const newDecision of ['DENY', 'ENROLLMENT_REQUIRED', 'PASSWORD_ONLY']) {
      const { policy, sessionPolicy, assuranceRepository, input } = fixture();
      sessionPolicy.evaluate
        .mockResolvedValueOnce({ decision: 'MFA_REQUIRED' })
        .mockResolvedValueOnce({ decision: newDecision });
      expect(await policy.evaluate(input)).toEqual({ decision: 'DENY' });
      expect(sessionPolicy.evaluate).toHaveBeenCalledTimes(2);
      expect(assuranceRepository.findVerifiedAssurance).toHaveBeenCalledTimes(2);
    }
  });

  it('fails closed if the post-proof authorization recheck loses database access', async () => {
    const { policy, sessionPolicy, input } = fixture();
    sessionPolicy.evaluate
      .mockResolvedValueOnce({ decision: 'MFA_REQUIRED' })
      .mockRejectedValueOnce(new Error('authorization unavailable'));
    await expect(policy.evaluate(input)).rejects.toThrow('authorization unavailable');
  });

  it('denies proof revoked or removed during the final authorization recheck', async () => {
    for (const changed of [
      null,
      { userId: USER_ID, sessionId: SESSION_ID, revokedAt: new Date(NOW) },
      { userId: USER_ID, sessionId: 'other-session' },
      { userId: USER_ID, sessionId: SESSION_ID, verifiedAt: new Date(NOW + 1) },
      { userId: USER_ID, sessionId: SESSION_ID, verifiedAt: new Date(NOW - 13 * HOUR) },
      { userId: USER_ID, sessionId: SESSION_ID, expiresAt: new Date(NOW) },
    ]) {
      const { policy, sessionPolicy, assuranceRepository, input } = fixture();
      assuranceRepository.findVerifiedAssurance.mockResolvedValueOnce({
        userId: USER_ID,
        sessionId: SESSION_ID,
        verifiedAt: new Date(NOW - HOUR),
        expiresAt: new Date(NOW + HOUR),
        revokedAt: null,
      });
      assuranceRepository.findVerifiedAssurance.mockResolvedValueOnce(/** @type {any} */ (changed));
      expect(await policy.evaluate(input)).toEqual({ decision: 'DENY' });
      expect(sessionPolicy.evaluate).toHaveBeenCalledTimes(2);
      expect(assuranceRepository.findVerifiedAssurance).toHaveBeenCalledTimes(2);
    }
  });

  it('fails closed when the final persisted assurance lookup errors', async () => {
    const { policy, assuranceRepository, input } = fixture();
    assuranceRepository.findVerifiedAssurance
      .mockResolvedValueOnce({
        userId: USER_ID,
        sessionId: SESSION_ID,
        verifiedAt: new Date(NOW - HOUR),
        expiresAt: new Date(NOW + HOUR),
        revokedAt: null,
      })
      .mockRejectedValueOnce(new Error('proof database unavailable'));
    await expect(policy.evaluate(input)).rejects.toThrow('proof database unavailable');
  });

  it('denies inactive, enrollment-required and unrecognized policy decisions', async () => {
    for (const decision of ['DENY', 'ENROLLMENT_REQUIRED', 'UNKNOWN']) {
      const { policy, assuranceRepository, input } = fixture(decision);
      expect(await policy.evaluate(input)).toEqual({ decision: 'DENY' });
      expect(assuranceRepository.findVerifiedAssurance).not.toHaveBeenCalled();
    }
  });

  it('denies assurance from another user, another session, or expired proof', async () => {
    const invalidRecords = [
      null,
      { userId: 'other', sessionId: SESSION_ID },
      { userId: USER_ID, sessionId: 'other' },
      { userId: USER_ID, sessionId: SESSION_ID, revokedAt: new Date(NOW) },
      { userId: USER_ID, sessionId: SESSION_ID, verifiedAt: new Date(NOW + 1) },
      { userId: USER_ID, sessionId: SESSION_ID, verifiedAt: new Date(NOW - 13 * HOUR) },
      { userId: USER_ID, sessionId: SESSION_ID, expiresAt: new Date(NOW) },
    ];
    for (const invalid of invalidRecords) {
      const { policy, assuranceRepository, input } = fixture();
      assuranceRepository.findVerifiedAssurance.mockResolvedValueOnce(/** @type {any} */ (invalid));
      expect(await policy.evaluate(input)).toEqual({ decision: 'DENY' });
    }
  });

  it('denies untrusted identities and invalid clocks before persistence access', async () => {
    const { policy, sessionPolicy, assuranceRepository, input } = fixture();
    for (const invalid of [
      { ...input, userId: '../admin' },
      { ...input, sessionId: '../session' },
      { ...input, now: -1 },
      { ...input, now: 1.5 },
    ]) {
      expect(await policy.evaluate(invalid)).toEqual({ decision: 'DENY' });
    }
    expect(await policy.evaluate()).toEqual({ decision: 'DENY' });
    expect(sessionPolicy.evaluate).not.toHaveBeenCalled();
    expect(assuranceRepository.findVerifiedAssurance).not.toHaveBeenCalled();
  });

  it('fails closed on authorization or assurance database errors', async () => {
    const { policy, sessionPolicy, assuranceRepository, input } = fixture();
    sessionPolicy.evaluate.mockRejectedValueOnce(new Error('authorization unavailable'));
    await expect(policy.evaluate(input)).rejects.toThrow('authorization unavailable');
    assuranceRepository.findVerifiedAssurance.mockRejectedValueOnce(
      new Error('assurance unavailable'),
    );
    await expect(policy.evaluate(input)).rejects.toThrow('assurance unavailable');
  });

  it('requires trusted security dependencies', () => {
    expect(() =>
      createMfaRefreshAssurancePolicy({
        sessionPolicy: /** @type {any} */ ({}),
        assuranceRepository: /** @type {any} */ ({}),
      }),
    ).toThrow('dependencies');
  });
});
