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
const { PERMISSIONS, ROLES } = await import('@attravoya/constants');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function repositoryReturning(auth) {
  return {
    findAuthorizationContextByUserId: async () => auth,
  };
}

async function createProtectedApp(auth) {
  const app = await buildApp({
    logger: false,
    authRepository: repositoryReturning(auth),
    healthRepository: { checkDatabase: async () => true },
  });

  app.get(
    '/protected',
    {
      onRequest: [
        app.authenticate,
        app.authorize({ allPermissions: [PERMISSIONS.USERS_READ] }),
      ],
    },
    async (request) => ({ userId: request.auth.id }),
  );

  apps.push(app);
  return app;
}

describe('authentication and authorization hooks', () => {
  it('rejects a protected route without a valid access token', async () => {
    const app = await createProtectedApp(null);

    const response = await app.inject({ method: 'GET', url: '/protected' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });

  it('uses current database permissions instead of trusting role claims in the token', async () => {
    const app = await createProtectedApp({
      id: 'user-1',
      email: 'admin@example.test',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: [ROLES.ADMIN],
      permissions: [PERMISSIONS.USERS_READ],
    });
    const token = app.jwt.sign({ sub: 'user-1' });

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: 'user-1' });
  });

  it('denies a token when the account was suspended after the token was issued', async () => {
    const app = await createProtectedApp({
      id: 'user-1',
      email: 'user@example.test',
      status: 'SUSPENDED',
      emailVerifiedAt: new Date(),
      roles: [ROLES.USER],
      permissions: [PERMISSIONS.USERS_READ],
    });
    const token = app.jwt.sign({ sub: 'user-1' });

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'ACCOUNT_NOT_ACTIVE' },
    });
  });

  it('denies a user when the required permission is absent in current database state', async () => {
    const app = await createProtectedApp({
      id: 'user-1',
      email: 'user@example.test',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: [ROLES.USER],
      permissions: [],
    });
    const token = app.jwt.sign({ sub: 'user-1', roles: [ROLES.SUPER_ADMIN] });

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: { code: 'FORBIDDEN' },
    });
  });
});
