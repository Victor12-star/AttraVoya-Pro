import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import { paymentsRepository } from './payments.repository.js';

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const FAILURE_CODE = /^[A-Z][A-Z0-9_]{0,79}$/;
/** @type {Set<string>} */
const TERMINAL_OUTCOMES = new Set(['IGNORED', 'FAILED']);

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
 *   finalizePendingEvent: (input: any) => Promise<any>
 * }} [repository]
 * @param {{ now?: () => Date }} [options]
 */
export function createPaymentsService(repository = paymentsRepository, options = {}) {
  if (!repository?.recordVerifiedEvent || !repository?.finalizePendingEvent) {
    throw new TypeError('Payments repository is required.');
  }

  const now = options.now ?? (() => new Date());

  return {
    /**
     * Finalize a verified event without applying subscription state.
     *
     * APPLIED is intentionally excluded here. A future processor may only
     * mark an event APPLIED in the same transaction that mutates authoritative
     * subscription state.
     *
     * @param {{
     *   eventId: string,
     *   outcome: 'IGNORED' | 'FAILED',
     *   failureCode?: string | null
     * }} input
     */
    async finalizeVerifiedEvent({ eventId, outcome, failureCode = null }) {
      const normalizedEventId = requiredText(eventId, 'eventId', 255);
      const normalizedOutcome = requiredText(outcome, 'outcome', 16).toUpperCase();

      if (!TERMINAL_OUTCOMES.has(normalizedOutcome)) {
        throw new ValidationError('outcome must be IGNORED or FAILED.');
      }

      let normalizedFailureCode = null;
      if (normalizedOutcome === 'FAILED') {
        normalizedFailureCode = requiredText(failureCode, 'failureCode', 80).toUpperCase();
        if (!FAILURE_CODE.test(normalizedFailureCode)) {
          throw new ValidationError('failureCode must be a privacy-safe machine code.');
        }
      } else if (failureCode != null) {
        throw new ValidationError('failureCode is only valid for FAILED events.');
      }

      const processedAt = requiredDate(now(), 'processedAt');
      const result = await repository.finalizePendingEvent({
        eventId: normalizedEventId,
        status: normalizedOutcome,
        failureCode: normalizedFailureCode,
        processedAt,
      });

      if (!result.event) {
        throw new NotFoundError('Verified billing event was not found.');
      }

      if (!result.transitioned) {
        const sameOutcome =
          result.event.processingStatus === normalizedOutcome &&
          (result.event.failureCode ?? null) === normalizedFailureCode;

        if (!sameOutcome) {
          throw new ConflictError(
            'Verified billing event is already finalized with a different outcome.',
          );
        }
      }

      return {
        event: result.event,
        duplicate: !result.transitioned,
      };
    },

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
  };
}

export const paymentsService = createPaymentsService();
