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
process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
process.env.COOKIE_SECRET = 'c'.repeat(64);
process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);

const { ENTITLEMENTS, PLANS, PRO_PLAN_KEYS } = await import('@attravoya/constants');
const { buildApp } = await import('../../app.js');
const { createEntitlementsRepository } = await import('./entitlements.repository.js');

const NOW = new Date('2026-09-22T17:00:00.000Z');
const apps = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

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

/** @param {any} [record] */
function entitlementRepository(record = null) {
  return {
    findActiveProSubscription: vi.fn(async () => record),
  };
}

async function createApp(repository) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    entitlementsRepository: repository,
    entitlementsNow: () => NOW,
    healthRepository: { checkDatabase: async () => true },
  });
  apps.push(app);
  return app;
}

function bearer(app, userId = 'user-1') {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

function registerEntitlementProbe(app, entitlement = ENTITLEMENTS.ADVANCED_BUDGET_OPTIMIZATION) {
  const protectedApp = /** @type {any} */ (app);
  app.get('/test/pro-entitlement', {
    onRequest: [protectedApp.authenticate, protectedApp.requireEntitlement(entitlement)],
    handler: async () => ({ ok: true }),
  });
}

/**
 * @param {string} [planKey]
 * @returns {any}
 */
function proSubscription(planKey = PLANS.PRO_MONTHLY) {
  return {
    status: 'ACTIVE',
    currentPeriodEnd: new Date('2026-10-22T17:00:00.000Z'),
    externalCustomerId: 'must-not-leak',
    externalSubscriptionId: 'must-not-leak',
    plan: {
      key: planKey,
      entitlements: [
        { entitlement: { key: ENTITLEMENTS.ADVANCED_BUDGET_OPTIMIZATION } },
        { entitlement: { key: ENTITLEMENTS.OFFLINE_MAPS } },
      ],
    },
  };
}

describe('authoritative entitlement endpoint', () => {
  it('requires a current authenticated account', async () => {
    const repository = entitlementRepository();
    const app = await createApp(repository);

    const response = await app.inject({ method: 'GET', url: '/api/v1/entitlements/me' });

    expect(response.statusCode).toBe(401);
    expect(repository.findActiveProSubscription).not.toHaveBeenCalled();
  });

  it('returns Free access when no active verified subscription exists', async () => {
    const repository = entitlementRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/entitlements/me',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(repository.findActiveProSubscription).toHaveBeenCalledWith({
      userId: 'user-1',
      now: NOW,
    });
    expect(response.json()).toEqual({
      access: {
        plan: { key: PLANS.FREE, tier: 'FREE', name: 'Free' },
        entitlements: [],
        limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
        subscription: null,
      },
    });
  });

  it('returns only server-recognized entitlements for an active Pro Monthly subscription', async () => {
    const repository = entitlementRepository(proSubscription());
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/entitlements/me',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      access: {
        plan: { key: PLANS.PRO_MONTHLY, tier: 'PRO', name: 'Pro Monthly' },
        entitlements: [ENTITLEMENTS.OFFLINE_MAPS, ENTITLEMENTS.ADVANCED_BUDGET_OPTIMIZATION],
        limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
        subscription: {
          status: 'ACTIVE',
          currentPeriodEnd: '2026-10-22T17:00:00.000Z',
        },
      },
    });
    expect(JSON.stringify(response.json())).not.toContain('must-not-leak');
  });

  it('fails closed to Free for the legacy generic Premium plan', async () => {
    const repository = entitlementRepository(proSubscription(PLANS.PREMIUM));
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/entitlements/me',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().access).toMatchObject({
      plan: { key: PLANS.FREE, tier: 'FREE' },
      entitlements: [],
      subscription: null,
    });
  });

  it('fails closed when a Pro record has no current subscription window', async () => {
    const record = proSubscription(PLANS.PRO_YEARLY);
    record.currentPeriodEnd = null;
    const repository = entitlementRepository(record);
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/entitlements/me',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().access).toMatchObject({
      plan: { key: PLANS.FREE, tier: 'FREE' },
      entitlements: [],
      subscription: null,
    });
  });
});

describe('server entitlement authorization gate', () => {
  it('rejects Free accounts with a stable subscription-required error', async () => {
    const repository = entitlementRepository();
    const app = await createApp(repository);
    registerEntitlementProbe(app);

    const response = await app.inject({
      method: 'GET',
      url: '/test/pro-entitlement',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'An active AttraVoya Pro subscription is required for this feature.',
      },
    });
  });

  it('allows an active Pro account only when the server grants the required entitlement', async () => {
    const repository = entitlementRepository(proSubscription());
    const app = await createApp(repository);
    registerEntitlementProbe(app);

    const response = await app.inject({
      method: 'GET',
      url: '/test/pro-entitlement',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('fails closed when a Pro plan does not contain the required entitlement', async () => {
    const record = proSubscription();
    record.plan.entitlements = [{ entitlement: { key: ENTITLEMENTS.OFFLINE_MAPS } }];
    const repository = entitlementRepository(record);
    const app = await createApp(repository);
    registerEntitlementProbe(app);

    const response = await app.inject({
      method: 'GET',
      url: '/test/pro-entitlement',
      headers: bearer(app),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('rejects unknown entitlement configuration before a route can be exposed', async () => {
    const app = await createApp(entitlementRepository());

    const protectedApp = /** @type {any} */ (app);
    expect(() => protectedApp.requireEntitlement('unknown_entitlement')).toThrow(
      'A recognized entitlement is required.',
    );
  });
});

describe('entitlements repository', () => {
  it('queries only the authenticated owner and currently effective Pro plans', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = createEntitlementsRepository(
      /** @type {any} */ ({ subscription: { findFirst } }),
    );

    await repository.findActiveProSubscription({ userId: 'user-1', now: NOW });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: { in: ['ACTIVE', 'TRIALING'] },
        startsAt: { lte: NOW },
        currentPeriodEnd: { gt: NOW },
        plan: {
          is: {
            isActive: true,
            key: { in: [...PRO_PLAN_KEYS] },
          },
        },
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      select: {
        status: true,
        currentPeriodEnd: true,
        plan: {
          select: {
            key: true,
            entitlements: {
              select: {
                entitlement: {
                  select: { key: true },
                },
              },
            },
          },
        },
      },
    });
  });
});
