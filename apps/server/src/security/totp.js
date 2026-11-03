import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;
const SECRET_BYTES = 20;

function encodeBase32(bytes) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits -= 5)) & 31];
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(secret) {
  if (typeof secret !== 'string' || !/^[A-Z2-7]{32}$/.test(secret)) {
    throw new TypeError('Invalid TOTP secret.');
  }
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of secret) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits -= 8)) & 255);
    }
    value &= (1 << bits) - 1;
  }
  if (bits !== 0 && value !== 0) throw new TypeError('Noncanonical TOTP secret.');
  return Buffer.from(output);
}

function totpAtCounter(secretBytes, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secretBytes).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary =
    ((digest[offset] & 127) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Generate a new 160-bit Base32 TOTP secret; never log or persist in plaintext. */
export function generateTotpSecret() {
  return encodeBase32(randomBytes(SECRET_BYTES));
}

/** Return a provisioning URI to show only during a protected, pending enrollment. */
export function totpProvisioningUri({ secret, issuer, account }) {
  decodeBase32(secret);
  if (
    typeof issuer !== 'string' ||
    !issuer.trim() ||
    typeof account !== 'string' ||
    !account.trim()
  ) {
    throw new TypeError('TOTP issuer and account are required.');
  }
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Verify six-digit TOTP without timing-dependent string comparison.
 * Return the matched time counter, or null if invalid. Callers MUST persist
 * a strictly increasing lastAcceptedCounter atomically with challenge use,
 * and MUST fail closed if that persistence fails.
 */
export function verifyTotp({ secret, code, now = Date.now(), lastAcceptedCounter = -1 }) {
  if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) return null;
  if (!Number.isSafeInteger(now) || now < 0) throw new RangeError('Invalid TOTP time.');
  if (!Number.isSafeInteger(lastAcceptedCounter) || lastAcceptedCounter < -1) {
    throw new RangeError('Invalid accepted counter.');
  }
  const secretBytes = decodeBase32(secret);
  const currentCounter = Math.floor(now / (PERIOD_SECONDS * 1000));
  for (const delta of [-1, 0, 1]) {
    const counter = currentCounter + delta;
    if (counter < 0 || counter <= lastAcceptedCounter) continue;
    const candidate = Buffer.from(totpAtCounter(secretBytes, counter), 'ascii');
    if (timingSafeEqual(candidate, Buffer.from(code, 'ascii'))) return counter;
  }
  return null;
}
