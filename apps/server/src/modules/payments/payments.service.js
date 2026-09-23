import { ConflictError, ValidationError } from '../../errors/app-error.js';
import { paymentsRepository } from './payments.repository.js';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

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
 * @param {{ recordVerifiedEvent: (input: any) => Promise<any> }} [repository]
 */
export function createPaymentsService(repository = paymentsRepository) {
  if (!repository?.recordVerifiedEvent) {
    throw new TypeError('Payments repository is required.');
  }

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
      const normalizedExternalEventId = requiredText(
        externalEventId,
        'externalEventId',
        255,
      );
      const normalizedEventType = requiredText(eventType, 'eventType', 120);
      const normalizedPayloadHash = requiredText(
        payloadHash,
        'payloadHash',
        64,
      ).toLowerCase();

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
        throw new ConflictError(
          'Verified billing event identity conflicts with existing content.',
        );
      }

      return {
        event: result.event,
        duplicate: !result.created,
      };
    },
  };
}

export const paymentsService = createPaymentsService();
