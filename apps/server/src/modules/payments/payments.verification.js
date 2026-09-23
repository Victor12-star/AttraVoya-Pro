import { createHash } from 'node:crypto';

import { DEFAULT_BODY_LIMIT_BYTES } from '../../config/constants.js';
import { ProviderResponseError, ValidationError } from '../../errors/app-error.js';

const verifiedEvidence = new WeakSet();

function requiredText(value, name, maxLength) {
  if (typeof value !== 'string') {
    throw new ProviderResponseError(`Billing provider verifier returned invalid ${name}.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ProviderResponseError(`Billing provider verifier returned invalid ${name}.`);
  }

  return normalized;
}

function optionalDate(value, name) {
  if (value == null) return null;
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new ProviderResponseError(`Billing provider verifier returned invalid ${name}.`);
  }

  return value;
}

function rawPayloadBytes(value, maxPayloadBytes) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw new ValidationError('rawPayload must contain the exact provider request bytes.');
  }

  const payload = Buffer.from(value);
  if (payload.length === 0) {
    throw new ValidationError('rawPayload must not be empty.');
  }

  if (payload.length > maxPayloadBytes) {
    throw new ValidationError('rawPayload exceeds the billing verification size limit.');
  }

  return payload;
}

export function isVerifiedBillingEvidence(value) {
  return Boolean(value && typeof value === 'object' && verifiedEvidence.has(value));
}

/**
 * Build an internal provider-verification boundary.
 *
 * The provider-specific adapter receives exact request bytes and request
 * metadata, performs authenticity verification, and returns only normalized
 * event identity. This boundary then owns hashing and the server verification
 * timestamp so callers cannot supply those trust fields themselves.
 *
 * @param {{
 *   provider: string,
 *   verify: (input: { rawPayload: Buffer, headers: object }) => Promise<any>,
 *   now?: () => Date,
 *   maxPayloadBytes?: number
 * }} options
 */
export function createBillingVerificationBoundary({
  provider,
  verify,
  now = () => new Date(),
  maxPayloadBytes = DEFAULT_BODY_LIMIT_BYTES,
}) {
  if (typeof provider !== 'string' || !provider.trim() || provider.trim().length > 64) {
    throw new TypeError('Billing provider key is required.');
  }

  if (typeof verify !== 'function') {
    throw new TypeError('Billing provider verifier is required.');
  }

  if (!Number.isSafeInteger(maxPayloadBytes) || maxPayloadBytes <= 0) {
    throw new TypeError('Billing verification payload limit must be a positive integer.');
  }

  const normalizedProvider = provider.trim().toLowerCase();

  return {
    async verifyEvent({ rawPayload, headers = {} }) {
      const payload = rawPayloadBytes(rawPayload, maxPayloadBytes);
      const payloadHash = createHash('sha256').update(payload).digest('hex');
      const verifiedAt = now();

      if (!(verifiedAt instanceof Date) || !Number.isFinite(verifiedAt.getTime())) {
        throw new TypeError('Billing verification requires a valid server time.');
      }

      const result = await verify({
        rawPayload: Buffer.from(payload),
        headers: headers && typeof headers === 'object' ? Object.freeze({ ...headers }) : {},
      });

      if (!result || typeof result !== 'object') {
        throw new ProviderResponseError('Billing provider verifier returned invalid evidence.');
      }

      const evidence = Object.freeze({
        provider: normalizedProvider,
        externalEventId: requiredText(result.externalEventId, 'externalEventId', 255),
        eventType: requiredText(result.eventType, 'eventType', 120),
        payloadHash,
        occurredAt: optionalDate(result.occurredAt, 'occurredAt'),
        verifiedAt,
      });

      verifiedEvidence.add(evidence);
      return evidence;
    },
  };
}
