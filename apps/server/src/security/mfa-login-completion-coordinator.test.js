import { describe, expect, it, vi } from 'vitest';

import { createMfaLoginCompletionCoordinator } from './mfa-login-completion-coordinator.js';

const USER_ID = 'admin-one';
const TOKEN = 'a'.repeat(43);
const CODE = '123456';
const NOW = 1_800_000_000_000;

function fixture() {
  const sessionPolicy = {
    evaluate: vi.fn(async () => ({ decision: 'MFA_REQUIRED' })),
  };
  const challengeService = {
    complete: vi.fn(async () => true),
  };
  const coordinator = createMfaLoginCompletionCoordinator({
    sessionPolicy,
    challengeService,
  });
  const input = { userId: USER_ID, challengeToken: TOKEN, code: CODE, now: NOW };
  return { sessionPolicy, challengeService, coordinator, input };
}

describe('route-free MFA challenge completion coordinator', () => {
  it('accepts one consumed challenge only after two current authorization checks', async () => {
    const { coordinator, sessionPolicy, challengeService, input } = fixture();
    const result = await coordinator.complete(input);
    expect(result).toEqual({ decision: 'MFA_VERIFIED', userId: USER_ID });
    expect(sessionPolicy.evaluate).toHaveBeenCalledTimes(2);
    expect(sessionPolicy.evaluate).toHaveBeenNthCalledWith(1, USER_ID);
    expect(sessionPolicy.evaluate).toHaveBeenNthCalledWith(2, USER_ID);
    expect(challengeService.complete).toHaveBeenCalledWith(input);
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('denies malformed inputs before querying policy or consuming a code', async () => {
    const { coordinator, sessionPolicy, challengeService, input } = fixture();
    for (const invalid of [
      { ...input, userId: '../admin' },
      { ...input, challengeToken: 'weak' },
      { ...input, code: 'abc123' },
      { ...input, now: -1 },
      { ...input, now: 1.5 },
    ]) {
      expect(await coordinator.complete(invalid)).toEqual({ decision: 'DENY' });
    }
    expect(await coordinator.complete()).toEqual({ decision: 'DENY' });
    expect(sessionPolicy.evaluate).not.toHaveBeenCalled();
    expect(challengeService.complete).not.toHaveBeenCalled();
  });

  it('denies removed privileges or disabled enrollment before factor consumption', async () => {
    for (const decision of ['PASSWORD_ONLY', 'ENROLLMENT_REQUIRED', 'DENY']) {
      const { coordinator, sessionPolicy, challengeService, input } = fixture();
      sessionPolicy.evaluate.mockResolvedValueOnce({ decision });
      expect(await coordinator.complete(input)).toEqual({ decision: 'DENY' });
      expect(challengeService.complete).not.toHaveBeenCalled();
    }
  });

  it('denies expired, reused, invalid or unsuccessfully consumed challenges', async () => {
    const { coordinator, sessionPolicy, challengeService, input } = fixture();
    challengeService.complete.mockResolvedValueOnce(false);
    expect(await coordinator.complete(input)).toEqual({ decision: 'DENY' });
    expect(sessionPolicy.evaluate).toHaveBeenCalledOnce();
  });

  it('denies privilege or factor changes after a consumed challenge', async () => {
    const { coordinator, sessionPolicy, challengeService, input } = fixture();
    sessionPolicy.evaluate.mockResolvedValueOnce({ decision: 'MFA_REQUIRED' });
    sessionPolicy.evaluate.mockResolvedValueOnce({ decision: 'PASSWORD_ONLY' });
    expect(await coordinator.complete(input)).toEqual({ decision: 'DENY' });
    expect(challengeService.complete).toHaveBeenCalledOnce();
    expect(sessionPolicy.evaluate).toHaveBeenCalledTimes(2);
  });

  it('propagates account and challenge persistence errors without a session', async () => {
    const { coordinator, sessionPolicy, challengeService, input } = fixture();
    sessionPolicy.evaluate.mockRejectedValueOnce(new Error('authorization database unavailable'));
    await expect(coordinator.complete(input)).rejects.toThrow('authorization database unavailable');
    challengeService.complete.mockRejectedValueOnce(new Error('challenge database unavailable'));
    await expect(coordinator.complete(input)).rejects.toThrow('challenge database unavailable');
  });

  it('rejects missing security dependencies', () => {
    expect(() =>
      createMfaLoginCompletionCoordinator({
        sessionPolicy: /** @type {any} */ ({}),
        challengeService: /** @type {any} */ ({}),
      }),
    ).toThrow('dependencies');
  });
});
