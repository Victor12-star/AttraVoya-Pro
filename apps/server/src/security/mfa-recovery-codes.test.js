import { describe, expect, it } from 'vitest';

import { generateMfaRecoveryCodes, hashMfaRecoveryCode } from './mfa-recovery-codes.js';

describe('MFA recovery code security primitives', () => {
  it('creates ten distinct, 160-bit Base32 recovery codes', () => {
    const codes = generateMfaRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);

    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-7]{4}(?:-[A-Z2-7]{4}){7}$/);
      expect(code.replaceAll('-', '')).toHaveLength(32);
    }
  });

  it('generates new codes for every enrollment', () => {
    const first = generateMfaRecoveryCodes();
    const second = generateMfaRecoveryCodes();
    expect(first).not.toEqual(second);
  });

  it('stores stable hexadecimal hashes, not readable recovery codes', () => {
    const code = generateMfaRecoveryCodes()[0];
    const codeHash = hashMfaRecoveryCode({ userId: 'user-one', code });
    expect(codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(codeHash).not.toContain(code.replaceAll('-', ''));
    expect(hashMfaRecoveryCode({ userId: 'user-one', code })).toBe(codeHash);
  });

  it('binds the hash to one user and accepts canonical or grouped input', () => {
    const code = generateMfaRecoveryCodes()[0];
    const raw = code.replaceAll('-', '');
    const first = hashMfaRecoveryCode({ userId: 'user-one', code });
    expect(hashMfaRecoveryCode({ userId: 'user-one', code: raw })).toBe(first);
    expect(hashMfaRecoveryCode({ userId: 'user-one', code: code.toLowerCase() })).toBe(
      first,
    );
    expect(hashMfaRecoveryCode({ userId: 'user-two', code })).not.toBe(first);
  });

  it('rejects malformed input rather than silently reducing entropy', () => {
    const code = generateMfaRecoveryCodes()[0];
    for (const invalid of [
      '',
      null,
      1234,
      'A'.repeat(31),
      'A'.repeat(33),
      '0'.repeat(32),
      code.replaceAll('-', ' '),
      code.slice(0, 5) + code.slice(6),
    ]) {
      expect(hashMfaRecoveryCode({ userId: 'user-one', code: invalid })).toBeNull();
    }
    expect(() => hashMfaRecoveryCode({ userId: '', code })).toThrow();
    expect(() => hashMfaRecoveryCode({ userId: 'bad:user', code })).toThrow();
  });
});
