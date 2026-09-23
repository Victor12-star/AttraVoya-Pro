import { createHmac, timingSafeEqual } from 'node:crypto';

import { ValidationError } from '../../errors/app-error.js';

const SIGNATURE_HEX = /^[a-f0-9]{64}$/i;
const DEFAULT_TOLERANCE_SECONDS = 300;

function stripeSignatureHeader(headers) {
  if (!headers || typeof headers !== 'object') {
    throw new ValidationError('Stripe signature header is required.');
  }

  const value =
    headers['stripe-signature'] ?? headers['Stripe-Signature'] ?? headers['STRIPE-SIGNATURE'];

  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('Stripe signature header is required.');
  }

  return value.trim();
}

/** @returns {{ timestamp: number, signatures: string[] }} */
function parseSignatureHeader(value) {
  let timestamp = null;
  const signatures = [];

  for (const part of value.split(',')) {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    const key = rawKey?.trim();
    const entryValue = rawValueParts.join('=').trim();

    if (key === 't' && timestamp == null) {
      if (!/^\d+$/.test(entryValue)) {
        throw new ValidationError('Stripe signature timestamp is invalid.');
      }
      timestamp = Number(entryValue);
      continue;
    }

    if (key === 'v1' && SIGNATURE_HEX.test(entryValue)) {
      signatures.push(entryValue.toLowerCase());
    }
  }

  if (
    typeof timestamp !== 'number' ||
    !Number.isSafeInteger(timestamp) ||
    timestamp <= 0 ||
    signatures.length === 0
  ) {
    throw new ValidationError('Stripe signature header is invalid.');
  }

  return { timestamp, signatures };
}

function signatureMatches(expectedHex, candidates) {
  const expected = Buffer.from(expectedHex, 'hex');

  return candidates.some((candidate) => {
    const received = Buffer.from(candidate, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

function parseStripeEvent(rawPayload) {
  let event;
  try {
    event = JSON.parse(rawPayload.toString('utf8'));
  } catch {
    throw new ValidationError('Stripe event payload is invalid.');
  }

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new ValidationError('Stripe event payload is invalid.');
  }

  const externalEventId = typeof event.id === 'string' ? event.id.trim() : '';
  const eventType = typeof event.type === 'string' ? event.type.trim() : '';

  if (!externalEventId || externalEventId.length > 255 || !eventType || eventType.length > 120) {
    throw new ValidationError('Stripe event identity is invalid.');
  }

  let occurredAt = null;
  if (event.created != null) {
    if (!Number.isSafeInteger(event.created) || event.created <= 0) {
      throw new ValidationError('Stripe event created time is invalid.');
    }
    occurredAt = new Date(event.created * 1000);
  }

  return {
    externalEventId,
    eventType,
    occurredAt,
  };
}

/**
 * Create the Stripe-specific verifier used by the provider-neutral billing
 * verification boundary. It authenticates Stripe's timestamped HMAC signature
 * against the exact raw request bytes and returns only normalized event identity.
 *
 * @param {{
 *   webhookSecret: string,
 *   now?: () => Date,
 *   toleranceSeconds?: number,
 * }} options
 */
export function createStripeWebhookVerifier({
  webhookSecret,
  now = () => new Date(),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}) {
  if (typeof webhookSecret !== 'string' || !webhookSecret.trim() || webhookSecret.length > 512) {
    throw new TypeError('Stripe webhook secret is required.');
  }

  if (!Number.isSafeInteger(toleranceSeconds) || toleranceSeconds < 0) {
    throw new TypeError('Stripe webhook tolerance must be a non-negative integer.');
  }

  const secret = webhookSecret;

  return async function verifyStripeWebhook({ rawPayload, headers }) {
    if (!Buffer.isBuffer(rawPayload)) {
      throw new ValidationError('Stripe verification requires exact raw request bytes.');
    }

    const currentTime = now();
    if (!(currentTime instanceof Date) || !Number.isFinite(currentTime.getTime())) {
      throw new TypeError('Stripe verification requires a valid server time.');
    }

    const { timestamp, signatures } = parseSignatureHeader(stripeSignatureHeader(headers));
    const ageSeconds = Math.abs(Math.floor(currentTime.getTime() / 1000) - timestamp);

    if (ageSeconds > toleranceSeconds) {
      throw new ValidationError('Stripe signature timestamp is outside the allowed tolerance.');
    }

    const signedPayload = Buffer.concat([
      Buffer.from(String(timestamp)),
      Buffer.from('.'),
      rawPayload,
    ]);
    const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex');

    if (!signatureMatches(expectedSignature, signatures)) {
      throw new ValidationError('Stripe signature verification failed.');
    }

    return parseStripeEvent(rawPayload);
  };
}
