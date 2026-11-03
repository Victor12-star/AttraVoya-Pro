import { createHash, randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CODE_BYTES = 20;
const CODE_COUNT = 10;
const CODE_PATTERN = /^[A-Z2-7]{32}$/;
const ACCOUNT_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function encodeBase32(bytes) {
  let bits = 0;
  let value = 0;
  let encoded = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += ALPHABET[(value >>> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }

  return encoded;
}

function normalizeRecoveryCode(code) {
  if (typeof code !== 'string') return null;
  const raw = code.replaceAll('-', '').toUpperCase();
  if (!CODE_PATTERN.test(raw)) return null;
  if (code !== raw && !/^[A-Za-z2-7]{4}(?:-[A-Za-z2-7]{4}){7}$/.test(code)) {
    return null;
  }
  return raw;
}

/**
 * Generate 10 distinct, independent 160-bit recovery codes for one enrollment.
 * The raw codes must be shown once, then discarded after hashing for storage.
 */
export function generateMfaRecoveryCodes() {
  const codes = new Set();

  while (codes.size < CODE_COUNT) {
    const raw = encodeBase32(randomBytes(CODE_BYTES));
    codes.add(raw.match(/.{4}/g).join('-'));
  }

  return [...codes];
}

/**
 * Hash a high-entropy recovery code under its account ID and protocol version.
 * Invalid code syntax yields null; callers must fail closed on null results.
 * The database must consume an unused matching hash atomically with use.
 */
export function hashMfaRecoveryCode({ userId, code }) {
  if (typeof userId !== 'string' || !ACCOUNT_PATTERN.test(userId)) {
    throw new TypeError('Invalid MFA account identifier.');
  }
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) return null;
  return createHash('sha256')
    .update(`attravoya:mfa:recovery:v1:${userId}:${normalized}`, 'utf8')
    .digest('hex');
}
