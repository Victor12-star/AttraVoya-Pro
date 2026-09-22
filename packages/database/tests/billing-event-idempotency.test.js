import { describe, expect, it, vi } from 'vitest';

import { processBillingEventOnce } from '../src/billing-event-idempotency.js';

const EVENT = Object.freeze({
  provider: 'stripe',
  externalEventId: 'evt_test_123',
  eventType: 'customer.subscription.updated',
  payloadSha256: 'a'.repeat(64),
});

function duplicateError() {
  const error = new Error('Unique constraint failed');
  error.code = 'P2002';
  return error;
}

describe('billing event idempotency helper', () => {
  it('stores the minimal receipt before applying database mutations', async () => {
    const create = vi.fn(async () => ({ id: 'receipt-1' }));
    const tx = { billingEventReceipt: { create } };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
      billingEventReceipt: { findUnique: vi.fn() },
    };
    const apply = vi.fn(async (receivedTx) => {
      expect(receivedTx).toBe(tx);
      return { subscriptionUpdated: true };
    });

    await expect(processBillingEventOnce({ ...EVENT, apply }, { client })).resolves.toEqual({
      status: 'processed',
      value: { subscriptionUpdated: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        provider: EVENT.provider,
        externalEventId: EVENT.externalEventId,
        eventType: EVENT.eventType,
        payloadSha256: EVENT.payloadSha256,
      },
    });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('treats a matching provider retry as a duplicate without applying it again', async () => {
    const apply = vi.fn();
    const client = {
      $transaction: vi.fn(async () => {
        throw duplicateError();
      }),
      billingEventReceipt: {
        findUnique: vi.fn(async () => ({
          eventType: EVENT.eventType,
          payloadSha256: EVENT.payloadSha256,
        })),
      },
    };

    await expect(processBillingEventOnce({ ...EVENT, apply }, { client })).resolves.toEqual({
      status: 'duplicate',
      value: undefined,
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it('rejects a reused event ID when the event fingerprint does not match', async () => {
    const client = {
      $transaction: vi.fn(async () => {
        throw duplicateError();
      }),
      billingEventReceipt: {
        findUnique: vi.fn(async () => ({
          eventType: EVENT.eventType,
          payloadSha256: 'b'.repeat(64),
        })),
      },
    };

    await expect(
      processBillingEventOnce({ ...EVENT, apply: vi.fn() }, { client }),
    ).rejects.toThrow('Billing event replay does not match the stored receipt.');
  });

  it('propagates processing failures so the transaction can roll back', async () => {
    const failure = new Error('subscription mutation failed');
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          billingEventReceipt: {
            create: vi.fn(async () => ({ id: 'receipt-1' })),
          },
        }),
      ),
      billingEventReceipt: { findUnique: vi.fn() },
    };

    await expect(
      processBillingEventOnce(
        {
          ...EVENT,
          apply: async () => {
            throw failure;
          },
        },
        { client },
      ),
    ).rejects.toBe(failure);
  });

  it('validates bounded normalized metadata and never accepts a raw payload substitute', async () => {
    const client = { $transaction: vi.fn() };

    await expect(
      processBillingEventOnce(
        {
          ...EVENT,
          provider: 'Stripe',
          apply: vi.fn(),
        },
        { client },
      ),
    ).rejects.toThrow('A normalized billing provider key is required.');

    await expect(
      processBillingEventOnce(
        {
          ...EVENT,
          payloadSha256: '{"raw":"payload"}',
          apply: vi.fn(),
        },
        { client },
      ),
    ).rejects.toThrow('A lowercase SHA-256 payload fingerprint is required.');
  });
});
