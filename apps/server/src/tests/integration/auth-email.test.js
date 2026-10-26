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

afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function baseRepository(overrides = {}) {
  return {
    findAuthorizationContextByUserId: async () => null,
    findUserByEmailForLogin: async () => null,
    createEmailVerificationToken: async () => null,
    ...overrides,
  };
}

describe('authentication email recovery routes', () => {
  it('resends verification for an unverified account without returning the raw token', async () => {
    const onVerificationRequested = vi.fn().mockResolvedValue(undefined);
    const repository = baseRepository({
      findUserByEmailForLogin: async () => ({
        id: 'user-1',
        email: 'traveller@example.test',
        emailVerifiedAt: null,
        deletedAt: null,
      }),
    });

    const app = await buildApp({
      logger: false,
      authRepository: repository,
      onVerificationRequested,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/resend-verification',
      payload: { email: 'traveller@example.test' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.stringify(response.json())).not.toContain('token');
    expect(onVerificationRequested).toHaveBeenCalledTimes(1);
    expect(onVerificationRequested.mock.calls[0][0].email).toBe('traveller@example.test');
    expect(onVerificationRequested.mock.calls[0][0].token.length).toBeGreaterThan(20);
  });

  it('returns the same public response when the account does not exist', async () => {
    const onVerificationRequested = vi.fn();
    const app = await buildApp({
      logger: false,
      authRepository: baseRepository(),
      onVerificationRequested,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/resend-verification',
      payload: { email: 'unknown@example.test' },
    });

    expect(response.statusCode).toBe(200);
    expect(onVerificationRequested).not.toHaveBeenCalled();
    expect(response.json().message).toContain('If the account exists');
  });

  it('keeps recovery requests indistinguishable for existing and unknown accounts', async () => {
    const onPasswordResetRequested = vi.fn().mockResolvedValue(undefined);
    const tokenStorage = vi.fn().mockResolvedValue(undefined);
    const repository = baseRepository({
      findUserIdByEmail: async (email) =>
        email === 'traveller@example.test' ? 'user-1' : null,
      createPasswordResetToken: tokenStorage,
    });
    const app = await buildApp({
      logger: false,
      authRepository: repository,
      onPasswordResetRequested,
    });
    apps.push(app);

    const existing = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'traveller@example.test' },
    });
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'unknown@example.test' },
    });

    expect(existing.statusCode).toBe(200);
    expect(unknown.statusCode).toBe(200);
    expect(existing.json()).toEqual(unknown.json());
    expect(JSON.stringify(existing.json())).not.toContain('token');
    expect(tokenStorage).toHaveBeenCalledTimes(1);
    expect(onPasswordResetRequested).toHaveBeenCalledTimes(1);
    const storedToken = tokenStorage.mock.calls[0][0];
    const mailedToken = onPasswordResetRequested.mock.calls[0][0];
    expect(storedToken.userId).toBe('user-1');
    expect(storedToken.tokenHash).not.toBe(mailedToken.token);
    expect(mailedToken.email).toBe('traveller@example.test');
    expect(mailedToken.token.length).toBeGreaterThan(20);
  });

  it('does not reveal an email delivery failure or expose the reset token', async () => {
    const onPasswordResetRequested = vi.fn().mockRejectedValue(new Error('delivery unavailable'));
    const repository = baseRepository({
      findUserIdByEmail: async () => 'user-1',
      createPasswordResetToken: async () => null,
    });
    const app = await buildApp({ logger: false, authRepository: repository, onPasswordResetRequested });
    apps.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'traveller@example.test' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain('If an account exists');
    expect(JSON.stringify(response.json())).not.toContain('token');
    expect(onPasswordResetRequested).toHaveBeenCalledTimes(1);
  });

  it('rejects expired or reused reset tokens without changing a password', async () => {
    const resetPasswordByTokenHash = vi.fn().mockResolvedValue(null);
    const app = await buildApp({
      logger: false,
      authRepository: baseRepository({ resetPasswordByTokenHash }),
    });
    apps.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: {
        token: 'test-reset-token-with-sufficient-length-1234',
        password: 'UpdatedSafePassword123!',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect(resetPasswordByTokenHash).toHaveBeenCalledTimes(1);
    expect(resetPasswordByTokenHash.mock.calls[0][0].tokenHash).not.toBe(
      'test-reset-token-with-sufficient-length-1234',
    );
  });
});
