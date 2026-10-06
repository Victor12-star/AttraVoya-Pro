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

const { buildApp } = await import('../../app.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function authorizationRepository() {
  return {
    async findAuthorizationContextByUserId(userId) {
      if (userId === 'admin-no-analytics') {
        return {
          id: userId,
          email: 'admin-no-analytics@example.test',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          roles: ['ADMIN'],
          permissions: [],
        };
      }

      const isAdmin = userId === 'admin-user' || userId === 'super-admin';
      return {
        id: userId,
        email: `${userId}@example.test`,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        roles: [userId === 'super-admin' ? 'SUPER_ADMIN' : isAdmin ? 'ADMIN' : 'USER'],
        permissions: isAdmin ? ['analytics:read'] : [],
      };
    },
  };
}

function bearer(app, userId) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

async function createApp(repository, now = () => new Date('2026-10-06T12:00:00.000Z')) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    healthRepository: { checkDatabase: async () => true },
    analyticsRepository: repository,
    analyticsNow: now,
  });
  apps.push(app);
  return app;
}

function analyticsRepository() {
  return {
    readUserRegistrationCounts: vi.fn(async () => ({
      totalRegistered: 12430,
      newRegistered: 126,
    })),
  };
}

describe('admin aggregate user analytics', () => {
  it('requires current authentication', async () => {
    const repository = analyticsRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/users',
    });

    expect(response.statusCode).toBe(401);
    expect(repository.readUserRegistrationCounts).not.toHaveBeenCalled();
  });

  it('rejects ordinary users and admins without analytics permission', async () => {
    const repository = analyticsRepository();
    const app = await createApp(repository);

    const ordinary = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/users',
      headers: bearer(app, 'ordinary-user'),
    });
    const missingPermission = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/users',
      headers: bearer(app, 'admin-no-analytics'),
    });

    expect(ordinary.statusCode).toBe(403);
    expect(missingPermission.statusCode).toBe(403);
    expect(repository.readUserRegistrationCounts).not.toHaveBeenCalled();
  });

  it('returns aggregate-only registration counts to authorized admins', async () => {
    const repository = analyticsRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/users?days=30',
      headers: bearer(app, 'admin-user'),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(repository.readUserRegistrationCounts).toHaveBeenCalledWith({
      createdAfter: new Date('2026-09-06T12:00:00.000Z'),
      createdThrough: new Date('2026-10-06T12:00:00.000Z'),
    });
    expect(response.json()).toEqual({
      window: {
        days: 30,
        start: '2026-09-06T12:00:00.000Z',
        end: '2026-10-06T12:00:00.000Z',
      },
      users: {
        totalRegistered: 12430,
        newRegistered: 126,
      },
    });
    expect(response.body).not.toContain('email');
    expect(response.body).not.toContain('userId');
    expect(response.body).not.toContain('password');
  });

  it('allows super admins with the analytics permission', async () => {
    const repository = analyticsRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/users',
      headers: bearer(app, 'super-admin'),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().window.days).toBe(7);
  });

  it('rejects analytics windows outside the bounded range before querying data', async () => {
    const repository = analyticsRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/users?days=365',
      headers: bearer(app, 'admin-user'),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(repository.readUserRegistrationCounts).not.toHaveBeenCalled();
  });
});
