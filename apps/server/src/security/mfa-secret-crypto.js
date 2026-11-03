import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ENVELOPE_VERSION = 'mfa1';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Accept a 32-byte key supplied by a dedicated MFA key manager.
 * Never derive this key from a user password or reuse a signing key.
 */
function assertKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new TypeError('MFA encryption requires a 32-byte Buffer key.');
  }
}

function associatedData(userId) {
  if (typeof userId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
    throw new TypeError('Invalid MFA account identifier.');
  }
  return Buffer.from(`attravoya:mfa:totp:v1:${userId}`, 'utf8');
}

/**
 * AES-256-GCM encryption with a fresh random nonce and an authenticated user
 * binding. Result is an opaque envelope suitable for a restricted DB column.
 * The caller must protect and rotate the separate encryption key.
 */
export function encryptTotpSecret({ secret, userId, key }) {
  assertKey(key);
  if (typeof secret !== 'string' || !/^[A-Z2-7]{32}$/.test(secret)) {
    throw new TypeError('Invalid TOTP secret.');
  }
  const iv = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(associatedData(userId));
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENVELOPE_VERSION, iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join(':');
}

/**
 * Decrypt only for the account to which this envelope was authenticated.
 * An invalid envelope, wrong user/key, or tampering fails closed.
 */
export function decryptTotpSecret({ envelope, userId, key }) {
  assertKey(key);
  const aad = associatedData(userId);
  if (typeof envelope !== 'string' || envelope.length > 256) {
    throw new TypeError('Invalid MFA secret envelope.');
  }
  const parts = envelope.split(':');
  if (
    parts.length !== 4 ||
    parts[0] !== ENVELOPE_VERSION ||
    !/^[A-Za-z0-9_-]{16}$/.test(parts[1]) ||
    !/^[A-Za-z0-9_-]{43}$/.test(parts[2]) ||
    !/^[A-Za-z0-9_-]{22}$/.test(parts[3])
  ) {
    throw new TypeError('Invalid MFA secret envelope.');
  }
  const iv = Buffer.from(parts[1], 'base64url');
  const ciphertext = Buffer.from(parts[2], 'base64url');
  const tag = Buffer.from(parts[3], 'base64url');
  if (iv.length !== NONCE_BYTES || ciphertext.length !== 32 || tag.length !== TAG_BYTES) {
    throw new TypeError('Invalid MFA secret envelope.');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    if (!/^[A-Z2-7]{32}$/.test(plaintext)) throw new Error('Invalid plaintext.');
    return plaintext;
  } catch {
    throw new Error('MFA secret could not be decrypted.');
  }
}
