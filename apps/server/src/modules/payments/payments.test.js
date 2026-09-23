import { describe, expect, it, vi } from 'vitest';

import { createPaymentsRepository } from './payments.repository.js';
import { createPaymentsService } from './payments.service.js';

const VERIFIED_AT = new Date('2026-09-23T13:00:00.000Z');
const OCCURRED_AT = new Date('2026-09-23T12:59:00.000Z');
const HASH = 'a'.repeat(64);

function storedEvent(overrides = {}) {
  return {
    id: 'billing-event-1',
    provider: 'stripe',
    externalEventId: 'evt_123',
    eventType: 'customer.subscription.updated',
    payloadHash: HASH,
    processingStatus: 'PENDING',
    occurredAt: OCCURRED_AT,
    verifiedAt: VERIFIED_AT,
    receivedAt: new Date('2026-09-23T13:00:01.000Z'),
    processedAt: null,
    failureCode: null,
    subscriptionId: null,
    ...overrides,
  };
}

describe('verified billing event service', () => {
  it('records normalized already-verified evidence without storing raw payload input', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(async (input) => ({
        event: storedEvent({
          provider: input.provider,
          externalEventId: input.externalEventId,
          eventType: input.eventType,
          payloadHash: input.payloadHash,
          occurredAt: input.occurredAt,
          verifiedAt: input.verifiedAt,
        }),
        created: true,
      })),
    };
    const service = createPaymentsService(repository);

    const result = await service.recordVerifiedEvent({
      provider: ' Stripe ',
      externalEventId: ' evt_123 ',
      eventType: ' customer.subscription.updated ',
      payloadHash: HASH.toUpperCase(),
      occurredAt: OCCURRED_AT,
      verifiedAt: VERIFIED_AT,
      rawPayload: '{"must":"not persist"}',
      purchaseToken: 'must-not-persist',
    });

    expect(repository.recordVerifiedEvent).toHaveBeenCalledWith({
      provider: 'stripe',
      externalEventId: 'evt_123',
      eventType: 'customer.subscription.updated',
      payloadHash: HASH,
      occurredAt: OCCURRED_AT,
      verifiedAt: VERIFIED_AT,
    });
    expect(result.duplicate).toBe(false);
  });

  it('treats an exact provider retry as a harmless duplicate', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(async () => ({
        event: storedEvent(),
        created: false,
      })),
    };
    const service = createPaymentsService(repository);

    const result = await service.recordVerifiedEvent({
      provider: 'stripe',
      externalEventId: 'evt_123',
      eventType: 'customer.subscription.updated',
      payloadHash: HASH,
      occurredAt: OCCURRED_AT,
      verifiedAt: new Date('2026-09-23T13:02:00.000Z'),
    });

    expect(result).toMatchObject({
      duplicate: true,
      event: { id: 'billing-event-1', processingStatus: 'PENDING' },
    });
  });

  it('rejects reuse of one provider event identity for different verified content', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(async () => ({
        event: storedEvent({ payloadHash: 'b'.repeat(64) }),
        created: false,
      })),
    };
    const service = createPaymentsService(repository);

    await expect(
      service.recordVerifiedEvent({
        provider: 'stripe',
        externalEventId: 'evt_123',
        eventType: 'customer.subscription.updated',
        payloadHash: HASH,
        verifiedAt: VERIFIED_AT,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('rejects malformed digests and invalid verification times before persistence', async () => {
    const repository = { recordVerifiedEvent: vi.fn() };
    const service = createPaymentsService(repository);

    await expect(
      service.recordVerifiedEvent({
        provider: 'stripe',
        externalEventId: 'evt_123',
        eventType: 'customer.subscription.updated',
        payloadHash: 'not-a-sha256-digest',
        verifiedAt: VERIFIED_AT,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    await expect(
      service.recordVerifiedEvent({
        provider: 'stripe',
        externalEventId: 'evt_123',
        eventType: 'customer.subscription.updated',
        payloadHash: HASH,
        verifiedAt: new Date('invalid'),
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    expect(repository.recordVerifiedEvent).not.toHaveBeenCalled();
  });
});

describe('verified billing event repository', () => {
  it('creates the first delivery using only privacy-minimized ledger fields', async () => {
    const create = vi.fn(async () => storedEvent());
    const repository = createPaymentsRepository(
      /** @type {any} */ ({ billingEvent: { create, findUnique: vi.fn() } }),
    );

    const result = await repository.recordVerifiedEvent({
      provider: 'stripe',
      externalEventId: 'evt_123',
      eventType: 'customer.subscription.updated',
      payloadHash: HASH,
      occurredAt: OCCURRED_AT,
      verifiedAt: VERIFIED_AT,
    });

    expect(result.created).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          provider: 'stripe',
          externalEventId: 'evt_123',
          eventType: 'customer.subscription.updated',
          payloadHash: HASH,
          occurredAt: OCCURRED_AT,
          verifiedAt: VERIFIED_AT,
        },
      }),
    );
  });

  it('resolves a concurrent duplicate through the unique provider/event identity', async () => {
    const duplicateError = Object.assign(new Error('unique conflict'), { code: 'P2002' });
    const create = vi.fn(async () => {
      throw duplicateError;
    });
    const findUnique = vi.fn(async () => storedEvent());
    const repository = createPaymentsRepository(
      /** @type {any} */ ({ billingEvent: { create, findUnique } }),
    );

    const result = await repository.recordVerifiedEvent({
      provider: 'stripe',
      externalEventId: 'evt_123',
      eventType: 'customer.subscription.updated',
      payloadHash: HASH,
      occurredAt: OCCURRED_AT,
      verifiedAt: VERIFIED_AT,
    });

    expect(result.created).toBe(false);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_externalEventId: {
            provider: 'stripe',
            externalEventId: 'evt_123',
          },
        },
      }),
    );
  });

  it('does not hide unrelated database failures', async () => {
    const databaseError = Object.assign(new Error('database unavailable'), { code: 'P1001' });
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        billingEvent: {
          create: vi.fn(async () => {
            throw databaseError;
          }),
          findUnique: vi.fn(),
        },
      }),
    );

    await expect(
      repository.recordVerifiedEvent({
        provider: 'stripe',
        externalEventId: 'evt_123',
        eventType: 'customer.subscription.updated',
        payloadHash: HASH,
        occurredAt: OCCURRED_AT,
        verifiedAt: VERIFIED_AT,
      }),
    ).rejects.toBe(databaseError);
  });
});
