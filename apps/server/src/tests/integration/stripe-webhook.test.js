import { createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.API_HOST = '127.0.0.1';
process.env.API_PORT = '5000';
process.env.LOG_LEVEL = 'silent';
process.env.WEB_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.API_URL = 'http://localhost:5000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
process.env.COOKIE_SECRET = 'c'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);

const { buildApp } = await import('../../app.js');
const { DEFAULT_BODY_LIMIT_BYTES } = await import('../../config/constants.js');

const apps = [];

afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

async function webhookApp(process) {
  const app = await buildApp({
    logger: false,
    stripeWebhookEnabled: true,
    stripeWebhookProcessor: { process },
  });
  apps.push(app);
  return app;
}

describe('Stripe webhook ingress', () => {
  it('does not expose a Stripe webhook route while the feature is disabled', async () => {
    const app = await buildApp({
      logger: false,
      stripeWebhookEnabled: false,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/stripe',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    });

    expect(response.statusCode).toBe(404);
  });

  it('passes the exact raw JSON bytes and request headers into the verified processor', async () => {
    const process = vi.fn(async (/** @type {any} */ _input) => ({
      outcome: 'APPLIED',
      subscription: { id: 'must-not-leak' },
    }));
    const app = await webhookApp(process);
    const rawPayload = '{ "id": "evt_123", "type": "customer.subscription.updated" }';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/stripe',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=123,v1=signature-placeholder',
      },
      payload: rawPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
    expect(process).toHaveBeenCalledTimes(1);

    const input = process.mock.calls[0][0];
    expect(Buffer.isBuffer(input.rawPayload)).toBe(true);
    expect(input.rawPayload.equals(Buffer.from(rawPayload))).toBe(true);
    expect(input.headers['stripe-signature']).toBe('t=123,v1=signature-placeholder');
    expect(JSON.stringify(response.json())).not.toContain('must-not-leak');
  });

  it('verifies a real Stripe signature before recording or mutating subscription state', async () => {
    const webhookSecret = 'whsec_test_secret_1234567890';
    const now = new Date('2026-09-23T17:45:00.000Z');
    const timestamp = Math.floor(now.getTime() / 1000);
    const rawPayload = JSON.stringify({
      id: 'evt_signed_123',
      type: 'customer.subscription.updated',
      created: timestamp,
      data: {
        object: {
          id: 'sub_provider_123',
          status: 'active',
          current_period_end: timestamp + 30 * 24 * 60 * 60,
          canceled_at: null,
        },
      },
    });
    const signature = createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${rawPayload}`)
      .digest('hex');

    const paymentsService = {
      recordVerifiedEvent: vi.fn(async () => ({
        event: { id: 'billing-event-1' },
        duplicate: false,
      })),
      finalizeVerifiedEvent: vi.fn(),
      resolveProviderSubscription: vi.fn(async () => ({
        id: 'subscription-1',
      })),
      applyVerifiedSubscriptionState: vi.fn(async () => ({
        applied: true,
        duplicate: false,
        stale: false,
        event: { id: 'billing-event-1', processingStatus: 'APPLIED' },
        subscription: { id: 'subscription-1', status: 'ACTIVE' },
      })),
    };
    const app = await buildApp({
      logger: false,
      stripeWebhookEnabled: true,
      stripeWebhookSecret: webhookSecret,
      stripeWebhookNow: () => now,
      paymentsService,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/stripe',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': `t=${timestamp},v1=${signature}`,
      },
      payload: rawPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
    expect(paymentsService.recordVerifiedEvent).toHaveBeenCalledTimes(1);
    expect(paymentsService.resolveProviderSubscription).toHaveBeenCalledWith({
      provider: 'stripe',
      externalSubscriptionId: 'sub_provider_123',
    });
    expect(paymentsService.applyVerifiedSubscriptionState).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'billing-event-1',
        subscriptionId: 'subscription-1',
        provider: 'stripe',
        status: 'ACTIVE',
      }),
    );
  });

  it('rejects an invalid Stripe signature before billing evidence is recorded', async () => {
    const now = new Date('2026-09-23T17:45:00.000Z');
    const timestamp = Math.floor(now.getTime() / 1000);
    const paymentsService = {
      recordVerifiedEvent: vi.fn(),
      finalizeVerifiedEvent: vi.fn(),
      resolveProviderSubscription: vi.fn(),
      applyVerifiedSubscriptionState: vi.fn(),
    };
    const app = await buildApp({
      logger: false,
      stripeWebhookEnabled: true,
      stripeWebhookSecret: 'whsec_test_secret_1234567890',
      stripeWebhookNow: () => now,
      paymentsService,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/stripe',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': `t=${timestamp},v1=${'0'.repeat(64)}`,
      },
      payload: JSON.stringify({
        id: 'evt_invalid_signature',
        type: 'customer.subscription.updated',
        created: timestamp,
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(paymentsService.recordVerifiedEvent).not.toHaveBeenCalled();
    expect(paymentsService.resolveProviderSubscription).not.toHaveBeenCalled();
    expect(paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('keeps ordinary parent-scope JSON parsing unchanged when webhook ingress is enabled', async () => {
    const app = await webhookApp(vi.fn());
    app.post('/test-json-parent', async (request) => {
      const body = /** @type {any} */ (request.body);
      return {
        isBuffer: Buffer.isBuffer(body),
        value: body?.value,
      };
    });

    const response = await app.inject({
      method: 'POST',
      url: '/test-json-parent',
      payload: { value: 'still-json' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      isBuffer: false,
      value: 'still-json',
    });
  });

  it('rejects oversized webhook payloads before the processor can run', async () => {
    const process = vi.fn();
    const app = await webhookApp(process);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/stripe',
      headers: { 'content-type': 'application/json' },
      payload: 'x'.repeat(DEFAULT_BODY_LIMIT_BYTES + 1),
    });

    expect(response.statusCode).toBe(413);
    expect(response.json().error.code).toBe('REQUEST_TOO_LARGE');
    expect(process).not.toHaveBeenCalled();
  });

  it('returns a retryable server error when internal processing fails unexpectedly', async () => {
    const process = vi.fn(async () => {
      throw new Error('database unavailable');
    });
    const app = await webhookApp(process);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/stripe',
      headers: { 'content-type': 'application/json' },
      payload: '{"id":"evt_retry"}',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
  });
});
