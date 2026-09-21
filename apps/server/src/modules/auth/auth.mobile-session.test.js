import { createHash } from 'node:crypto';

import argon2 from 'argon2';
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

function activeAuth(userId = 'mobile-user-1') {
  return {
    id: userId,
    email: `${userId}@example.test`,
    status: 'ACTIVE',
    emailVerifiedAt: new Date('2026-09-21T10:00:00.000Z'),
    roles: [ROLES.USER],
    permissions: [],
  };
}

async function createMobileAuthApp(repository) {
  const app = await buildApp({
    logger: false,
    authRepository: repository,
    healthRepository: { checkDatabase: async () => true },
  });
  apps.push(app);
  return app;
}

function refreshTokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

describe('mobile refresh-session contract', () => {
  it('issues a cookie-free mobile session and stores only the refresh-token hash', async () => {
    const password = 'MobilePassword123!';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const createdSessions = [];
    const auth = activeAuth();
    const expiresAt = new Date('2026-10-21T10:00:00.000Z');
    const repository = {
      findUserByEmailForLogin: async () => ({
        ...auth,
        passwordHash,
        deletedAt: null,
      }),
      findAuthorizationContextByUserId: async () => auth,
      createSession: async (input) => {
        createdSessions.push(input);
        return { expiresAt };
      },
      updateLastLogin: async () => {},
    };
    const app = await createMobileAuthApp(repository);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mobile/login',
      payload: { email: auth.email, password },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['set-cookie']).toBeUndefined();

    const payload = response.json();
    expect(payload).toMatchObject({
      refreshExpiresAt: expiresAt.toISOString(),
      user: {
        id: auth.id,
        email: auth.email,
        roles: [ROLES.USER],
        emailVerified: true,
      },
    });
    expect(payload.accessToken).toEqual(expect.any(String));
    expect(payload.refreshToken).toEqual(expect.any(String));
    expect(createdSessions).toHaveLength(1);
    expect(createdSessions[0].refreshTokenHash).toBe(refreshTokenHash(payload.refreshToken));
    expect(createdSessions[0].refreshTokenHash).not.toContain(payload.refreshToken);
  });

  it('rotates a mobile refresh credential without exposing browser cookies', async () => {
    const currentRefreshToken = 'r'.repeat(64);
    const auth = activeAuth();
    const expiresAt = new Date('2026-10-21T10:00:00.000Z');
    const rotations = [];
    const repository = {
      findActiveSessionByRefreshHash: async (tokenHash) => {
        expect(tokenHash).toBe(refreshTokenHash(currentRefreshToken));
        return { id: 'session-1', expiresAt, auth };
      },
      rotateSession: async (input) => {
        rotations.push(input);
        return true;
      },
    };
    const app = await createMobileAuthApp(repository);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mobile/refresh',
      payload: { refreshToken: currentRefreshToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['set-cookie']).toBeUndefined();

    const payload = response.json();
    expect(payload.refreshToken).toEqual(expect.any(String));
    expect(payload.refreshToken).not.toBe(currentRefreshToken);
    expect(payload.refreshExpiresAt).toBe(expiresAt.toISOString());
    expect(rotations).toHaveLength(1);
    expect(rotations[0]).toMatchObject({
      sessionId: 'session-1',
      currentRefreshTokenHash: refreshTokenHash(currentRefreshToken),
      nextRefreshTokenHash: refreshTokenHash(payload.refreshToken),
    });
    expect(rotations[0].lastUsedAt).toBeInstanceOf(Date);
  });

  it('validates mobile refresh bodies before repository access', async () => {
    const repository = {
      findActiveSessionByRefreshHash: async () => {
        throw new Error('repository must not be reached');
      },
    };
    const app = await createMobileAuthApp(repository);

    const [missing, unknownField] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/refresh',
        payload: {},
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/mobile/refresh',
        payload: { refreshToken: 'r'.repeat(64), unexpected: true },
      }),
    ]);

    expect(missing.statusCode).toBe(400);
    expect(unknownField.statusCode).toBe(400);
  });

  it('revokes mobile sessions by refresh-token hash and remains cookie-free', async () => {
    const refreshToken = 'x'.repeat(64);
    const revokedHashes = [];
    const repository = {
      revokeSessionByRefreshHash: async (tokenHash) => {
        revokedHashes.push(tokenHash);
      },
    };
    const app = await createMobileAuthApp(repository);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mobile/logout',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(revokedHashes).toEqual([refreshTokenHash(refreshToken)]);
    expect(revokedHashes).not.toContain(refreshToken);
  });
});
