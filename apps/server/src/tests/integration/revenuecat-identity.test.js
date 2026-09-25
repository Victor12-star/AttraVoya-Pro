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

const apps = [];
const APP_USER_ID = 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

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

async function identityApp(getOrCreateForUser) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    stripeWebhookEnabled: false,
    revenueCatWebhookEnabled: false,
    revenueCatSubscriberIdentityService: { getOrCreateForUser },
  });
  apps.push(app);
  return app;
}

describe('authenticated RevenueCat Android identity handoff', () => {
  it('requires a current authenticated account before creating or returning identity', async () => {
    const getOrCreateForUser = vi.fn();
    const app = await identityApp(getOrCreateForUser);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/payments/revenuecat/android/identity',
    });

    expect(response.statusCode).toBe(401);
    expect(getOrCreateForUser).not.toHaveBeenCalled();
  });

  it('returns only the current account opaque App User ID as private no-store data', async () => {
    const getOrCreateForUser = vi.fn(async ({ userId }) => ({
      userId,
      appUserId: APP_USER_ID,
      created: true,
    }));
    const app = await identityApp(getOrCreateForUser);
    const accessToken = app.jwt.sign({ sub: 'user-1' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/payments/revenuecat/android/identity',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({ appUserId: APP_USER_ID });
    expect(getOrCreateForUser).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(JSON.stringify(response.json())).not.toContain('user-1');
    expect(JSON.stringify(response.json())).not.toContain('created');
    expect(JSON.stringify(response.json())).not.toContain('entitlement');
    expect(JSON.stringify(response.json())).not.toContain('purchase');
  });
});
