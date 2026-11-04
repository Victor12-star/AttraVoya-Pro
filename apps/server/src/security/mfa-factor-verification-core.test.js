import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { encryptTotpSecret } from './mfa-secret-crypto.js';
import { createMfaFactorVerificationCore } from './mfa-factor-verification-core.js';

const NOW = 1_800_000_000_000;
const KEY = Buffer.alloc(32, 17);
const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

function codeAt(now) {
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
  const factor = {
    enabledAt: new Date(NOW - 60_000),
    secretEnvelope: encryptTotpSecret({ secret: SECRET, userId: 'admin-one', key: KEY }),
    lastAcceptedCounter: -1,
  };
  const repository = {
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
  const service = createMfaFactorVerificationCore({ repository, encryptionKey: KEY });
  return { factor, repository, service };
}

describe('isolated enabled MFA factor verification', () => {
  it('requires all protected dependencies', () => {
    expect(() => createMfaFactorVerificationCore({ repository: {}, encryptionKey: KEY })).toThrow(
      'dependencies',
    );
    expect(() =>
      createMfaFactorVerificationCore({ repository: fixture().repository, encryptionKey: null }),
    ).toThrow('dependencies');
  });

  it('accepts an enabled factor once and rejects replay', async () => {
    const { service, repository } = fixture();
    const code = codeAt(NOW);
    expect(await service.verify({ userId: 'admin-one', code, now: NOW })).toBe(true);
    expect(await service.verify({ userId: 'admin-one', code, now: NOW })).toBe(false);
    expect(repository.consumeTotpCounter).toHaveBeenCalledOnce();
  });

  it('rejects invalid identity and malformed codes without accessing persistence', async () => {
    const { service, repository } = fixture();
    expect(await service.verify({ userId: 'wrong:id', code: codeAt(NOW), now: NOW })).toBe(false);
    expect(await service.verify({ userId: 'admin-one', code: '123', now: NOW })).toBe(false);
    expect(repository.findEnabledFactor).not.toHaveBeenCalled();
  });

  it('rejects inactive and missing factors before consuming codes', async () => {
    const { service, factor, repository } = fixture();
    factor.enabledAt = null;
    expect(await service.verify({ userId: 'admin-one', code: codeAt(NOW), now: NOW })).toBe(false);
    repository.findEnabledFactor.mockResolvedValueOnce(null);
    expect(await service.verify({ userId: 'admin-one', code: codeAt(NOW), now: NOW })).toBe(false);
    expect(repository.consumeTotpCounter).not.toHaveBeenCalled();
  });

  it('fails on tampered or differently bound ciphertext without a counter update', async () => {
    const { service, factor, repository } = fixture();
    factor.secretEnvelope = encryptTotpSecret({ secret: SECRET, userId: 'another-user', key: KEY });
    await expect(service.verify({ userId: 'admin-one', code: codeAt(NOW), now: NOW })).rejects.toThrow(
      'decrypted',
    );
    expect(repository.consumeTotpCounter).not.toHaveBeenCalled();
  });

  it('allows only one concurrent consumption of the same OTP', async () => {
    const { service, repository } = fixture();
    const code = codeAt(NOW);
    const results = await Promise.all([
      service.verify({ userId: 'admin-one', code, now: NOW }),
      service.verify({ userId: 'admin-one', code, now: NOW }),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect(repository.consumeTotpCounter).toHaveBeenCalledTimes(2);
  });

  it('fails closed when the atomic counter update is unavailable', async () => {
    const { service, repository } = fixture();
    repository.consumeTotpCounter.mockResolvedValueOnce(false);
    expect(await service.verify({ userId: 'admin-one', code: codeAt(NOW), now: NOW })).toBe(false);
  });
});
