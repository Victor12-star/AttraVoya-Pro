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

const { default: argon2 } = await import('argon2');
const { buildApp } = await import('../../app.js');
const { createUsersRepository } = await import('./users.repository.js');

const PASSWORD = 'SafePassword123';
const PASSWORD_HASH = await argon2.hash(PASSWORD, { type: argon2.argon2id });

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function authorizationRepository() {
  return {
    async findAuthorizationContextByUserId(userId) {
      return {
        id: userId,
        email: 'traveller@example.test',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        roles: ['USER'],
        permissions: [],
      };
    },
  };
}

function usersRepository(overrides = {}) {
  return {
    findForAccountDeletion: vi.fn(async () => ({
      id: 'user-1',
      passwordHash: PASSWORD_HASH,
      deletedAt: null,
    })),
    deleteAccountData: vi.fn(async () => true),
    ...overrides,
  };
}

async function createApp(repository) {
  const app = await buildApp({
    logger: false,
    authRepository: authorizationRepository(),
    usersRepository: repository,
    healthRepository: { checkDatabase: async () => true },
  });
  apps.push(app);
  return app;
}

function bearer(app) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: 'user-1' })}` };
}

describe('account deletion endpoint', () => {
  it('requires current authentication', async () => {
    const repository = usersRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      payload: { password: PASSWORD },
    });

    expect(response.statusCode).toBe(401);
    expect(repository.findForAccountDeletion).not.toHaveBeenCalled();
    expect(repository.deleteAccountData).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password without deleting data', async () => {
    const repository = usersRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: bearer(app),
      payload: { password: 'WrongPassword123' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
    expect(repository.deleteAccountData).not.toHaveBeenCalled();
  });

  it('deletes the authenticated account and clears browser credentials', async () => {
    const repository = usersRepository();
    const app = await createApp(repository);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: bearer(app),
      payload: { password: PASSWORD },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['cache-control']).toBe('private, no-store');
    const setCookie = String(response.headers['set-cookie']);
    expect(setCookie).toContain('attravoya_access=');
    expect(setCookie).toContain('attravoya_refresh=');
    expect(repository.deleteAccountData).toHaveBeenCalledWith({
      userId: 'user-1',
      replacementPasswordHash: expect.stringMatching(/^\$argon2id\$/),
      deletedAt: expect.any(Date),
    });
  });
});

describe('users repository account erasure', () => {
  it('removes owned data and anonymizes the retained audit anchor atomically', async () => {
    const deletedAt = new Date('2026-09-20T12:00:00.000Z');
    const deleteMany = () => vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: 'user-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      trip: { deleteMany: deleteMany() },
      travelPlanRecommendation: { deleteMany: deleteMany() },
      travelPlanRequest: { deleteMany: deleteMany() },
      favorite: { deleteMany: deleteMany() },
      recentSearch: { deleteMany: deleteMany() },
      subscription: { deleteMany: deleteMany() },
      userProfile: { deleteMany: deleteMany() },
      userRole: { deleteMany: deleteMany() },
      authSession: { deleteMany: deleteMany() },
      emailVerificationToken: { deleteMany: deleteMany() },
      passwordResetToken: { deleteMany: deleteMany() },
    };
    const prismaClient = {
      user: { findUnique: vi.fn() },
      $transaction: vi.fn(async (operation) => operation(tx)),
    };
    const repository = createUsersRepository(/** @type {any} */ (prismaClient));

    await expect(
      repository.deleteAccountData({
        userId: 'user-1',
        replacementPasswordHash: 'replacement-hash',
        deletedAt,
      }),
    ).resolves.toBe(true);

    expect(tx.trip.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(tx.travelPlanRecommendation.deleteMany).toHaveBeenCalledWith({
      where: { request: { userId: 'user-1' } },
    });
    expect(tx.travelPlanRequest.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(tx.authSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', deletedAt: null },
      data: {
        email: 'deleted-user-1@deleted.invalid',
        passwordHash: 'replacement-hash',
        status: 'DEACTIVATED',
        emailVerifiedAt: null,
        lastLoginAt: null,
        deletedAt,
      },
    });
  });
});
