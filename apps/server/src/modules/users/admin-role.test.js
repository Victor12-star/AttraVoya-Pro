import argon2 from 'argon2';
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
const { createAdminRoleRepository } = await import('./admin-role.repository.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function authFor(userId) {
  const owner = userId === 'owner';
  return {
    id: userId,
    email: `${userId}@example.test`,
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
    roles: [owner ? 'SUPER_ADMIN' : 'USER'],
    permissions: owner ? ['roles:write'] : [],
  };
}

async function makeApp(repository) {
  const app = await buildApp({
    logger: false,
    authRepository: {
      findAuthorizationContextByUserId: async (id) => authFor(id),
    },
    healthRepository: { checkDatabase: async () => true },
    adminRoleRepository: repository,
  });
  apps.push(app);
  return app;
}

function bearer(app, id) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: id })}` };
}

function payload(action = 'grant') {
  return { email: 'existing@example.test', action, currentPassword: 'OwnerPassword123' };
}

describe('owner-only administrator role management', () => {
  it('rejects unauthenticated and ordinary users without reaching the repository', async () => {
    const repository = {
      ownerCredential: vi.fn(),
      setAdminRole: vi.fn(),
    };
    const app = await makeApp(repository);
    const anonymous = await app.inject({
      method: 'POST',
      url: '/api/v1/users/admin-role',
      payload: payload(),
    });
    const ordinary = await app.inject({
      method: 'POST',
      url: '/api/v1/users/admin-role',
      headers: bearer(app, 'traveler'),
      payload: payload(),
    });
    expect(anonymous.statusCode).toBe(401);
    expect(ordinary.statusCode).toBe(403);
    expect(repository.ownerCredential).not.toHaveBeenCalled();
  });

  it('requires owner password confirmation for an authorized request', async () => {
    const repository = {
      ownerCredential: vi.fn(async () => ({
        passwordHash: await argon2.hash('ActualOwnerPassword123', { type: argon2.argon2id }),
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        deletedAt: null,
      })),
      setAdminRole: vi.fn(),
    };
    const app = await makeApp(repository);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/admin-role',
      headers: bearer(app, 'owner'),
      payload: payload(),
    });
    expect(response.statusCode).toBe(401);
    expect(repository.setAdminRole).not.toHaveBeenCalled();
  });

  it('accepts an authorized owner with a valid password and returns only change state', async () => {
    const passwordHash = await argon2.hash('OwnerPassword123', { type: argon2.argon2id });
    const repository = {
      ownerCredential: vi.fn(async () => ({
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        deletedAt: null,
      })),
      setAdminRole: vi.fn(async () => ({ role: 'ADMIN', action: 'grant', changed: true })),
    };
    const app = await makeApp(repository);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/admin-role',
      headers: bearer(app, 'owner'),
      payload: payload(),
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({ role: 'ADMIN', action: 'grant', changed: true });
    expect(repository.setAdminRole).toHaveBeenCalledWith({
      actorId: 'owner',
      expectedPasswordHash: passwordHash,
      email: 'existing@example.test',
      action: 'grant',
    });
    expect(response.body).not.toContain('passwordHash');
  });

  it('rejects unsupported roles and unexpected fields', async () => {
    const repository = { ownerCredential: vi.fn(), setAdminRole: vi.fn() };
    const app = await makeApp(repository);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/admin-role',
      headers: bearer(app, 'owner'),
      payload: { ...payload(), role: 'SUPER_ADMIN' },
    });
    expect(response.statusCode).toBe(400);
    expect(repository.ownerCredential).not.toHaveBeenCalled();
  });
});

describe('audited and guarded role repository', () => {
  it('assigns ADMIN and revokes sessions only after checking owner and target inside a transaction', async () => {
    const actions = [];
    const tx = {
      $queryRaw: vi.fn(async () => []),
      user: {
        findUnique: vi.fn(async ({ where }) =>
          where.id
            ? {
                id: 'owner',
                status: 'ACTIVE',
                deletedAt: null,
                passwordHash: 'expected-hash',
                roles: [{ role: { key: 'SUPER_ADMIN' } }],
              }
            : {
                id: 'existing',
                status: 'ACTIVE',
                deletedAt: null,
                emailVerifiedAt: new Date(),
                roles: [{ role: { key: 'USER' } }],
              },
        ),
      },
      role: { findUnique: vi.fn(async () => ({ id: 'admin-role' })) },
      userRole: {
        create: vi.fn(async (data) => {
          actions.push('role');
          return data;
        }),
      },
      authSession: {
        updateMany: vi.fn(async () => {
          actions.push('sessions');
        }),
      },
      adminAuditLog: {
        create: vi.fn(async () => {
          actions.push('audit');
        }),
      },
    };
    const database = { $transaction: vi.fn(async (callback) => callback(tx)) };
    const repository = createAdminRoleRepository(/** @type {any} */ (database));
    await expect(
      repository.setAdminRole({
        actorId: 'owner',
        expectedPasswordHash: 'expected-hash',
        email: 'existing@example.test',
        action: 'grant',
      }),
    ).resolves.toEqual({ changed: true, role: 'ADMIN', action: 'grant' });
    expect(actions).toEqual(['role', 'sessions', 'audit']);
    expect(database.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    );
  });

  it('blocks changes to owner accounts', async () => {
    const tx = {
      $queryRaw: vi.fn(async () => []),
      user: {
        findUnique: vi.fn(async ({ where }) =>
          where.id
            ? {
                id: 'owner',
                status: 'ACTIVE',
                deletedAt: null,
                passwordHash: 'expected-hash',
                roles: [{ role: { key: 'SUPER_ADMIN' } }],
              }
            : {
                id: 'another-owner',
                status: 'ACTIVE',
                deletedAt: null,
                emailVerifiedAt: new Date(),
                roles: [{ role: { key: 'SUPER_ADMIN' } }],
              },
        ),
      },
      userRole: { create: vi.fn() },
    };
    const database = { $transaction: async (callback) => callback(tx) };
    const repository = createAdminRoleRepository(/** @type {any} */ (database));
    await expect(
      repository.setAdminRole({
        actorId: 'owner',
        expectedPasswordHash: 'expected-hash',
        email: 'existing@example.test',
        action: 'grant',
      }),
    ).rejects.toThrow('Owner accounts cannot be modified');
    expect(tx.userRole.create).not.toHaveBeenCalled();
  });
});
