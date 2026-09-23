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

describe('verified subscription state application', () => {
  it('applies normalized current provider state through the transactional repository boundary', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(),
      applyVerifiedSubscriptionState: vi.fn(async (input) => ({
        outcome: 'APPLIED',
        event: storedEvent({
          id: input.eventId,
          provider: input.provider,
          processingStatus: 'APPLIED',
          processedAt: input.processedAt,
          subscriptionId: input.subscriptionId,
        }),
        subscription: {
          id: input.subscriptionId,
          provider: input.provider,
          status: input.status,
          currentPeriodEnd: input.currentPeriodEnd,
          providerStateUpdatedAt: input.providerStateUpdatedAt,
          canceledAt: input.canceledAt,
        },
      })),
    };
    const processedAt = new Date('2026-09-23T14:30:00.000Z');
    const service = createPaymentsService(repository, { now: () => processedAt });
    const stateTime = new Date('2026-09-23T14:25:00.000Z');
    const periodEnd = new Date('2026-10-23T14:25:00.000Z');

    const result = await service.applyVerifiedSubscriptionState({
      eventId: ' billing-event-1 ',
      subscriptionId: ' subscription-1 ',
      provider: ' Stripe ',
      status: ' active ',
      currentPeriodEnd: periodEnd,
      providerStateUpdatedAt: stateTime,
    });

    expect(repository.applyVerifiedSubscriptionState).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      subscriptionId: 'subscription-1',
      provider: 'stripe',
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
      canceledAt: null,
      providerStateUpdatedAt: stateTime,
      processedAt,
    });
    expect(result).toMatchObject({
      applied: true,
      duplicate: false,
      stale: false,
      subscription: { status: 'ACTIVE', provider: 'stripe' },
    });
  });

  it('treats a previously processed event as an idempotent duplicate', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(),
      applyVerifiedSubscriptionState: vi.fn(async () => ({
        outcome: 'ALREADY_PROCESSED',
        event: storedEvent({ processingStatus: 'APPLIED' }),
      })),
    };
    const service = createPaymentsService(repository, {
      now: () => new Date('2026-09-23T14:30:00.000Z'),
    });

    const result = await service.applyVerifiedSubscriptionState({
      eventId: 'billing-event-1',
      subscriptionId: 'subscription-1',
      provider: 'stripe',
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-10-23T14:25:00.000Z'),
      providerStateUpdatedAt: new Date('2026-09-23T14:25:00.000Z'),
    });

    expect(result).toMatchObject({
      applied: false,
      duplicate: true,
      stale: false,
    });
  });

  it('returns stale without rolling authoritative subscription state backward', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(),
      applyVerifiedSubscriptionState: vi.fn(async () => ({
        outcome: 'STALE',
        event: storedEvent({ processingStatus: 'IGNORED', failureCode: 'STALE_PROVIDER_STATE' }),
        subscription: {
          id: 'subscription-1',
          provider: 'stripe',
          status: 'ACTIVE',
          providerStateUpdatedAt: new Date('2026-09-23T14:40:00.000Z'),
        },
      })),
    };
    const service = createPaymentsService(repository, {
      now: () => new Date('2026-09-23T14:45:00.000Z'),
    });

    const result = await service.applyVerifiedSubscriptionState({
      eventId: 'billing-event-older',
      subscriptionId: 'subscription-1',
      provider: 'stripe',
      status: 'PAST_DUE',
      providerStateUpdatedAt: new Date('2026-09-23T14:20:00.000Z'),
    });

    expect(result).toMatchObject({
      applied: false,
      duplicate: false,
      stale: true,
      event: { failureCode: 'STALE_PROVIDER_STATE' },
      subscription: { status: 'ACTIVE' },
    });
  });

  it('rejects unsafe active and canceled state before database mutation', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(),
      applyVerifiedSubscriptionState: vi.fn(),
    };
    const service = createPaymentsService(repository, {
      now: () => new Date('2026-09-23T14:30:00.000Z'),
    });
    const stateTime = new Date('2026-09-23T14:25:00.000Z');

    await expect(
      service.applyVerifiedSubscriptionState({
        eventId: 'billing-event-1',
        subscriptionId: 'subscription-1',
        provider: 'stripe',
        status: 'ACTIVE',
        currentPeriodEnd: stateTime,
        providerStateUpdatedAt: stateTime,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    await expect(
      service.applyVerifiedSubscriptionState({
        eventId: 'billing-event-2',
        subscriptionId: 'subscription-1',
        provider: 'stripe',
        status: 'CANCELED',
        providerStateUpdatedAt: stateTime,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    expect(repository.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
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

  it('claims the event and compare-and-swaps newer provider state in one transaction', async () => {
    const stateTime = new Date('2026-09-23T14:25:00.000Z');
    const processedAt = new Date('2026-09-23T14:30:00.000Z');
    const periodEnd = new Date('2026-10-23T14:25:00.000Z');
    const pendingEvent = storedEvent();
    const appliedEvent = storedEvent({
      processingStatus: 'APPLIED',
      processedAt,
      subscriptionId: 'subscription-1',
    });
    const existingSubscription = {
      id: 'subscription-1',
      userId: 'user-1',
      planId: 'plan-pro-monthly',
      status: 'TRIALING',
      provider: 'stripe',
      currentPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
      providerStateUpdatedAt: new Date('2026-09-20T00:00:00.000Z'),
      canceledAt: null,
    };
    const appliedSubscription = {
      ...existingSubscription,
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
      providerStateUpdatedAt: stateTime,
    };

    const billingEventFindUnique = vi
      .fn()
      .mockResolvedValueOnce(pendingEvent)
      .mockResolvedValueOnce(appliedEvent);
    const subscriptionFindUnique = vi
      .fn()
      .mockResolvedValueOnce(existingSubscription)
      .mockResolvedValueOnce(appliedSubscription);
    const billingEventUpdateMany = vi.fn(async () => ({ count: 1 }));
    const subscriptionUpdateMany = vi.fn(async () => ({ count: 1 }));
    const tx = {
      billingEvent: {
        findUnique: billingEventFindUnique,
        updateMany: billingEventUpdateMany,
        update: vi.fn(),
      },
      subscription: {
        findUnique: subscriptionFindUnique,
        updateMany: subscriptionUpdateMany,
      },
    };
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        $transaction: vi.fn(async (callback) => callback(tx)),
      }),
    );

    const result = await repository.applyVerifiedSubscriptionState({
      eventId: 'billing-event-1',
      subscriptionId: 'subscription-1',
      provider: 'stripe',
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd,
      canceledAt: null,
      providerStateUpdatedAt: stateTime,
      processedAt,
    });

    expect(billingEventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'billing-event-1', processingStatus: 'PENDING' },
        data: expect.objectContaining({
          processingStatus: 'APPLIED',
          subscriptionId: 'subscription-1',
          processedAt,
        }),
      }),
    );
    expect(subscriptionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        AND: [
          { OR: [{ provider: null }, { provider: 'stripe' }] },
          {
            OR: [
              { providerStateUpdatedAt: null },
              { providerStateUpdatedAt: { lt: stateTime } },
            ],
          },
        ],
      },
      data: {
        provider: 'stripe',
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
        providerStateUpdatedAt: stateTime,
        canceledAt: null,
      },
    });
    expect(result).toMatchObject({
      outcome: 'APPLIED',
      event: { processingStatus: 'APPLIED' },
      subscription: { status: 'ACTIVE' },
    });
  });

  it('marks an older concurrent provider event ignored instead of overwriting newer state', async () => {
    const staleTime = new Date('2026-09-23T14:20:00.000Z');
    const processedAt = new Date('2026-09-23T14:45:00.000Z');
    const existingSubscription = {
      id: 'subscription-1',
      userId: 'user-1',
      planId: 'plan-pro-monthly',
      status: 'ACTIVE',
      provider: 'stripe',
      currentPeriodEnd: new Date('2026-10-23T00:00:00.000Z'),
      providerStateUpdatedAt: new Date('2026-09-23T14:40:00.000Z'),
      canceledAt: null,
    };
    const ignoredEvent = storedEvent({
      id: 'billing-event-older',
      processingStatus: 'IGNORED',
      processedAt,
      failureCode: 'STALE_PROVIDER_STATE',
      subscriptionId: 'subscription-1',
    });
    const billingEventUpdate = vi.fn(async () => ignoredEvent);
    const tx = {
      billingEvent: {
        findUnique: vi.fn(async () => storedEvent({ id: 'billing-event-older' })),
        updateMany: vi.fn(async () => ({ count: 1 })),
        update: billingEventUpdate,
      },
      subscription: {
        findUnique: vi.fn(async () => existingSubscription),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
    };
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        $transaction: vi.fn(async (callback) => callback(tx)),
      }),
    );

    const result = await repository.applyVerifiedSubscriptionState({
      eventId: 'billing-event-older',
      subscriptionId: 'subscription-1',
      provider: 'stripe',
      status: 'PAST_DUE',
      currentPeriodEnd: null,
      canceledAt: null,
      providerStateUpdatedAt: staleTime,
      processedAt,
    });

    expect(billingEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'billing-event-older' },
        data: {
          processingStatus: 'IGNORED',
          processedAt,
          subscriptionId: 'subscription-1',
          failureCode: 'STALE_PROVIDER_STATE',
        },
      }),
    );
    expect(result).toMatchObject({
      outcome: 'STALE',
      event: {
        processingStatus: 'IGNORED',
        failureCode: 'STALE_PROVIDER_STATE',
      },
      subscription: {
        status: 'ACTIVE',
        providerStateUpdatedAt: existingSubscription.providerStateUpdatedAt,
      },
    });
  })});
