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

const { PLANS } = await import('@attravoya/constants');
const { buildApp } = await import('../../app.js');
const { STRIPE_CHECKOUT_BODY_LIMIT_BYTES } = await import('../../config/constants.js');

const apps = [];

afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function authorizationRepository() {
  return {
    async findAuthorizationContextByUserId(userId) {
      return {
        id: userId,
        email: `${userId}@example.test`,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        roles: ['USER'],
        permissions: [],
      };
    },
  };
}

function bearer(app, userId = 'user-1') {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

async function checkoutApp(create) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    stripeWebhookEnabled: true,
    stripeWebhookProcessor: { process: vi.fn() },
    stripePurchaseEnabled: true,
    stripePurchasePriceIds: {
      [PLANS.PRO_MONTHLY]: 'price_monthly_server_owned',
      [PLANS.PRO_YEARLY]: 'price_yearly_server_owned',
    },
    stripeCheckoutReturnUrls: {
      successUrl: 'https://example.test/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://example.test/premium?checkout=cancelled',
    },
    stripeCheckoutSessionService: { create },
  });
  apps.push(app);
  return app;
}

describe('authenticated Stripe checkout ingress', () => {
  it('does not expose checkout while Stripe purchase mode is disabled', async () => {
    const app = await buildApp({
      logger: false,
      stripeWebhookEnabled: false,
      stripePurchaseEnabled: false,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/checkout/stripe',
      payload: { planKey: PLANS.PRO_MONTHLY },
    });

    expect(response.statusCode).toBe(404);
  });

  it('requires a current authenticated account before checkout creation', async () => {
    const create = vi.fn();
    const app = await checkoutApp(create);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/checkout/stripe',
      payload: { planKey: PLANS.PRO_MONTHLY },
    });

    expect(response.statusCode).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('passes only authenticated ownership and the validated AttraVoya plan key to checkout', async () => {
    const create = vi.fn(async () => ({
      attemptId: 'attempt-private',
      checkoutSessionId: 'cs_private',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_safe',
      duplicate: false,
    }));
    const app = await checkoutApp(create);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/checkout/stripe',
      headers: bearer(app),
      payload: { planKey: PLANS.PRO_YEARLY },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_safe',
    });
    expect(create).toHaveBeenCalledWith({
      userId: 'user-1',
      planKey: PLANS.PRO_YEARLY,
    });
    expect(JSON.stringify(response.json())).not.toContain('attempt-private');
    expect(JSON.stringify(response.json())).not.toContain('cs_private');
  });

  it('rejects unsupported plans and client-supplied Stripe authority fields', async () => {
    const create = vi.fn();
    const app = await checkoutApp(create);

    const unsupported = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/checkout/stripe',
      headers: bearer(app),
      payload: { planKey: 'FREE' },
    });
    const authorityInjection = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/checkout/stripe',
      headers: bearer(app),
      payload: {
        planKey: PLANS.PRO_MONTHLY,
        priceId: 'price_client_selected',
        successUrl: 'https://evil.example/success',
      },
    });

    expect(unsupported.statusCode).toBe(400);
    expect(authorityInjection.statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects oversized checkout bodies before provider work can start', async () => {
    const create = vi.fn();
    const app = await checkoutApp(create);
    const rawPayload = JSON.stringify({
      planKey: PLANS.PRO_MONTHLY,
      padding: 'x'.repeat(STRIPE_CHECKOUT_BODY_LIMIT_BYTES),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/checkout/stripe',
      headers: {
        ...bearer(app),
        'content-type': 'application/json',
      },
      payload: rawPayload,
    });

    expect(response.statusCode).toBe(413);
    expect(response.json().error.code).toBe('REQUEST_TOO_LARGE');
    expect(create).not.toHaveBeenCalled();
  });

  it('fails startup if purchase ingress is enabled without verified webhook ingress', async () => {
    await expect(
      buildApp({
        logger: false,
        stripeWebhookEnabled: false,
        stripePurchaseEnabled: true,
        stripeCheckoutSessionService: { create: vi.fn() },
      }),
    ).rejects.toThrow('Stripe purchase requires verified webhook ingress.');
  });
});
