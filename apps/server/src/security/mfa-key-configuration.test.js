import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parseMfaEncryptionKey } from './mfa-key-configuration.js';

describe('dedicated MFA encryption key configuration', () => {
  it('round-trips exactly 32 bytes from canonical base64url', () => {
    const key = randomBytes(32);
    const resolved = parseMfaEncryptionKey(key.toString('base64url'));
    expect(resolved).toEqual(key);
    expect(resolved).not.toBe(key);
  });

  it('fails closed when the key is missing or invalid', () => {
    for (const candidate of [
      undefined,
      '',
      'not-a-key',
      ' ',
      Buffer.alloc(16).toString('base64url'),
      Buffer.alloc(33).toString('base64url'),
      Buffer.alloc(32).toString('base64'),
      Buffer.alloc(32).toString('base64url') + '=',
    ]) {
      expect(() => parseMfaEncryptionKey(candidate)).toThrow('dedicated 32-byte');
    }
  });

  it('rejects noncanonical encodings that decode to the same bytes', () => {
    const valid = Buffer.alloc(32, 1).toString('base64url');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const finalIndex = alphabet.indexOf(valid.at(-1));
    const alteredLastCharacter = valid.slice(0, -1) + alphabet.charAt(finalIndex ^ 1);
    expect(() => parseMfaEncryptionKey(alteredLastCharacter)).toThrow('dedicated 32-byte');
    expect(parseMfaEncryptionKey(valid)).toEqual(Buffer.alloc(32, 1));
  });

  it('does not silently accept an unrelated secret', () => {
    const nonString = /** @type {any} */ (Buffer.alloc(32, 9));
    expect(() => parseMfaEncryptionKey(nonString)).toThrow('dedicated 32-byte');
  });
});
