import { describe, expect, it, vi } from 'vitest';

import { createStripeCheckoutCompletionProcessor } from './payments.stripe-checkout-completion.js';

function stripePayload(overrides = {}) {
  return Buffer.from(
    JSON.stringify({
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          mode: 'subscription',
          subscription: 'sub_123',
          ...overrides,
        },
      },
    }),
  );
}

function evidence(overrides = {}) {
  return {
    provider: 'stripe',
    externalEventId: 'evt_checkout_1',
    eventType: 'checkout.session.completed',
    payloadHash: 'a'.repeat(64),
    occurredAt: new Date('2026-09-23T20:50:00.000Z'),
    verifiedAt: new Date('2026-09-23T20:50:01.000Z'),
    ...overrides,
  };
}

function dependencies(overrides = {}) {
  const verified = evidence();
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
    applyVerifiedCheckoutCompletion: vi.fn(async () => ({
      applied: true,
      duplicate: false,
      event: {
        id: 'billing-event-1',
        processingStatus: 'APPLIED',
        subscriptionId: 'subscription-1',
      },
      subscription: {
        id: 'subscription-1',
        status: 'PENDING',
        provider: 'stripe',
        externalSubscriptionId: 'sub_123',
      },
    })),
    ...overrides.paymentsService,
  };

  return {
    verificationBoundary: {
      verifyEvent: vi.fn(async () => verified),
      ...overrides.verificationBoundary,
    },
    paymentsService,
  };
}

describe('Stripe checkout completion processor', () => {
  it('creates only pending internal ownership after exact verified checkout completion', async () => {
    const deps = dependencies();
    const processor = createStripeCheckoutCompletionProcessor(deps);
    const payload = stripePayload();

    const result = await processor.process({
      rawPayload: payload,
      headers: { 'stripe-signature': 'verified-upstream' },
    });

    expect(deps.verificationBoundary.verifyEvent).toHaveBeenCalledWith({
      rawPayload: payload,
      headers: { 'stripe-signature': 'verified-upstream' },
    });
    expect(deps.paymentsService.recordVerifiedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        externalEventId: 'evt_checkout_1',
        eventType: 'checkout.session.completed',
      }),
    );
    expect(deps.paymentsService.applyVerifiedCheckoutCompletion).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      provider: 'stripe',
      externalCheckoutSessionId: 'cs_test_123',
      externalSubscriptionId: 'sub_123',
    });
    expect(result).toMatchObject({
      outcome: 'APPLIED',
      duplicate: false,
      subscription: {
        id: 'subscription-1',
        status: 'PENDING',
      },
    });
  });

  it('ignores authenticated Stripe events outside checkout completion', async () => {
    const deps = dependencies({
      verificationBoundary: {
        verifyEvent: vi.fn(async () =>
          evidence({
            externalEventId: 'evt_other',
            eventType: 'invoice.paid',
          }),
        ),
      },
    });
    const processor = createStripeCheckoutCompletionProcessor(deps);

    const result = await processor.process({
      rawPayload: Buffer.from(
        JSON.stringify({
          id: 'evt_other',
          type: 'invoice.paid',
          data: { object: { id: 'in_123' } },
        }),
      ),
    });

    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'IGNORED',
    });
    expect(deps.paymentsService.applyVerifiedCheckoutCompletion).not.toHaveBeenCalled();
    expect(result.outcome).toBe('IGNORED');
  });

  it('does not terminalize a verified event when payload identity mismatches evidence', async () => {
    const deps = dependencies();
    const processor = createStripeCheckoutCompletionProcessor(deps);

    await expect(
      processor.process({
        rawPayload: Buffer.from(
          JSON.stringify({
            id: 'evt_different',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                mode: 'subscription',
                subscription: 'sub_123',
              },
            },
          }),
        ),
      }),
    ).rejects.toThrow('Stripe verified event identity does not match payload.');

    expect(deps.paymentsService.finalizeVerifiedEvent).not.toHaveBeenCalled();
    expect(deps.paymentsService.applyVerifiedCheckoutCompletion).not.toHaveBeenCalled();
  });

  it('terminalizes malformed authenticated checkout state with a privacy-safe code', async () => {
    const deps = dependencies();
    const processor = createStripeCheckoutCompletionProcessor(deps);

    const result = await processor.process({
      rawPayload: stripePayload({ subscription: null }),
    });

    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'FAILED',
      failureCode: 'STRIPE_CHECKOUT_COMPLETION_INVALID',
    });
    expect(deps.paymentsService.applyVerifiedCheckoutCompletion).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      outcome: 'FAILED',
      failureCode: 'STRIPE_CHECKOUT_COMPLETION_INVALID',
      subscription: null,
    });
  });

  it('terminalizes a verified completion that has no server-owned checkout attempt', async () => {
    const notFound = Object.assign(new Error('missing checkout attempt'), { code: 'NOT_FOUND' });
    const deps = dependencies({
      paymentsService: {
        applyVerifiedCheckoutCompletion: vi.fn(async () => {
          throw notFound;
        }),
      },
    });
    const processor = createStripeCheckoutCompletionProcessor(deps);

    const result = await processor.process({ rawPayload: stripePayload() });

    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'FAILED',
      failureCode: 'CHECKOUT_ATTEMPT_NOT_FOUND',
    });
    expect(result).toMatchObject({
      outcome: 'FAILED',
      failureCode: 'CHECKOUT_ATTEMPT_NOT_FOUND',
    });
  });
});
