import { createHmac, randomBytes } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createConfiguredMfaLoginChallenge } from './mfa-configured-login-challenge.js';
import { encryptTotpSecret } from './mfa-secret-crypto.js';

const NOW = 1_800_000_000_000;
const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

function totpCode(now) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let value = 0;
  let bits = 0;
  const bytes = [];
  for (const letter of SECRET) {
    value = (value << 5) | alphabet.indexOf(letter);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
      value &= (1 << bits) - 1;
    }
  }
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

function fixture() {
  const key = randomBytes(32);
  /** @type {any} */
  let challenge = null;
  const challengeRepository = {
    createChallenge: vi.fn(async (data) => {
      challenge = { ...data, attempts: 0, consumedAt: null };
    }),
    findChallenge: vi.fn(async (hash) =>
      challenge?.challengeHash === hash ? { ...challenge } : null,
    ),
    recordFailedAttempt: vi.fn(async ({ challengeHash, now, maxAttempts }) => {
      if (
        !challenge ||
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
    consumeChallenge: vi.fn(async ({ challengeHash, now, maxAttempts }) => {
      if (
        !challenge ||
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
  const factor = {
    enabledAt: new Date(NOW - 60_000),
    secretEnvelope: encryptTotpSecret({ secret: SECRET, userId: 'admin-one', key }),
    lastAcceptedCounter: -1,
  };
  const factorRepository = {
    findEnabledFactor: vi.fn(async () => ({ ...factor })),
    consumeTotpCounter: vi.fn(async ({ expectedEnvelope, counter }) => {
      if (
        !factor.enabledAt ||
        expectedEnvelope !== factor.secretEnvelope ||
        counter <= factor.lastAcceptedCounter
      ) {
        return false;
      }
      factor.lastAcceptedCounter = counter;
      return true;
    }),
  };
  const service = createConfiguredMfaLoginChallenge({
    encodedEncryptionKey: key.toString('base64url'),
    challengeRepository,
    factorRepository,
  });
  return { key, challengeRepository, factorRepository, service };
}

describe('configured isolated MFA login challenge', () => {
  it('fails closed without the dedicated key or protected dependencies', () => {
    const { challengeRepository, factorRepository } = fixture();
    expect(() =>
      createConfiguredMfaLoginChallenge({ challengeRepository, factorRepository }),
    ).toThrow('dedicated 32-byte');
    expect(() =>
      createConfiguredMfaLoginChallenge({
        encodedEncryptionKey: randomBytes(32).toString('base64url'),
        challengeRepository: {},
        factorRepository,
      }),
    ).toThrow('dependencies');
  });

  it('issues a hashed five-minute challenge and completes only once with valid TOTP', async () => {
    const { service, challengeRepository, factorRepository } = fixture();
    const issued = await service.issue({ userId: 'admin-one', now: NOW });
    expect(issued.challengeToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(issued.expiresAt).toBe(new Date(NOW + 300_000).toISOString());
    expect(challengeRepository.createChallenge.mock.calls[0][0].challengeHash).toMatch(
      /^[a-f0-9]{64}$/,
    );
    const input = {
      userId: 'admin-one',
      challengeToken: issued.challengeToken,
      code: totpCode(NOW),
      now: NOW,
    };
    expect(await service.complete(input)).toBe(true);
    expect(await service.complete(input)).toBe(false);
    expect(factorRepository.consumeTotpCounter).toHaveBeenCalledOnce();
    expect(challengeRepository.consumeChallenge).toHaveBeenCalledOnce();
  });

  it('rejects wrong factor codes, challenge expiry and replay without issuing tokens', async () => {
    const { service, challengeRepository, factorRepository } = fixture();
    const issued = await service.issue({ userId: 'admin-one', now: NOW });
    const input = { userId: 'admin-one', challengeToken: issued.challengeToken, now: NOW };
    expect(await service.complete({ ...input, code: '000000' })).toBe(false);
    expect(challengeRepository.recordFailedAttempt).toHaveBeenCalledOnce();
    expect(await service.complete({ ...input, code: totpCode(NOW), now: NOW + 300_000 })).toBe(
      false,
    );
    expect(factorRepository.consumeTotpCounter).not.toHaveBeenCalled();
    expect(challengeRepository.consumeChallenge).not.toHaveBeenCalled();
  });

  it('does not complete when challenge consumption fails after TOTP verification', async () => {
    const { service, challengeRepository } = fixture();
    const issued = await service.issue({ userId: 'admin-one', now: NOW });
    challengeRepository.consumeChallenge.mockResolvedValueOnce(false);
    const completed = await service.complete({
      userId: 'admin-one',
      challengeToken: issued.challengeToken,
      code: totpCode(NOW),
      now: NOW,
    });
    expect(completed).toBe(false);
  });
});
