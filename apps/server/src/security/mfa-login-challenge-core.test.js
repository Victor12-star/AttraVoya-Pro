import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createMfaLoginChallengeCore } from './mfa-login-challenge-core.js';

const NOW = 1_800_000_000_000;
const PURPOSE = 'ADMIN_LOGIN';

function fixture() {
  /** @type {any} */
  let challenge = null;
  const repository = {
    createChallenge: vi.fn(async (data) => {
      challenge = { ...data, consumedAt: null, attempts: 0 };
    }),
    findChallenge: vi.fn(async (challengeHash) =>
      challenge?.challengeHash === challengeHash ? { ...challenge } : null,
    ),
    recordFailedAttempt: vi.fn(async ({ userId, challengeHash, now, maxAttempts }) => {
      if (
        !challenge ||
        challenge.userId !== userId ||
        challenge.challengeHash !== challengeHash ||
        challenge.consumedAt ||
        challenge.expiresAt <= now ||
        challenge.attempts >= maxAttempts
      ) {
        return false;
      }
      challenge.attempts += 1;
      return true;
    }),
    consumeChallenge: vi.fn(async ({ userId, challengeHash, now, maxAttempts }) => {
      if (
        !challenge ||
        challenge.userId !== userId ||
        challenge.challengeHash !== challengeHash ||
        challenge.consumedAt ||
        challenge.expiresAt <= now ||
        challenge.attempts >= maxAttempts
      ) {
        return false;
      }
      challenge.consumedAt = now;
      return true;
    }),
  };
  const verifyFactor = vi.fn(async () => true);
  const service = createMfaLoginChallengeCore({ repository, verifyFactor });
  const issue = () => service.issue({ userId: 'admin-one', now: NOW });
  return { repository, verifyFactor, service, issue, getChallenge: () => challenge };
}

describe('isolated privileged MFA login challenge core', () => {
  it('requires explicit guarded repository and factor-verifier dependencies', () => {
    expect(() => createMfaLoginChallengeCore({ repository: {}, verifyFactor: vi.fn() })).toThrow(
      'dependencies',
    );
  });

  it('stores a one-way challenge hash and returns a short-lived opaque token', async () => {
    const { issue, repository } = fixture();
    const result = await issue();
    expect(result.challengeToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.expiresAt).toBe(new Date(NOW + 300_000).toISOString());
    const stored = repository.createChallenge.mock.calls[0][0];
    expect(stored.userId).toBe('admin-one');
    expect(stored.purpose).toBe(PURPOSE);
    expect(stored.challengeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.challengeHash).not.toContain(result.challengeToken);
    expect(stored.challengeHash).toBe(
      createHash('sha256')
        .update('attravoya:mfa:login:v1:')
        .update(result.challengeToken)
        .digest('hex'),
    );
  });

  it('consumes a valid challenge exactly once', async () => {
    const { issue, service, repository } = fixture();
    const { challengeToken } = await issue();
    const input = { userId: 'admin-one', challengeToken, code: '123456', now: NOW };
    expect(await service.complete(input)).toBe(true);
    expect(await service.complete(input)).toBe(false);
    expect(repository.consumeChallenge).toHaveBeenCalledOnce();
  });

  it('rejects wrong account, malformed token and expired challenge', async () => {
    const { issue, service, verifyFactor } = fixture();
    const { challengeToken } = await issue();
    expect(
      await service.complete({ userId: 'another-user', challengeToken, code: '123456', now: NOW }),
    ).toBe(false);
    expect(
      await service.complete({ userId: 'admin-one', challengeToken: 'invalid', code: '123456' }),
    ).toBe(false);
    expect(
      await service.complete({
        userId: 'admin-one',
        challengeToken,
        code: '123456',
        now: NOW + 300_000,
      }),
    ).toBe(false);
    expect(verifyFactor).not.toHaveBeenCalled();
  });

  it('records failed factor verification and locks out after five attempts', async () => {
    const { issue, service, verifyFactor, repository, getChallenge } = fixture();
    verifyFactor.mockResolvedValue(false);
    const { challengeToken } = await issue();
    for (let index = 0; index < 5; index += 1) {
      expect(
        await service.complete({ userId: 'admin-one', challengeToken, code: '000000', now: NOW }),
      ).toBe(false);
    }
    expect(getChallenge().attempts).toBe(5);
    verifyFactor.mockResolvedValue(true);
    expect(
      await service.complete({ userId: 'admin-one', challengeToken, code: '123456', now: NOW }),
    ).toBe(false);
    expect(repository.consumeChallenge).not.toHaveBeenCalled();
  });

  it('does not allow concurrent completion to consume a challenge twice', async () => {
    const { issue, service } = fixture();
    const { challengeToken } = await issue();
    const input = { userId: 'admin-one', challengeToken, code: '123456', now: NOW };
    const results = await Promise.all([service.complete(input), service.complete(input)]);
    expect(results.sort()).toEqual([false, true]);
  });

  it('fails closed if factor verification or challenge persistence fails', async () => {
    const { issue, service, verifyFactor, repository } = fixture();
    const { challengeToken } = await issue();
    verifyFactor.mockResolvedValueOnce(false);
    repository.recordFailedAttempt.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      service.complete({ userId: 'admin-one', challengeToken, code: '000000', now: NOW }),
    ).rejects.toThrow('database unavailable');
    repository.consumeChallenge.mockResolvedValueOnce(false);
    expect(
      await service.complete({ userId: 'admin-one', challengeToken, code: '123456', now: NOW }),
    ).toBe(false);
  });
});
