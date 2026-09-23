import { describe, expect, it, vi } from 'vitest';

import { createPaymentsRepository } from './payments.repository.js';
import { createPaymentsService } from './payments.service.js';

const VERIFIED_AT = new Date('2026-09-23T13:00:00.000Z');
const OCCURRED_AT = new Date('2026-09-23T12:59:00.000Z');
const HASH = 'a'.repeat(64);

function serviceRepository(overrides = {}) {
  return {
    recordVerifiedEvent: vi.fn(),
    finalizePendingEvent: vi.fn(),
    ...overrides,
  };
}

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
    const repository = serviceRepository({
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
    });
    const service = createPaymentsService(repository);

    const result = await service.recordVerifiedEvent(
      /** @type {any} */ ({
        provider: ' Stripe ',
        externalEventId: ' evt_123 ',
        eventType: ' customer.subscription.updated ',
        payloadHash: HASH.toUpperCase(),
        occurredAt: OCCURRED_AT,
        verifiedAt: VERIFIED_AT,
        rawPayload: '{"must":"not persist"}',
        purchaseToken: 'must-not-persist',
      }),
    );

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
    const repository = serviceRepository({
      recordVerifiedEvent: vi.fn(async () => ({
        event: storedEvent(),
        created: false,
      })),
    });
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
    const repository = serviceRepository({
      recordVerifiedEvent: vi.fn(async () => ({
        event: storedEvent({ payloadHash: 'b'.repeat(64) }),
        created: false,
      })),
    });
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
    const repository = serviceRepository();
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

describe('verified billing event terminalization', () => {
  it('transitions a pending event to IGNORED exactly once', async () => {
    const processedAt = new Date('2026-09-23T14:15:00.000Z');
    const repository = serviceRepository({
      finalizePendingEvent: vi.fn(async (input) => ({
        event: storedEvent({
          processingStatus: input.status,
          processedAt: input.processedAt,
          failureCode: input.failureCode,
        }),
        transitioned: true,
      })),
    });
    const service = createPaymentsService(repository, { now: () => processedAt });

    const result = await service.finalizeVerifiedEvent({
      eventId: ' billing-event-1 ',
      outcome: 'ignored',
    });

    expect(repository.finalizePendingEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      status: 'IGNORED',
      failureCode: null,
      processedAt,
    });
    expect(result.duplicate).toBe(false);
    expect(result.event?.processingStatus).toBe('IGNORED');
  });

  it('treats an exact FAILED terminalization retry as idempotent', async () => {
    const repository = serviceRepository({
      finalizePendingEvent: vi.fn(async () => ({
        event: storedEvent({
          processingStatus: 'FAILED',
          failureCode: 'UNSUPPORTED_EVENT',
          processedAt: new Date('2026-09-23T14:15:00.000Z'),
        }),
        transitioned: false,
      })),
    });
    const service = createPaymentsService(repository);

    const result = await service.finalizeVerifiedEvent({
      eventId: 'billing-event-1',
      outcome: 'FAILED',
      failureCode: ' unsupported_event ',
    });

    expect(result.duplicate).toBe(true);
    expect(result.event.processingStatus).toBe('FAILED');
  });

  it('fails closed when the event was already finalized differently', async () => {
    const repository = serviceRepository({
      finalizePendingEvent: vi.fn(async () => ({
        event: storedEvent({
          processingStatus: 'IGNORED',
          processedAt: new Date('2026-09-23T14:15:00.000Z'),
        }),
        transitioned: false,
      })),
    });
    const service = createPaymentsService(repository);

    await expect(
      service.finalizeVerifiedEvent({
        eventId: 'billing-event-1',
        outcome: 'FAILED',
        failureCode: 'PROCESSING_ERROR',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('rejects APPLIED, free-text failure reasons, and failure codes on ignored events', async () => {
    const repository = serviceRepository();
    const service = createPaymentsService(repository);

    await expect(
      service.finalizeVerifiedEvent({
        eventId: 'billing-event-1',
        outcome: 'APPLIED',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    await expect(
      service.finalizeVerifiedEvent({
        eventId: 'billing-event-1',
        outcome: 'FAILED',
        failureCode: 'card declined for user@example.test',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    await expect(
      service.finalizeVerifiedEvent({
        eventId: 'billing-event-1',
        outcome: 'IGNORED',
        failureCode: 'UNSUPPORTED_EVENT',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    expect(repository.finalizePendingEvent).not.toHaveBeenCalled();
  });

  it('returns not found when the verified event does not exist', async () => {
    const repository = serviceRepository({
      finalizePendingEvent: vi.fn(async () => ({
        event: null,
        transitioned: false,
      })),
    });
    const service = createPaymentsService(repository);

    await expect(
      service.finalizeVerifiedEvent({
        eventId: 'missing-event',
        outcome: 'IGNORED',
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
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

  it('uses a pending-only compare-and-set for terminal processing state', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const findUnique = vi.fn(async () =>
      storedEvent({
        processingStatus: 'FAILED',
        failureCode: 'PROCESSING_ERROR',
        processedAt: new Date('2026-09-23T14:15:00.000Z'),
      }),
    );
    const repository = createPaymentsRepository(
      /** @type {any} */ ({ billingEvent: { updateMany, findUnique } }),
    );
    const processedAt = new Date('2026-09-23T14:15:00.000Z');

    const result = await repository.finalizePendingEvent({
      eventId: 'billing-event-1',
      status: 'FAILED',
      failureCode: 'PROCESSING_ERROR',
      processedAt,
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'billing-event-1',
        processingStatus: 'PENDING',
      },
      data: {
        processingStatus: 'FAILED',
        processedAt,
        failureCode: 'PROCESSING_ERROR',
      },
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'billing-event-1' } }),
    );
    expect(result).toMatchObject({
      transitioned: true,
      event: { processingStatus: 'FAILED' },
    });
  });

  it('reports a lost terminalization race without overwriting the winner', async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const findUnique = vi.fn(async () =>
      storedEvent({
        processingStatus: 'IGNORED',
        processedAt: new Date('2026-09-23T14:14:59.000Z'),
      }),
    );
    const repository = createPaymentsRepository(
      /** @type {any} */ ({ billingEvent: { updateMany, findUnique } }),
    );

    const result = await repository.finalizePendingEvent({
      eventId: 'billing-event-1',
      status: 'FAILED',
      failureCode: 'PROCESSING_ERROR',
      processedAt: new Date('2026-09-23T14:15:00.000Z'),
    });

    expect(result.transitioned).toBe(false);
    expect(result.event?.processingStatus).toBe('IGNORED');
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
