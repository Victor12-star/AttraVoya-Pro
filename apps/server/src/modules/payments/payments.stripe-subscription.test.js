import { describe, expect, it, vi } from 'vitest';

import { NotFoundError, ValidationError } from '../../errors/app-error.js';
import { createStripeSubscriptionEventProcessor } from './payments.stripe-subscription.js';

const OCCURRED_AT = new Date('2026-09-23T17:00:00.000Z');
const PERIOD_END = new Date('2026-10-23T17:00:00.000Z');

function rawStripeEvent({
  id = 'evt_123',
  type = 'customer.subscription.updated',
  created = Math.floor(OCCURRED_AT.getTime() / 1000),
  subscription = {},
} = {}) {
  return Buffer.from(
    JSON.stringify({
      id,
      type,
      created,
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          current_period_end: Math.floor(PERIOD_END.getTime() / 1000),
          canceled_at: null,
          ...subscription,
        },
      },
    }),
  );
}

function evidence(overrides = {}) {
  return Object.freeze({
    provider: 'stripe',
    externalEventId: 'evt_123',
    eventType: 'customer.subscription.updated',
    payloadHash: 'a'.repeat(64),
    occurredAt: OCCURRED_AT,
    verifiedAt: new Date('2026-09-23T17:00:02.000Z'),
    ...overrides,
  });
}

function dependencies(overrides = {}) {
  const verificationBoundary = {
    verifyEvent: vi.fn(async () => evidence()),
  };
  const paymentsService = {
    recordVerifiedEvent: vi.fn(async () => ({
      event: { id: 'billing-event-1', processingStatus: 'PENDING' },
      duplicate: false,
    })),
    finalizeVerifiedEvent: vi.fn(async ({ outcome, failureCode = null }) => ({
      event: {
        id: 'billing-event-1',
        processingStatus: outcome,
        failureCode,
      },
      duplicate: false,
    })),
    resolveProviderSubscription: vi.fn(async () => ({ id: 'subscription-1' })),
    applyVerifiedSubscriptionState: vi.fn(async () => ({
      applied: true,
      duplicate: false,
      stale: false,
      event: { id: 'billing-event-1', processingStatus: 'APPLIED' },
      subscription: { id: 'subscription-1', status: 'ACTIVE' },
    })),
  };

  return {
    verificationBoundary: {
      ...verificationBoundary,
      ...(overrides.verificationBoundary ?? {}),
    },
    paymentsService: {
      ...paymentsService,
      ...(overrides.paymentsService ?? {}),
    },
  };
}

describe('internal Stripe subscription event processor', () => {
  it('verifies exact provider evidence before resolving or mutating subscription state', async () => {
    const deps = dependencies();
    const processor = createStripeSubscriptionEventProcessor(deps);
    const rawPayload = rawStripeEvent();

    const result = await processor.process({
      rawPayload,
      headers: { 'stripe-signature': 'verified-upstream' },
    });

    expect(deps.verificationBoundary.verifyEvent).toHaveBeenCalledWith({
      rawPayload,
      headers: { 'stripe-signature': 'verified-upstream' },
    });
    expect(deps.paymentsService.recordVerifiedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'stripe',
        externalEventId: 'evt_123',
      }),
    );
    expect(deps.paymentsService.resolveProviderSubscription).toHaveBeenCalledWith({
      provider: 'stripe',
      externalSubscriptionId: 'sub_123',
    });
    expect(deps.paymentsService.applyVerifiedSubscriptionState).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      subscriptionId: 'subscription-1',
      provider: 'stripe',
      status: 'ACTIVE',
      currentPeriodEnd: PERIOD_END,
      canceledAt: null,
      providerStateUpdatedAt: OCCURRED_AT,
    });
    expect(result).toMatchObject({
      outcome: 'APPLIED',
      duplicate: false,
      subscription: { id: 'subscription-1', status: 'ACTIVE' },
    });
  });

  it('does not persist or process anything when Stripe verification fails', async () => {
    const verificationError = new ValidationError('Stripe signature verification failed.');
    const deps = dependencies({
      verificationBoundary: {
        verifyEvent: vi.fn(async () => {
          throw verificationError;
        }),
      },
    });
    const processor = createStripeSubscriptionEventProcessor(deps);

    await expect(processor.process({ rawPayload: rawStripeEvent() })).rejects.toBe(
      verificationError,
    );

    expect(deps.paymentsService.recordVerifiedEvent).not.toHaveBeenCalled();
    expect(deps.paymentsService.resolveProviderSubscription).not.toHaveBeenCalled();
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('rejects a post-verification payload identity mismatch before subscription lookup', async () => {
    const deps = dependencies({
      verificationBoundary: {
        verifyEvent: vi.fn(async () => evidence({ externalEventId: 'evt_verified' })),
      },
    });
    const processor = createStripeSubscriptionEventProcessor(deps);

    await expect(
      processor.process({
        rawPayload: rawStripeEvent({ id: 'evt_payload' }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'FAILED',
      failureCode: 'STRIPE_SUBSCRIPTION_STATE_INVALID',
    });
    expect(deps.paymentsService.resolveProviderSubscription).not.toHaveBeenCalled();
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('records and ignores authenticated Stripe events outside the subscription lifecycle', async () => {
    const deps = dependencies({
      verificationBoundary: {
        verifyEvent: vi.fn(async () =>
          evidence({
            eventType: 'invoice.paid',
          }),
        ),
      },
    });
    const processor = createStripeSubscriptionEventProcessor(deps);

    const result = await processor.process({
      rawPayload: rawStripeEvent({ type: 'invoice.paid' }),
    });

    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'IGNORED',
    });
    expect(deps.paymentsService.resolveProviderSubscription).not.toHaveBeenCalled();
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
    expect(result).toMatchObject({ outcome: 'IGNORED', subscription: null });
  });

  it('fails closed when a verified provider subscription identity is unknown', async () => {
    const deps = dependencies({
      paymentsService: {
        resolveProviderSubscription: vi.fn(async () => {
          throw new NotFoundError('Provider subscription was not found.');
        }),
      },
    });
    const processor = createStripeSubscriptionEventProcessor(deps);

    const result = await processor.process({ rawPayload: rawStripeEvent() });

    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'FAILED',
      failureCode: 'SUBSCRIPTION_IDENTITY_NOT_FOUND',
    });
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      outcome: 'FAILED',
      failureCode: 'SUBSCRIPTION_IDENTITY_NOT_FOUND',
      subscription: null,
    });
  });

  it('terminalizes malformed authenticated subscription state before mutation', async () => {
    const deps = dependencies();
    const processor = createStripeSubscriptionEventProcessor(deps);

    await expect(
      processor.process({
        rawPayload: rawStripeEvent({
          subscription: { status: 'future_unknown_status' },
        }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'FAILED',
      failureCode: 'STRIPE_SUBSCRIPTION_STATE_INVALID',
    });
    expect(deps.paymentsService.resolveProviderSubscription).not.toHaveBeenCalled();
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('maps a verified canceled Stripe subscription without inventing cancellation time', async () => {
    const canceledAt = new Date('2026-09-23T16:55:00.000Z');
    const deps = dependencies({
      verificationBoundary: {
        verifyEvent: vi.fn(async () =>
          evidence({
            eventType: 'customer.subscription.deleted',
          }),
        ),
      },
    });
    const processor = createStripeSubscriptionEventProcessor(deps);

    await processor.process({
      rawPayload: rawStripeEvent({
        type: 'customer.subscription.deleted',
        subscription: {
          status: 'canceled',
          current_period_end: null,
          canceled_at: Math.floor(canceledAt.getTime() / 1000),
        },
      }),
    });

    expect(deps.paymentsService.applyVerifiedSubscriptionState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'CANCELED',
        currentPeriodEnd: null,
        canceledAt,
        providerStateUpdatedAt: OCCURRED_AT,
      }),
    );
  });
});
