import { afterEach, describe, expect, it } from 'vitest';

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

const { buildApp } = await import('../../app.js');
const { ROLES } = await import('@attravoya/constants');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function activeAuth(userId = 'user-1') {
  return {
    id: userId,
    email: `${userId}@example.test`,
    status: 'ACTIVE',
    emailVerifiedAt: new Date('2026-09-11T10:00:00.000Z'),
    roles: [ROLES.USER],
    permissions: [],
  };
}

async function createSessionApp(repository) {
  const app = await buildApp({
    logger: false,
    authRepository: repository,
    healthRepository: { checkDatabase: async () => true },
  });
  apps.push(app);
  return app;
}

describe('authenticated session controls', () => {
  it('requires authentication before listing sessions', async () => {
    const repository = {
      findAuthorizationContextByUserId: async () => activeAuth(),
      listActiveSessionsForUser: async () => [],
    };
    const app = await createSessionApp(repository);

    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/sessions' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'AUTHENTICATION_REQUIRED' } });
  });

  it('returns only minimized active-session metadata with a private no-store contract', async () => {
    const calls = [];
    const repository = {
      findAuthorizationContextByUserId: async (userId) => activeAuth(userId),
      listActiveSessionsForUser: async (userId, now, limit) => {
        calls.push({ userId, now, limit });
        return [
          {
            id: 'session-1',
            userAgent: 'Example Browser',
            createdAt: new Date('2026-09-10T08:00:00.000Z'),
            lastUsedAt: new Date('2026-09-11T09:00:00.000Z'),
            expiresAt: new Date('2026-10-10T08:00:00.000Z'),
            refreshTokenHash: 'must-not-leak',
            ipHash: 'must-not-leak',
          },
        ];
      },
    };
    const app = await createSessionApp(repository);
    const token = app.jwt.sign({ sub: 'user-1' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/sessions',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({
      sessions: [
        {
          id: 'session-1',
          userAgent: 'Example Browser',
          createdAt: '2026-09-10T08:00:00.000Z',
          lastUsedAt: '2026-09-11T09:00:00.000Z',
          expiresAt: '2026-10-10T08:00:00.000Z',
        },
      ],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ userId: 'user-1', limit: 50 });
    expect(calls[0].now).toBeInstanceOf(Date);
    expect(response.body).not.toContain('must-not-leak');
    expect(response.body).not.toContain('refreshTokenHash');
    expect(response.body).not.toContain('ipHash');
  });

  it('revokes a session only through the authenticated owner scope and stays idempotent', async () => {
    const revoked = [];
    const repository = {
      findAuthorizationContextByUserId: async (userId) => activeAuth(userId),
      revokeOwnedSession: async (input) => {
        revoked.push(input);
        return false;
      },
    };
    const app = await createSessionApp(repository);
    const token = app.jwt.sign({ sub: 'user-1' });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/sessions/session-from-another-account',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);
    expect(revoked).toEqual([{ userId: 'user-1', sessionId: 'session-from-another-account' }]);
  });

  it('revokes all active sessions for the authenticated account and clears auth cookies', async () => {
    const revokedUsers = [];
    const repository = {
      findAuthorizationContextByUserId: async (userId) => activeAuth(userId),
      revokeAllActiveSessionsForUser: async (userId) => {
        revokedUsers.push(userId);
        return { count: 3 };
      },
    };
    const app = await createSessionApp(repository);
    const token = app.jwt.sign({ sub: 'user-1' });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/sessions',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);
    expect(revokedUsers).toEqual(['user-1']);
    const setCookie = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie ?? '');
    expect(cookies).toContain('attravoya_access=');
    expect(cookies).toContain('attravoya_refresh=');
  });
});
