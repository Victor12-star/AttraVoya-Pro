import { createHmac, randomBytes } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createConfiguredMfaFactorVerifier } from './mfa-configured-factor-verification.js';
import { encryptTotpSecret } from './mfa-secret-crypto.js';

const NOW = 1_800_000_000_000;
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
  const key = randomBytes(32);
  const factor = {
    enabledAt: new Date(NOW - 60_000),
    secretEnvelope: encryptTotpSecret({ secret: SECRET, userId: 'admin-one', key }),
    lastAcceptedCounter: -1,
  };
  const repository = {
    findEnabledFactor: vi.fn(async () => ({ ...factor })),
    consumeTotpCounter: vi.fn(async ({ expectedEnvelope, counter }) => {
      if (
        expectedEnvelope !== factor.secretEnvelope ||
        !factor.enabledAt ||
        counter <= factor.lastAcceptedCounter
      ) {
        return false;
      }
      factor.lastAcceptedCounter = counter;
      return true;
    }),
  };
  return { key, factor, repository };
}

describe('configured MFA factor verification composition', () => {
  it('rejects a missing, malformed or unrelated key before accessing persistence', () => {
    const { repository } = fixture();
    for (const encodedEncryptionKey of [undefined, '', 'not-a-key']) {
      expect(() => createConfiguredMfaFactorVerifier({ repository, encodedEncryptionKey })).toThrow(
        'dedicated 32-byte',
      );
    }
    expect(repository.findEnabledFactor).not.toHaveBeenCalled();
  });

  it('verifies an enabled factor once with a dedicated canonical key', async () => {
    const { key, repository } = fixture();
    const verifier = createConfiguredMfaFactorVerifier({
      encodedEncryptionKey: key.toString('base64url'),
      repository,
    });
    const input = { userId: 'admin-one', code: codeAt(NOW), now: NOW };
    expect(await verifier.verify(input)).toBe(true);
    expect(await verifier.verify(input)).toBe(false);
    expect(repository.consumeTotpCounter).toHaveBeenCalledOnce();
  });

  it('does not accept an incorrect dedicated encryption key', async () => {
    const { repository } = fixture();
    const verifier = createConfiguredMfaFactorVerifier({
      encodedEncryptionKey: randomBytes(32).toString('base64url'),
      repository,
    });
    await expect(
      verifier.verify({ userId: 'admin-one', code: codeAt(NOW), now: NOW }),
    ).rejects.toThrow('decrypted');
    expect(repository.consumeTotpCounter).not.toHaveBeenCalled();
  });

  it('fails closed when the atomic database update cannot consume a counter', async () => {
    const { key, repository } = fixture();
    repository.consumeTotpCounter.mockResolvedValueOnce(false);
    const verifier = createConfiguredMfaFactorVerifier({
      encodedEncryptionKey: key.toString('base64url'),
      repository,
    });
    expect(await verifier.verify({ userId: 'admin-one', code: codeAt(NOW), now: NOW })).toBe(false);
  });
});
