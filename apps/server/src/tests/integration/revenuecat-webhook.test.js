import { createHmac } from 'node:crypto';

import { PLANS } from '@attravoya/constants';
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
const OWNED_ID = 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const productIds = {
  [PLANS.PRO_MONTHLY]: 'attravoya_pro_v1:monthly-autorenewing',
  [PLANS.PRO_YEARLY]: 'attravoya_pro_v1:yearly-autorenewing',
};

afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

async function webhookApp(process) {
  const app = await buildApp({
    logger: false,
    revenueCatWebhookEnabled: true,
    revenueCatWebhookProcessor: { process },
  });
  apps.push(app);
  return app;
}

function signedPayload({ secret, now, overrides = {} }) {
  const timestamp = Math.floor(now.getTime() / 1000);
  const event = {
    id: 'evt_rc_ingress_1',
    type: 'INITIAL_PURCHASE',
    event_timestamp_ms: now.getTime(),
    product_id: productIds[PLANS.PRO_MONTHLY],
    period_type: 'NORMAL',
    purchased_at_ms: now.getTime() - 60_000,
    expiration_at_ms: now.getTime() + 30 * 24 * 60 * 60 * 1000,
    environment: 'PRODUCTION',
    original_transaction_id: 'GPA.1111-2222-3333-44444',
    store: 'PLAY_STORE',
    app_user_id: OWNED_ID,
    original_app_user_id: OWNED_ID,
    aliases: [OWNED_ID],
    ...overrides,
  };
  const rawPayload = JSON.stringify({ api_version: '1.0', event });
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${rawPayload}`)
    .digest('hex');

  return {
    rawPayload,
    signatureHeader: `t=${timestamp},v1=${signature}`,
  };
}

describe('RevenueCat webhook ingress', () => {
  it('does not expose the RevenueCat webhook route while disabled', async () => {
    const app = await buildApp({
      logger: false,
      revenueCatWebhookEnabled: false,
      stripeWebhookEnabled: false,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/revenuecat',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    });

    expect(response.statusCode).toBe(404);
  });

  it('passes exact raw JSON bytes and headers to an injected verified processor', async () => {
    const process = vi.fn(async () => ({
      outcome: 'APPLIED',
      subscription: { id: 'must-not-leak' },
    }));
    const app = await webhookApp(process);
    const rawPayload = '{ "api_version": "1.0", "event": { "id": "evt_1" } }';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/revenuecat',
      headers: {
        'content-type': 'application/json',
        'x-revenuecat-webhook-signature': 't=123,v1=signature-placeholder',
      },
      payload: rawPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
    expect(process).toHaveBeenCalledTimes(1);

    expect(process).toHaveBeenCalledWith({
      rawPayload: Buffer.from(rawPayload),
      headers: expect.objectContaining({
        'x-revenuecat-webhook-signature': 't=123,v1=signature-placeholder',
      }),
    });
    expect(JSON.stringify(response.json())).not.toContain('must-not-leak');
  });

  it('verifies a real RevenueCat HMAC before applying subscription state', async () => {
    const webhookSigningSecret = 'revenuecat_signing_secret_for_test_1234567890';
    const now = new Date('2026-09-25T13:30:00.000Z');
    const { rawPayload, signatureHeader } = signedPayload({
      secret: webhookSigningSecret,
      now,
    });

    const subscription = {
      id: 'subscription-rc-1',
      userId: 'user-1',
      status: 'PENDING',
      provider: 'revenuecat',
      externalSubscriptionId: 'GPA.1111-2222-3333-44444',
    };
    const paymentsService = {
      recordVerifiedEvent: vi.fn(async () => ({
        event: { id: 'billing-event-rc-1', processingStatus: 'PENDING' },
        duplicate: false,
      })),
      finalizeVerifiedEvent: vi.fn(),
      applyVerifiedSubscriptionState: vi.fn(async () => ({
        applied: true,
        duplicate: false,
        stale: false,
        event: { id: 'billing-event-rc-1', processingStatus: 'APPLIED' },
        subscription: { ...subscription, status: 'ACTIVE' },
      })),
    };
    const paymentsRepository = {
      createOrReuseProviderSubscriptionOwnership: vi.fn(async () => ({
        outcome: 'EXISTING',
        subscription,
        created: false,
      })),
    };
    const subscriberIdentityService = {
      resolveOwnedUser: vi.fn(async ({ appUserId }) => ({
        userId: 'user-1',
        appUserId,
      })),
    };
    const app = await buildApp({
      logger: false,
      stripeWebhookEnabled: false,
      revenueCatWebhookEnabled: true,
      revenueCatWebhookSigningSecret: webhookSigningSecret,
      revenueCatWebhookNow: () => now,
      revenueCatAndroidProductIds: productIds,
      revenueCatSubscriberIdentityService: subscriberIdentityService,
      paymentsRepository,
      paymentsService,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/revenuecat',
      headers: {
        'content-type': 'application/json',
        'x-revenuecat-webhook-signature': signatureHeader,
      },
      payload: rawPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
    expect(paymentsService.recordVerifiedEvent).toHaveBeenCalledTimes(1);
    expect(subscriberIdentityService.resolveOwnedUser).toHaveBeenCalledWith({
      appUserId: OWNED_ID,
    });
    expect(paymentsRepository.createOrReuseProviderSubscriptionOwnership).toHaveBeenCalledWith({
      userId: 'user-1',
      planKey: PLANS.PRO_MONTHLY,
      provider: 'revenuecat',
      externalSubscriptionId: 'GPA.1111-2222-3333-44444',
    });
    expect(paymentsService.applyVerifiedSubscriptionState).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'billing-event-rc-1',
        subscriptionId: 'subscription-rc-1',
        provider: 'revenuecat',
        status: 'ACTIVE',
      }),
    );
  });

  it('rejects an invalid RevenueCat HMAC before billing evidence is recorded', async () => {
    const webhookSigningSecret = 'revenuecat_signing_secret_for_test_1234567890';
    const now = new Date('2026-09-25T13:30:00.000Z');
    const { rawPayload } = signedPayload({
      secret: webhookSigningSecret,
      now,
    });
    const timestamp = Math.floor(now.getTime() / 1000);
    const paymentsService = {
      recordVerifiedEvent: vi.fn(),
      finalizeVerifiedEvent: vi.fn(),
      applyVerifiedSubscriptionState: vi.fn(),
    };
    const app = await buildApp({
      logger: false,
      stripeWebhookEnabled: false,
      revenueCatWebhookEnabled: true,
      revenueCatWebhookSigningSecret: webhookSigningSecret,
      revenueCatWebhookNow: () => now,
      revenueCatAndroidProductIds: productIds,
      revenueCatSubscriberIdentityService: {
        resolveOwnedUser: vi.fn(),
      },
      paymentsRepository: {
        createOrReuseProviderSubscriptionOwnership: vi.fn(),
      },
      paymentsService,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/revenuecat',
      headers: {
        'content-type': 'application/json',
        'x-revenuecat-webhook-signature': `t=${timestamp},v1=${'0'.repeat(64)}`,
      },
      payload: rawPayload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(paymentsService.recordVerifiedEvent).not.toHaveBeenCalled();
    expect(paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('keeps Stripe ingress independent when RevenueCat is disabled', async () => {
    const stripeProcess = vi.fn(async () => ({ outcome: 'IGNORED' }));
    const app = await buildApp({
      logger: false,
      stripeWebhookEnabled: true,
      stripeWebhookProcessor: { process: stripeProcess },
      revenueCatWebhookEnabled: false,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/stripe',
      headers: { 'content-type': 'application/json' },
      payload: '{"id":"evt_stripe_still_available"}',
    });

    expect(response.statusCode).toBe(200);
    expect(stripeProcess).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized RevenueCat webhook payloads before processing', async () => {
    const process = vi.fn();
    const app = await webhookApp(process);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/revenuecat',
      headers: { 'content-type': 'application/json' },
      payload: 'x'.repeat(DEFAULT_BODY_LIMIT_BYTES + 1),
    });

    expect(response.statusCode).toBe(413);
    expect(response.json().error.code).toBe('REQUEST_TOO_LARGE');
    expect(process).not.toHaveBeenCalled();
  });

  it('returns a retryable server error when RevenueCat processing fails unexpectedly', async () => {
    const process = vi.fn(async () => {
      throw new Error('database unavailable');
    });
    const app = await webhookApp(process);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/revenuecat',
      headers: { 'content-type': 'application/json' },
      payload: '{"api_version":"1.0","event":{"id":"evt_retry"}}',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
  });
});
