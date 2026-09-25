import { createHash } from 'node:crypto';

import { ValidationError } from '../../errors/app-error.js';
import { isVerifiedBillingEvidence } from './payments.verification.js';

const SUPPORTED_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'BILLING_ISSUE',
  'EXPIRATION',
  'SUBSCRIPTION_PAUSED',
  'SUBSCRIPTION_EXTENDED',
]);

const PERIOD_TYPES = new Set(['TRIAL', 'INTRO', 'NORMAL', 'PROMOTIONAL', 'PREPAID']);
const ENVIRONMENTS = new Set(['SANDBOX', 'PRODUCTION']);
const CANCELLATION_REASONS = new Set([
  'UNSUBSCRIBE',
  'BILLING_ERROR',
  'DEVELOPER_INITIATED',
  'PRICE_INCREASE',
  'CUSTOMER_SUPPORT',
]);
const MAX_PROVIDER_ID_LENGTH = 255;

class RevenueCatVerifiedIdentityMismatchError extends ValidationError {}

function requiredText(value, name, maxLength = MAX_PROVIDER_ID_LENGTH) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${name} is required.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ValidationError(`${name} is invalid.`);
  }

  return normalized;
}

function millisecondsDate(value, name, { nullable = false } = {}) {
  if (value == null && nullable) return null;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ValidationError(`${name} is invalid.`);
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ValidationError(`${name} is invalid.`);
  }

  return date;
}

function cancellationReason(event, eventType) {
  if (eventType !== 'CANCELLATION') return null;

  const reason = requiredText(event.cancel_reason, 'RevenueCat cancellation reason', 40);
  if (!CANCELLATION_REASONS.has(reason)) {
    throw new ValidationError('RevenueCat cancellation reason is unsupported.');
  }

  return reason;
}

function parseVerifiedRevenueCatEvent(rawPayload, evidence) {
  if (!Buffer.isBuffer(rawPayload)) {
    throw new ValidationError('RevenueCat normalization requires exact raw request bytes.');
  }

  if (!isVerifiedBillingEvidence(evidence) || evidence.provider !== 'revenuecat') {
    throw new ValidationError('RevenueCat normalization requires verified billing evidence.');
  }

  const payloadHash = createHash('sha256').update(rawPayload).digest('hex');
  if (payloadHash !== evidence.payloadHash) {
    throw new RevenueCatVerifiedIdentityMismatchError(
      'RevenueCat verified payload does not match exact request bytes.',
    );
  }

  let payload;
  try {
    payload = JSON.parse(rawPayload.toString('utf8'));
  } catch {
    throw new ValidationError('RevenueCat lifecycle payload is invalid.');
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    payload.api_version !== '1.0'
  ) {
    throw new ValidationError('RevenueCat lifecycle payload is invalid.');
  }

  const event = payload.event;
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new ValidationError('RevenueCat lifecycle payload is invalid.');
  }

  const eventId = requiredText(event.id, 'RevenueCat event identity');
  const eventType = requiredText(event.type, 'RevenueCat event type', 120);

  if (eventId !== evidence.externalEventId || eventType !== evidence.eventType) {
    throw new RevenueCatVerifiedIdentityMismatchError(
      'RevenueCat verified event identity does not match payload.',
    );
  }

  if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
    throw new ValidationError('RevenueCat lifecycle event type is unsupported.');
  }

  return { event, eventType };
}

/**
 * Normalize an already-verified RevenueCat Google Play subscription lifecycle event.
 *
 * This boundary deliberately excludes App User IDs, aliases, entitlement names,
 * purchase tokens and raw provider metadata. It establishes provider subscription
 * identity and server-owned plan mapping only; it does not resolve AttraVoya user
 * ownership, mutate subscription state or grant entitlements.
 *
 * @param {{
 *   rawPayload: Buffer,
 *   evidence: object,
 *   productPolicy: { resolvePlanKey: (productId: string) => string }
 * }} input
 */
export function normalizeVerifiedRevenueCatAndroidLifecycle({
  rawPayload,
  evidence,
  productPolicy,
}) {
  if (!productPolicy?.resolvePlanKey) {
    throw new TypeError('RevenueCat Android product policy is required.');
  }

  const { event, eventType } = parseVerifiedRevenueCatEvent(rawPayload, evidence);

  const store = requiredText(event.store, 'RevenueCat store', 40);
  if (store !== 'PLAY_STORE') {
    throw new ValidationError('RevenueCat lifecycle event is not from Google Play.');
  }

  const environment = requiredText(event.environment, 'RevenueCat environment', 20);
  if (!ENVIRONMENTS.has(environment)) {
    throw new ValidationError('RevenueCat environment is unsupported.');
  }

  const productId = requiredText(event.product_id, 'RevenueCat product identifier', 200);
  const planKey = productPolicy.resolvePlanKey(productId);

  const externalSubscriptionId = requiredText(
    event.original_transaction_id,
    'RevenueCat original transaction identity',
  );

  const periodType = requiredText(event.period_type, 'RevenueCat period type', 30);
  if (!PERIOD_TYPES.has(periodType)) {
    throw new ValidationError('RevenueCat period type is unsupported.');
  }

  const purchasedAt = millisecondsDate(event.purchased_at_ms, 'RevenueCat purchase time');
  const expiresAt = millisecondsDate(event.expiration_at_ms, 'RevenueCat expiration time', {
    nullable: true,
  });
  const normalizedCancellationReason = cancellationReason(event, eventType);

  if (!evidence.occurredAt) {
    throw new ValidationError('RevenueCat lifecycle event time is required.');
  }

  return Object.freeze({
    provider: 'revenuecat',
    store: 'PLAY_STORE',
    environment,
    externalSubscriptionId,
    planKey,
    eventType,
    periodType,
    cancellationReason: normalizedCancellationReason,
    purchasedAt,
    expiresAt,
    providerStateUpdatedAt: new Date(evidence.occurredAt),
  });
}
