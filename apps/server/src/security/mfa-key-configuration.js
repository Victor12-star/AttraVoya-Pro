/**
 * Parse an independently managed MFA secret-encryption key.
 *
 * A dedicated key must be provisioned before MFA enrollment is wired to
 * HTTP routes. This helper never generates, logs, persists, or falls back
 * to the general data-encryption or session-signing key.
 *
 * @param {string | undefined} encodedKey Canonical unpadded base64url key.
 * @returns {Buffer} Exactly 32 bytes for AES-256-GCM.
 */
export function parseMfaEncryptionKey(encodedKey) {
  if (
    typeof encodedKey !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(encodedKey)
  ) {
    throw new TypeError('A dedicated 32-byte MFA encryption key is required.');
  }

  const key = Buffer.from(encodedKey, 'base64url');
  if (key.length !== 32 || key.toString('base64url') !== encodedKey) {
    throw new TypeError('A dedicated 32-byte MFA encryption key is required.');
  }

  return key;
}
