import { describe, expect, it, vi } from 'vitest';

import { createStripeWebhookEventProcessor } from './payments.stripe-webhook.js';

function evidence(eventType) {
  return Object.freeze({
    provider: 'stripe',
    externalEventId: 'evt_verified',
    eventType,
    payloadHash: 'a'.repeat(64),
    occurredAt: new Date('2026-09-24T10:00:00.000Z'),
    verifiedAt: new Date('2026-09-24T10:00:01.000Z'),
  });
}

function dependencies(eventType) {
  const verified = evidence(eventType);
  return {
    verificationBoundary: {
      verifyEvent: vi.fn(async () => verified),
    },
    subscriptionProcessor: {
      processVerified: vi.fn(async () => ({ outcome: 'SUBSCRIPTION' })),
    },
    checkoutCompletionProcessor: {
      processVerified: vi.fn(async () => ({ outcome: 'CHECKOUT' })),
    },
    verified,
  };
}

describe('verified Stripe webhook dispatcher', () => {
  it('dispatches checkout completion only from verifier-minted event type', async () => {
    const deps = dependencies('checkout.session.completed');
    const processor = createStripeWebhookEventProcessor(deps);
    const rawPayload = Buffer.from(
      JSON.stringify({
        id: 'evt_untrusted_payload',
        type: 'customer.subscription.updated',
      }),
    );

    const result = await processor.process({
      rawPayload,
      headers: { 'stripe-signature': 'verified-upstream' },
    });

    expect(deps.verificationBoundary.verifyEvent).toHaveBeenCalledWith({
      rawPayload,
      headers: { 'stripe-signature': 'verified-upstream' },
    });
    expect(deps.checkoutCompletionProcessor.processVerified).toHaveBeenCalledWith({
      rawPayload,
      evidence: deps.verified,
    });
    expect(deps.subscriptionProcessor.processVerified).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: 'CHECKOUT' });
  });

  it('dispatches subscription lifecycle evidence to the subscription processor', async () => {
    const deps = dependencies('customer.subscription.created');
    const processor = createStripeWebhookEventProcessor(deps);
    const rawPayload = Buffer.from('{}');

    const result = await processor.process({ rawPayload });

    expect(deps.subscriptionProcessor.processVerified).toHaveBeenCalledWith({
      rawPayload,
      evidence: deps.verified,
    });
    expect(deps.checkoutCompletionProcessor.processVerified).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: 'SUBSCRIPTION' });
  });

  it('sends other authenticated Stripe event types through the existing ignore path', async () => {
    const deps = dependencies('invoice.paid');
    const processor = createStripeWebhookEventProcessor(deps);
    const rawPayload = Buffer.from('{}');

    await processor.process({ rawPayload });

    expect(deps.subscriptionProcessor.processVerified).toHaveBeenCalledWith({
      rawPayload,
      evidence: deps.verified,
    });
    expect(deps.checkoutCompletionProcessor.processVerified).not.toHaveBeenCalled();
  });

  it('does not dispatch anything when provider verification fails', async () => {
    const verificationError = new Error('invalid signature');
    const deps = dependencies('checkout.session.completed');
    deps.verificationBoundary.verifyEvent = vi.fn(async () => {
      throw verificationError;
    });
    const processor = createStripeWebhookEventProcessor(deps);

    await expect(processor.process({ rawPayload: Buffer.from('{}') })).rejects.toBe(
      verificationError,
    );

    expect(deps.subscriptionProcessor.processVerified).not.toHaveBeenCalled();
    expect(deps.checkoutCompletionProcessor.processVerified).not.toHaveBeenCalled();
  });
});
