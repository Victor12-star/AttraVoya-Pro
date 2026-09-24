import { createHmac, timingSafeEqual } from 'node:crypto';

import { ValidationError } from '../../errors/app-error.js';

const SIGNATURE_HEX = /^[a-f0-9]{64}$/i;
const DEFAULT_TOLERANCE_SECONDS = 300;

function revenueCatSignatureHeader(headers) {
  if (!headers || typeof headers !== 'object') {
    throw new ValidationError('RevenueCat signature header is required.');
  }

  const value =
    headers['x-revenuecat-webhook-signature'] ??
    headers['X-RevenueCat-Webhook-Signature'] ??
    headers['X-REVENUECAT-WEBHOOK-SIGNATURE'];

  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('RevenueCat signature header is required.');
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
        throw new ValidationError('RevenueCat signature timestamp is invalid.');
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
    throw new ValidationError('RevenueCat signature header is invalid.');
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

function parseRevenueCatEvent(rawPayload) {
  let payload;
  try {
    payload = JSON.parse(rawPayload.toString('utf8'));
  } catch {
    throw new ValidationError('RevenueCat event payload is invalid.');
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('RevenueCat event payload is invalid.');
  }

  if (payload.api_version !== '1.0') {
    throw new ValidationError('RevenueCat webhook API version is unsupported.');
  }

  const event = payload.event;
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new ValidationError('RevenueCat event payload is invalid.');
  }

  const externalEventId = typeof event.id === 'string' ? event.id.trim() : '';
  const eventType = typeof event.type === 'string' ? event.type.trim() : '';

  if (!externalEventId || externalEventId.length > 255 || !eventType || eventType.length > 120) {
    throw new ValidationError('RevenueCat event identity is invalid.');
  }

  let occurredAt = null;
  if (event.event_timestamp_ms != null) {
    if (!Number.isSafeInteger(event.event_timestamp_ms) || event.event_timestamp_ms <= 0) {
      throw new ValidationError('RevenueCat event timestamp is invalid.');
    }

    occurredAt = new Date(event.event_timestamp_ms);
    if (!Number.isFinite(occurredAt.getTime())) {
      throw new ValidationError('RevenueCat event timestamp is invalid.');
    }
  }

  return {
    externalEventId,
    eventType,
    occurredAt,
  };
}

/**
 * Create the RevenueCat-specific verifier used by the provider-neutral billing
 * verification boundary. It verifies RevenueCat HMAC signing against the exact
 * raw request bytes and returns only normalized event identity.
 *
 * This adapter is internal only. It does not register an HTTP route, map an
 * App User ID to account ownership, mutate subscription state, or grant Pro.
 *
 * @param {{
 *   webhookSigningSecret: string,
 *   now?: () => Date,
 *   toleranceSeconds?: number,
 * }} options
 */
export function createRevenueCatWebhookVerifier({
  webhookSigningSecret,
  now = () => new Date(),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}) {
  if (
    typeof webhookSigningSecret !== 'string' ||
    !webhookSigningSecret.trim() ||
    webhookSigningSecret.length > 512
  ) {
    throw new TypeError('RevenueCat webhook signing secret is required.');
  }

  if (!Number.isSafeInteger(toleranceSeconds) || toleranceSeconds < 0) {
    throw new TypeError('RevenueCat webhook tolerance must be a non-negative integer.');
  }

  const secret = webhookSigningSecret;

  return async function verifyRevenueCatWebhook({ rawPayload, headers }) {
    if (!Buffer.isBuffer(rawPayload)) {
      throw new ValidationError('RevenueCat verification requires exact raw request bytes.');
    }

    const currentTime = now();
    if (!(currentTime instanceof Date) || !Number.isFinite(currentTime.getTime())) {
      throw new TypeError('RevenueCat verification requires a valid server time.');
    }

    const { timestamp, signatures } = parseSignatureHeader(revenueCatSignatureHeader(headers));
    const ageSeconds = Math.abs(Math.floor(currentTime.getTime() / 1000) - timestamp);

    if (ageSeconds > toleranceSeconds) {
      throw new ValidationError('RevenueCat signature timestamp is outside the allowed tolerance.');
    }

    const signedPayload = Buffer.concat([
      Buffer.from(String(timestamp)),
      Buffer.from('.'),
      rawPayload,
    ]);
    const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex');

    if (!signatureMatches(expectedSignature, signatures)) {
      throw new ValidationError('RevenueCat signature verification failed.');
    }

    return parseRevenueCatEvent(rawPayload);
  };
}
