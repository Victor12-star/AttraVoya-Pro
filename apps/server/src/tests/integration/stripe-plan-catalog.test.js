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

async function catalogApp(list) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    stripeWebhookEnabled: true,
    stripeWebhookProcessor: { process: vi.fn() },
    stripePurchaseEnabled: true,
    stripeCheckoutSessionService: { create: vi.fn() },
    stripePlanCatalogService: { list },
  });
  apps.push(app);
  return app;
}

describe('Stripe plan catalog ingress', () => {
  it('does not expose the catalog while Stripe purchase mode is disabled', async () => {
    const app = await buildApp({
      logger: false,
      stripeWebhookEnabled: false,
      stripePurchaseEnabled: false,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/payments/checkout/stripe/plans',
    });

    expect(response.statusCode).toBe(404);
  });

  it('requires an authenticated account before displaying purchase pricing', async () => {
    const list = vi.fn();
    const app = await catalogApp(list);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/payments/checkout/stripe/plans',
    });

    expect(response.statusCode).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it('returns only safe server-authoritative display pricing', async () => {
    const list = vi.fn(async () => ({
      plans: [
        {
          planKey: PLANS.PRO_MONTHLY,
          name: 'Pro Monthly',
          unitAmount: 12900,
          currency: 'sek',
          interval: 'month',
        },
        {
          planKey: PLANS.PRO_YEARLY,
          name: 'Pro Yearly',
          unitAmount: 129000,
          currency: 'sek',
          interval: 'year',
        },
      ],
    }));
    const app = await catalogApp(list);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/payments/checkout/stripe/plans',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({
      plans: [
        {
          planKey: PLANS.PRO_MONTHLY,
          name: 'Pro Monthly',
          unitAmount: 12900,
          currency: 'sek',
          interval: 'month',
        },
        {
          planKey: PLANS.PRO_YEARLY,
          name: 'Pro Yearly',
          unitAmount: 129000,
          currency: 'sek',
          interval: 'year',
        },
      ],
    });
    expect(list).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(response.json())).not.toContain('price_');
    expect(JSON.stringify(response.json())).not.toContain('secret');
  });
});
