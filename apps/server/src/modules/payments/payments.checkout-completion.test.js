import { describe, expect, it, vi } from 'vitest';

import { createPaymentsRepository } from './payments.repository.js';
import { createPaymentsService } from './payments.service.js';

const PROCESSED_AT = new Date('2026-09-23T21:00:00.000Z');

function pendingEvent(overrides = {}) {
  return {
    id: 'billing-event-1',
    provider: 'stripe',
    externalEventId: 'evt_checkout_1',
    eventType: 'checkout.session.completed',
    payloadHash: 'a'.repeat(64),
    processingStatus: 'PENDING',
    occurredAt: new Date('2026-09-23T20:59:00.000Z'),
    verifiedAt: new Date('2026-09-23T20:59:01.000Z'),
    receivedAt: new Date('2026-09-23T20:59:02.000Z'),
    processedAt: null,
    failureCode: null,
    subscriptionId: null,
    ...overrides,
  };
}

function checkoutAttempt(overrides = {}) {
  return {
    id: 'attempt-1',
    userId: 'user-1',
    provider: 'stripe',
    status: 'SESSION_CREATED',
    activeUserKey: 'user-1',
    externalCheckoutSessionId: 'cs_test_123',
    createdAt: new Date('2026-09-23T20:30:00.000Z'),
    updatedAt: new Date('2026-09-23T20:31:00.000Z'),
    expiresAt: new Date('2026-09-23T21:00:00.000Z'),
    plan: {
      id: 'plan-pro-monthly',
      key: 'PRO_MONTHLY',
      isActive: true,
    },
    ...overrides,
  };
}

function pendingSubscription(overrides = {}) {
  return {
    id: 'subscription-1',
    userId: 'user-1',
    planId: 'plan-pro-monthly',
    status: 'PENDING',
    provider: 'stripe',
    externalCustomerId: null,
    externalSubscriptionId: 'sub_123',
    currentPeriodEnd: null,
    providerStateUpdatedAt: null,
    canceledAt: null,
    ...overrides,
  };
}

describe('verified checkout completion service', () => {
  it('normalizes trusted provider identities and returns pending ownership', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(),
      finalizePendingEvent: vi.fn(),
      applyVerifiedCheckoutCompletion: vi.fn(async (input) => ({
        outcome: 'APPLIED',
        event: pendingEvent({
          processingStatus: 'APPLIED',
          processedAt: input.processedAt,
          subscriptionId: 'subscription-1',
        }),
        subscription: pendingSubscription({
          provider: input.provider,
          externalSubscriptionId: input.externalSubscriptionId,
        }),
      })),
    };
    const service = createPaymentsService(repository, { now: () => PROCESSED_AT });

    const result = await service.applyVerifiedCheckoutCompletion({
      eventId: ' billing-event-1 ',
      provider: ' Stripe ',
      externalCheckoutSessionId: ' cs_test_123 ',
      externalSubscriptionId: ' sub_123 ',
    });

    expect(repository.applyVerifiedCheckoutCompletion).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      provider: 'stripe',
      externalCheckoutSessionId: 'cs_test_123',
      externalSubscriptionId: 'sub_123',
      processedAt: PROCESSED_AT,
    });
    expect(result).toMatchObject({
      applied: true,
      duplicate: false,
      subscription: {
        status: 'PENDING',
        externalSubscriptionId: 'sub_123',
      },
    });
  });

  it('rejects non-Stripe checkout and subscription identities before persistence', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(),
      finalizePendingEvent: vi.fn(),
      applyVerifiedCheckoutCompletion: vi.fn(),
    };
    const service = createPaymentsService(repository, { now: () => PROCESSED_AT });

    await expect(
      service.applyVerifiedCheckoutCompletion({
        eventId: 'billing-event-1',
        provider: 'stripe',
        externalCheckoutSessionId: 'not-a-session',
        externalSubscriptionId: 'sub_123',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    await expect(
      service.applyVerifiedCheckoutCompletion({
        eventId: 'billing-event-1',
        provider: 'stripe',
        externalCheckoutSessionId: 'cs_test_123',
        externalSubscriptionId: 'not-a-subscription',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    expect(repository.applyVerifiedCheckoutCompletion).not.toHaveBeenCalled();
  });

  it('treats a previously processed verified event as an idempotent duplicate', async () => {
    const repository = {
      recordVerifiedEvent: vi.fn(),
      finalizePendingEvent: vi.fn(),
      applyVerifiedCheckoutCompletion: vi.fn(async () => ({
        outcome: 'ALREADY_PROCESSED',
        event: pendingEvent({ processingStatus: 'APPLIED' }),
      })),
    };
    const service = createPaymentsService(repository, { now: () => PROCESSED_AT });

    const result = await service.applyVerifiedCheckoutCompletion({
      eventId: 'billing-event-1',
      provider: 'stripe',
      externalCheckoutSessionId: 'cs_test_123',
      externalSubscriptionId: 'sub_123',
    });

    expect(result).toMatchObject({
      applied: false,
      duplicate: true,
      subscription: null,
    });
  });
});

describe('verified checkout completion repository', () => {
  it('atomically creates a non-entitling pending subscription and closes the attempt', async () => {
    const eventFindUnique = vi.fn().mockResolvedValue(pendingEvent());
    const eventUpdateMany = vi.fn(async () => ({ count: 1 }));
    const appliedEvent = pendingEvent({
      processingStatus: 'APPLIED',
      processedAt: PROCESSED_AT,
      subscriptionId: 'subscription-1',
    });
    const eventUpdate = vi.fn(async () => appliedEvent);
    const attemptFindUnique = vi.fn(async () => checkoutAttempt());
    const attemptUpdateMany = vi.fn(async () => ({ count: 1 }));
    const subscriptionFindUnique = vi.fn(async () => null);
    const subscriptionCreate = vi.fn(async () => pendingSubscription());

    const tx = {
      billingEvent: {
        findUnique: eventFindUnique,
        updateMany: eventUpdateMany,
        update: eventUpdate,
      },
      checkoutAttempt: {
        findUnique: attemptFindUnique,
        updateMany: attemptUpdateMany,
      },
      subscription: {
        findUnique: subscriptionFindUnique,
        create: subscriptionCreate,
      },
    };
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        $transaction: vi.fn(async (callback) => callback(tx)),
      }),
    );

    const result = await repository.applyVerifiedCheckoutCompletion({
      eventId: 'billing-event-1',
      provider: 'stripe',
      externalCheckoutSessionId: 'cs_test_123',
      externalSubscriptionId: 'sub_123',
      processedAt: PROCESSED_AT,
    });

    expect(subscriptionCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        planId: 'plan-pro-monthly',
        status: 'PENDING',
        provider: 'stripe',
        externalSubscriptionId: 'sub_123',
      },
      select: expect.any(Object),
    });
    expect(attemptUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'attempt-1',
        userId: 'user-1',
        provider: 'stripe',
        status: 'SESSION_CREATED',
        activeUserKey: 'user-1',
        externalCheckoutSessionId: 'cs_test_123',
      },
      data: {
        status: 'COMPLETED',
        activeUserKey: null,
      },
    });
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: 'billing-event-1' },
      data: { subscriptionId: 'subscription-1' },
      select: expect.any(Object),
    });
    expect(result).toMatchObject({
      outcome: 'APPLIED',
      event: { processingStatus: 'APPLIED', subscriptionId: 'subscription-1' },
      subscription: {
        status: 'PENDING',
        userId: 'user-1',
        planId: 'plan-pro-monthly',
      },
    });
  });

  it('fails before event mutation when the Stripe Checkout Session has no owned attempt', async () => {
    const eventUpdateMany = vi.fn();
    const tx = {
      billingEvent: {
        findUnique: vi.fn(async () => pendingEvent()),
        updateMany: eventUpdateMany,
      },
      checkoutAttempt: {
        findUnique: vi.fn(async () => null),
      },
      subscription: {
        findUnique: vi.fn(),
      },
    };
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        $transaction: vi.fn(async (callback) => callback(tx)),
      }),
    );

    const result = await repository.applyVerifiedCheckoutCompletion({
      eventId: 'billing-event-1',
      provider: 'stripe',
      externalCheckoutSessionId: 'cs_unknown',
      externalSubscriptionId: 'sub_123',
      processedAt: PROCESSED_AT,
    });

    expect(result.outcome).toBe('CHECKOUT_ATTEMPT_NOT_FOUND');
    expect(eventUpdateMany).not.toHaveBeenCalled();
  });

  it('fails closed when the provider subscription identity belongs to different ownership', async () => {
    const eventUpdateMany = vi.fn();
    const tx = {
      billingEvent: {
        findUnique: vi.fn(async () => pendingEvent()),
        updateMany: eventUpdateMany,
      },
      checkoutAttempt: {
        findUnique: vi.fn(async () => checkoutAttempt()),
      },
      subscription: {
        findUnique: vi.fn(async () =>
          pendingSubscription({
            userId: 'other-user',
            planId: 'other-plan',
          }),
        ),
      },
    };
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        $transaction: vi.fn(async (callback) => callback(tx)),
      }),
    );

    const result = await repository.applyVerifiedCheckoutCompletion({
      eventId: 'billing-event-1',
      provider: 'stripe',
      externalCheckoutSessionId: 'cs_test_123',
      externalSubscriptionId: 'sub_123',
      processedAt: PROCESSED_AT,
    });

    expect(result.outcome).toBe('PROVIDER_IDENTITY_CONFLICT');
    expect(eventUpdateMany).not.toHaveBeenCalled();
  });
});
