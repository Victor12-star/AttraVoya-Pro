import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decryptTotpSecret, encryptTotpSecret } from './mfa-secret-crypto.js';

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const KEY = Buffer.alloc(32, 7);

describe('account-bound MFA secret encryption', () => {
  it('encrypts and decrypts for the bound account without exposing the secret', () => {
    const envelope = encryptTotpSecret({ secret: SECRET, userId: 'user-one', key: KEY });
    expect(envelope).toMatch(/^mfa1:/);
    expect(envelope).not.toContain(SECRET);
    expect(decryptTotpSecret({ envelope, userId: 'user-one', key: KEY })).toBe(SECRET);
  });

  it('uses distinct random nonces on each encryption', () => {
    const first = encryptTotpSecret({ secret: SECRET, userId: 'user-one', key: KEY });
    const second = encryptTotpSecret({ secret: SECRET, userId: 'user-one', key: KEY });
    expect(first).not.toBe(second);
    expect(decryptTotpSecret({ envelope: first, userId: 'user-one', key: KEY })).toBe(SECRET);
    expect(decryptTotpSecret({ envelope: second, userId: 'user-one', key: KEY })).toBe(SECRET);
  });

  it('refuses cross-account access and wrong encryption keys', () => {
    const envelope = encryptTotpSecret({ secret: SECRET, userId: 'user-one', key: KEY });
    expect(() => decryptTotpSecret({ envelope, userId: 'user-two', key: KEY })).toThrow();
    expect(() =>
      decryptTotpSecret({ envelope, userId: 'user-one', key: randomBytes(32) }),
    ).toThrow();
  });

  it('rejects forged ciphertext, nonce, tag and version', () => {
    const envelope = encryptTotpSecret({ secret: SECRET, userId: 'user-one', key: KEY });
    const parts = envelope.split(':');
    for (const index of [1, 2, 3]) {
      const modified = [...parts];
      modified[index] = (modified[index][0] === 'A' ? 'B' : 'A') + modified[index].slice(1);
      expect(() =>
        decryptTotpSecret({ envelope: modified.join(':'), userId: 'user-one', key: KEY }),
      ).toThrow();
    }
    expect(() =>
      decryptTotpSecret({
        envelope: envelope.replace('mfa1:', 'mfa2:'),
        userId: 'user-one',
        key: KEY,
      }),
    ).toThrow();
  });

  it('validates keys, account identifiers, and secret formats', () => {
    expect(() =>
      encryptTotpSecret({ secret: SECRET, userId: 'user-one', key: Buffer.alloc(16) }),
    ).toThrow();
    expect(() => encryptTotpSecret({ secret: SECRET, userId: '', key: KEY })).toThrow();
    expect(() =>
      encryptTotpSecret({ secret: 'not-base32', userId: 'user-one', key: KEY }),
    ).toThrow();
    expect(() =>
      decryptTotpSecret({ envelope: 'mfa1:bad', userId: 'user-one', key: KEY }),
    ).toThrow();
  });
});
