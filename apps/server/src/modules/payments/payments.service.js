import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/app-error.js';
import { paymentsRepository } from './payments.repository.js';

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const SUBSCRIPTION_STATUSES = new Set([
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'EXPIRED',
]);

function requiredText(value, name, maxLength) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${name} is required.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ValidationError(`${name} is invalid.`);
  }

  return normalized;
}

function requiredDate(value, name) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new ValidationError(`${name} must be a valid date.`);
  }

  return value;
}

function optionalDate(value, name) {
  if (value == null) return null;
  return requiredDate(value, name);
}

/**
 * @param {{
 *   recordVerifiedEvent: (input: any) => Promise<any>,
 *   applyVerifiedSubscriptionState?: (input: any) => Promise<any>,
 * }} [repository]
 * @param {{ now?: () => Date }} [options]
 */
export function createPaymentsService(repository = paymentsRepository, options = {}) {
  if (!repository?.recordVerifiedEvent) {
    throw new TypeError('Payments repository is required.');
  }

  const now = options.now ?? (() => new Date());

  return {
    /**
     * @param {{
     *   provider: string,
     *   externalEventId: string,
     *   eventType: string,
     *   payloadHash: string,
     *   occurredAt?: Date | null,
     *   verifiedAt: Date,
     * }} input
     */
    async recordVerifiedEvent({
      provider,
      externalEventId,
      eventType,
      payloadHash,
      occurredAt = null,
      verifiedAt,
    }) {
      const normalizedProvider = requiredText(provider, 'provider', 64).toLowerCase();
      const normalizedExternalEventId = requiredText(externalEventId, 'externalEventId', 255);
      const normalizedEventType = requiredText(eventType, 'eventType', 120);
      const normalizedPayloadHash = requiredText(payloadHash, 'payloadHash', 64).toLowerCase();

      if (!SHA256_HEX.test(normalizedPayloadHash)) {
        throw new ValidationError('payloadHash must be a SHA-256 hex digest.');
      }

      const normalizedVerifiedAt = requiredDate(verifiedAt, 'verifiedAt');
      const normalizedOccurredAt = optionalDate(occurredAt, 'occurredAt');

      const result = await repository.recordVerifiedEvent({
        provider: normalizedProvider,
        externalEventId: normalizedExternalEventId,
        eventType: normalizedEventType,
        payloadHash: normalizedPayloadHash,
        occurredAt: normalizedOccurredAt,
        verifiedAt: normalizedVerifiedAt,
      });

      if (
        !result.created &&
        (result.event.eventType !== normalizedEventType ||
          result.event.payloadHash.toLowerCase() !== normalizedPayloadHash)
      ) {
        // Reusing one provider event ID for different verified content is not
        // an idempotent retry. Fail closed so no later processor can silently
        // apply ambiguous billing evidence.
        throw new ConflictError('Verified billing event identity conflicts with existing content.');
      }

      return {
        event: result.event,
        duplicate: !result.created,
      };
    },

    /**
     * Apply provider-normalized subscription state for an event that is already
     * present in the verified billing-event ledger. This internal boundary does
     * not verify provider evidence and is intentionally not exposed as HTTP.
     *
     * @param {{
     *   eventId: string,
     *   subscriptionId: string,
     *   provider: string,
     *   status: string,
     *   currentPeriodEnd?: Date | null,
     *   canceledAt?: Date | null,
     *   providerStateUpdatedAt: Date,
     * }} input
     */
    async applyVerifiedSubscriptionState({
      eventId,
      subscriptionId,
      provider,
      status,
      currentPeriodEnd = null,
      canceledAt = null,
      providerStateUpdatedAt,
    }) {
      if (!repository.applyVerifiedSubscriptionState) {
        throw new TypeError('Subscription-state repository boundary is required.');
      }

      const normalizedEventId = requiredText(eventId, 'eventId', 128);
      const normalizedSubscriptionId = requiredText(subscriptionId, 'subscriptionId', 128);
      const normalizedProvider = requiredText(provider, 'provider', 64).toLowerCase();
      const normalizedStatus = requiredText(status, 'status', 32).toUpperCase();
      const normalizedStateTime = requiredDate(providerStateUpdatedAt, 'providerStateUpdatedAt');
      const normalizedPeriodEnd = optionalDate(currentPeriodEnd, 'currentPeriodEnd');
      const normalizedCanceledAt = optionalDate(canceledAt, 'canceledAt');
      const processedAt = requiredDate(now(), 'current time');

      if (!SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
        throw new ValidationError('status is invalid.');
      }

      if (
        (normalizedStatus === 'ACTIVE' || normalizedStatus === 'TRIALING') &&
        (!normalizedPeriodEnd || normalizedPeriodEnd <= normalizedStateTime)
      ) {
        throw new ValidationError(
          'Active or trialing subscription state requires a future currentPeriodEnd.',
        );
      }

      if (normalizedStatus === 'CANCELED' && !normalizedCanceledAt) {
        throw new ValidationError('Canceled subscription state requires canceledAt.');
      }

      const result = await repository.applyVerifiedSubscriptionState({
        eventId: normalizedEventId,
        subscriptionId: normalizedSubscriptionId,
        provider: normalizedProvider,
        status: normalizedStatus,
        currentPeriodEnd: normalizedPeriodEnd,
        canceledAt: normalizedCanceledAt,
        providerStateUpdatedAt: normalizedStateTime,
        processedAt,
      });

      if (result.outcome === 'EVENT_NOT_FOUND') {
        throw new NotFoundError('Verified billing event was not found.');
      }

      if (result.outcome === 'SUBSCRIPTION_NOT_FOUND') {
        throw new NotFoundError('Subscription was not found.');
      }

      if (
        result.outcome === 'PROVIDER_MISMATCH' ||
        result.outcome === 'SUBSCRIPTION_PROVIDER_MISMATCH'
      ) {
        throw new ConflictError('Verified billing provider does not match subscription state.');
      }

      if (result.outcome === 'ALREADY_PROCESSED') {
        return {
          applied: false,
          duplicate: true,
          stale: result.event?.processingStatus === 'IGNORED',
          event: result.event ?? null,
          subscription: null,
        };
      }

      if (result.outcome === 'STALE') {
        return {
          applied: false,
          duplicate: false,
          stale: true,
          event: result.event,
          subscription: result.subscription,
        };
      }

      if (result.outcome !== 'APPLIED') {
        throw new ConflictError('Verified billing event could not be applied safely.');
      }

      return {
        applied: true,
        duplicate: false,
        stale: false,
        event: result.event,
        subscription: result.subscription,
      };
    },
  };
}

export const paymentsService = createPaymentsService();
