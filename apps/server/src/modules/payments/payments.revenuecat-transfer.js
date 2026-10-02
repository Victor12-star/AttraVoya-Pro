import { createHash } from 'node:crypto';

import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import { RevenueCatVerifiedIdentityMismatchError } from './payments.revenuecat-subscription.js';
import { isVerifiedBillingEvidence } from './payments.verification.js';

const SERVER_APP_USER_ID = /^av_rc_[A-Za-z0-9_-]{32}$/;
const MAX_IDENTITIES = 100;
const MAX_IDENTITY_LENGTH = 255;

function requiredIdentityList(value, name) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_IDENTITIES) {
    throw new ValidationError(`${name} is invalid.`);
  }

  const values = value.map((entry) => {
    if (
      typeof entry !== 'string' ||
      entry !== entry.trim() ||
      !entry ||
      entry.length > MAX_IDENTITY_LENGTH
    ) {
      throw new ValidationError(`${name} is invalid.`);
    }
    return entry;
  });

  return [...new Set(values.filter((entry) => SERVER_APP_USER_ID.test(entry)))];
}

function parseVerifiedTransfer({ rawPayload, evidence, expectedAppId }) {
  if (!Buffer.isBuffer(rawPayload)) {
    throw new ValidationError('RevenueCat transfer requires exact raw request bytes.');
  }
  if (!isVerifiedBillingEvidence(evidence) || evidence.provider !== 'revenuecat') {
    throw new ValidationError('RevenueCat transfer requires verified billing evidence.');
  }

  const payloadHash = createHash('sha256').update(rawPayload).digest('hex');
  if (payloadHash !== evidence.payloadHash) {
    throw new RevenueCatVerifiedIdentityMismatchError(
      'RevenueCat verified transfer does not match exact request bytes.',
    );
  }

  let payload;
  try {
    payload = JSON.parse(rawPayload.toString('utf8'));
  } catch {
    throw new ValidationError('RevenueCat transfer payload is invalid.');
  }

  const event = payload?.event;
  if (
    payload?.api_version !== '1.0' ||
    !event ||
    typeof event !== 'object' ||
    Array.isArray(event)
  ) {
    throw new ValidationError('RevenueCat transfer payload is invalid.');
  }

  if (
    event.id !== evidence.externalEventId ||
    event.type !== 'TRANSFER' ||
    evidence.eventType !== 'TRANSFER'
  ) {
    throw new RevenueCatVerifiedIdentityMismatchError(
      'RevenueCat verified transfer identity does not match payload.',
    );
  }

  if (typeof expectedAppId !== 'string' || !expectedAppId.trim()) {
    throw new TypeError('RevenueCat expected app identity is required.');
  }
  if (event.app_id !== expectedAppId.trim()) {
    throw new ValidationError('RevenueCat transfer event is for an unexpected app.');
  }
  if (event.store !== 'PLAY_STORE') {
    throw new ValidationError('RevenueCat transfer event is not from Google Play.');
  }
  if (event.environment !== 'PRODUCTION') {
    return Object.freeze({ action: 'IGNORE', reason: 'NON_PRODUCTION' });
  }
  if (!(evidence.occurredAt instanceof Date) || !Number.isFinite(evidence.occurredAt.getTime())) {
    throw new ValidationError('RevenueCat transfer event time is required.');
  }

  if (!Number.isSafeInteger(event.event_timestamp_ms) || event.event_timestamp_ms <= 0) {
    throw new ValidationError('RevenueCat transfer event timestamp is invalid.');
  }

  const payloadEventTime = new Date(event.event_timestamp_ms);
  if (!Number.isFinite(payloadEventTime.getTime())) {
    throw new ValidationError('RevenueCat transfer event timestamp is invalid.');
  }
  if (payloadEventTime.getTime() !== evidence.occurredAt.getTime()) {
    throw new RevenueCatVerifiedIdentityMismatchError(
      'RevenueCat verified transfer event time does not match payload.',
    );
  }

  const from = requiredIdentityList(event.transferred_from, 'RevenueCat transferred_from');
  const to = requiredIdentityList(event.transferred_to, 'RevenueCat transferred_to');

  if (from.length !== 1 || to.length !== 1) {
    throw new ConflictError('RevenueCat transfer ownership is ambiguous.');
  }
  if (from[0] === to[0]) {
    throw new ConflictError('RevenueCat transfer source and destination must differ.');
  }

  return Object.freeze({
    action: 'APPLY',
    fromAppUserId: from[0],
    toAppUserId: to[0],
    providerStateUpdatedAt: new Date(evidence.occurredAt),
  });
}

/**
 * Resolve a verified Google Play transfer only through server-generated opaque
 * RevenueCat identities. The provider event may move existing ownership, but it
 * never creates a subscription or grants entitlement from provider metadata.
 */
export async function resolveVerifiedRevenueCatAndroidTransfer({
  rawPayload,
  evidence,
  expectedAppId,
  subscriberIdentityService,
}) {
  if (!subscriberIdentityService?.resolveOwnedUser) {
    throw new TypeError('RevenueCat subscriber identity service is required.');
  }

  const transfer = parseVerifiedTransfer({ rawPayload, evidence, expectedAppId });
  if (transfer.action === 'IGNORE') return transfer;

  let fromOwner;
  let toOwner;
  try {
    [fromOwner, toOwner] = await Promise.all([
      subscriberIdentityService.resolveOwnedUser({ appUserId: transfer.fromAppUserId }),
      subscriberIdentityService.resolveOwnedUser({ appUserId: transfer.toAppUserId }),
    ]);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError('RevenueCat transfer ownership could not be resolved.');
    }
    throw error;
  }

  if (fromOwner.userId === toOwner.userId) {
    throw new ConflictError('RevenueCat transfer owners must differ.');
  }

  return Object.freeze({
    action: 'APPLY',
    fromUserId: fromOwner.userId,
    toUserId: toOwner.userId,
    providerStateUpdatedAt: transfer.providerStateUpdatedAt,
  });
}
