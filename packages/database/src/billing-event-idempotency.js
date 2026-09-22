import { prisma } from './client.js';

const PROVIDER_PATTERN = /^[a-z][a-z0-9_-]{0,39}$/;
const EVENT_ID_PATTERN = /^.{1,255}$/s;
const EVENT_TYPE_PATTERN = /^.{1,160}$/s;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function requireMatch(value, pattern, message) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new TypeError(message);
  }
  return value;
}

function isUniqueConstraintError(error) {
  return Boolean(error && typeof error === 'object' && error.code === 'P2002');
}

function receiptMatches(existing, eventType, payloadSha256) {
  return (
    existing?.eventType === eventType &&
    existing?.payloadSha256 === payloadSha256
  );
}

/**
 * Execute one verified billing-provider event exactly once.
 *
 * The receipt insert and the caller's database mutations share one transaction.
 * If the callback fails, the receipt rolls back too, so a provider retry can
 * safely attempt processing again. Raw webhook payloads are deliberately not
 * persisted; callers pass only a SHA-256 fingerprint after signature checks.
 *
 * The callback must contain database work only. Do not perform provider/network
 * requests inside it because holding a database transaction across external I/O
 * would increase lock time and failure coupling.
 *
 * @param {{
 *   provider: string,
 *   externalEventId: string,
 *   eventType: string,
 *   payloadSha256: string,
 *   apply: Function,
 * }} input
 * @param {{ client?: any }} [options]
 */
export async function processBillingEventOnce(input, options = {}) {
  const provider = requireMatch(
    input?.provider,
    PROVIDER_PATTERN,
    'A normalized billing provider key is required.',
  );
  const externalEventId = requireMatch(
    input?.externalEventId,
    EVENT_ID_PATTERN,
    'A bounded billing event ID is required.',
  );
  const eventType = requireMatch(
    input?.eventType,
    EVENT_TYPE_PATTERN,
    'A bounded billing event type is required.',
  );
  const payloadSha256 = requireMatch(
    input?.payloadSha256,
    SHA256_PATTERN,
    'A lowercase SHA-256 payload fingerprint is required.',
  );

  if (typeof input?.apply !== 'function') {
    throw new TypeError('A billing event transaction callback is required.');
  }

  const client = options.client ?? prisma;

  try {
    const value = await client.$transaction(async (tx) => {
      await tx.billingEventReceipt.create({
        data: {
          provider,
          externalEventId,
          eventType,
          payloadSha256,
        },
      });

      return input.apply(tx);
    });

    return { status: 'processed', value };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const existing = await client.billingEventReceipt.findUnique({
      where: {
        provider_externalEventId: {
          provider,
          externalEventId,
        },
      },
      select: {
        eventType: true,
        payloadSha256: true,
      },
    });

    if (!receiptMatches(existing, eventType, payloadSha256)) {
      throw new Error('Billing event replay does not match the stored receipt.', {
        cause: error,
      });
    }

    return { status: 'duplicate', value: undefined };
  }
}
