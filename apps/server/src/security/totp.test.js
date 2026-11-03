import { describe, expect, it } from 'vitest';

import { generateTotpSecret, totpProvisioningUri, verifyTotp } from './totp.js';

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP security primitives', () => {
  it('generates distinct 160-bit Base32 secrets without padding', () => {
    const first = generateTotpSecret();
    const second = generateTotpSecret();
    expect(first).toMatch(/^[A-Z2-7]{32}$/);
    expect(second).toMatch(/^[A-Z2-7]{32}$/);
    expect(first).not.toBe(second);
  });

  it('matches the RFC 6238 SHA1 vector (six-digit truncation)', () => {
    expect(verifyTotp({ secret: RFC_SECRET, code: '287082', now: 59_000 })).toBe(1);
    expect(verifyTotp({ secret: RFC_SECRET, code: '081804', now: 1_111_111_109_000 })).toBe(
      Math.floor(1_111_111_109 / 30),
    );
    expect(verifyTotp({ secret: RFC_SECRET, code: '050471', now: 2_000_000_000_000 })).toBe(
      Math.floor(2_000_000_000 / 30),
    );
  });

  it('allows only one adjacent time step and returns a replay guard counter', () => {
    const matching = verifyTotp({ secret: RFC_SECRET, code: '287082', now: 30_000 });
    expect(matching).toBe(1);
    expect(verifyTotp({ secret: RFC_SECRET, code: '287082', now: 60_000 })).toBe(1);
    expect(
      verifyTotp({
        secret: RFC_SECRET,
        code: '287082',
        now: 60_000,
        lastAcceptedCounter: matching,
      }),
    ).toBeNull();
    expect(verifyTotp({ secret: RFC_SECRET, code: '287082', now: 90_000 })).toBeNull();
  });

  it('rejects malformed codes, invalid time, and noncanonical secrets', () => {
    for (const code of ['12345', '1234567', '12a456', ' 123456', 123456, null]) {
      expect(verifyTotp({ secret: RFC_SECRET, code, now: 59_000 })).toBeNull();
    }
    expect(() => verifyTotp({ secret: 'bad', code: '287082', now: 59_000 })).toThrow();
    expect(() => verifyTotp({ secret: RFC_SECRET, code: '287082', now: -1 })).toThrow();
    expect(() =>
      verifyTotp({ secret: RFC_SECRET, code: '287082', lastAcceptedCounter: -2 }),
    ).toThrow();
  });

  it('returns a valid encoded otpauth provisioning URI', () => {
    const value = totpProvisioningUri({
      secret: RFC_SECRET,
      issuer: 'AttraVoya Pro',
      account: 'owner+test@example.test',
    });
    expect(value).toContain('otpauth://totp/AttraVoya%20Pro:owner%2Btest%40example.test?');
    const uri = new URL(value);
    expect(uri.searchParams.get('secret')).toBe(RFC_SECRET);
    expect(uri.searchParams.get('issuer')).toBe('AttraVoya Pro');
    expect(uri.searchParams.get('period')).toBe('30');
    expect(uri.searchParams.get('digits')).toBe('6');
  });
});
