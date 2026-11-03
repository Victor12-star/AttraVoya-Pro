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
const { createAdminDirectoryRepository } = await import('./admin-directory.repository.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function makeApp(repository) {
  const app = await buildApp({
    logger: false,
    authRepository: {
      async findAuthorizationContextByUserId(id) {
        const isOwner = id === 'owner';
        return {
          id, email: `${id}@example.test`, status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          roles: [isOwner ? 'SUPER_ADMIN' : 'USER'],
          permissions: isOwner ? ['users:read'] : [],
        };
      },
    },
    healthRepository: { checkDatabase: async () => true },
    adminDirectoryRepository: repository,
  });
  apps.push(app);
  return app;
}

function bearer(app, id) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: id })}` };
}

describe('owner-only registered account directory', () => {
  it('rejects anonymous and ordinary user requests', async () => {
    const repository = { listUsers: vi.fn() };
    const app = await makeApp(repository);
    const anonymous = await app.inject({
      method: 'GET', url: '/api/v1/users/admin-directory',
    });
    const ordinary = await app.inject({
      method: 'GET', url: '/api/v1/users/admin-directory',
      headers: bearer(app, 'traveler'),
    });
    expect(anonymous.statusCode).toBe(401);
    expect(ordinary.statusCode).toBe(403);
    expect(repository.listUsers).not.toHaveBeenCalled();
  });

  it('returns a bounded, private list for the Super Admin', async () => {
    const repository = {
      listUsers: vi.fn(async ({ page, limit }) => ({
        page, limit, total: 1, pages: 1,
        users: [{
          id: 'u1', email: 'person@example.test', status: 'ACTIVE',
          verified: true, createdAt: '2026-11-03T00:00:00.000Z', roles: ['USER'],
        }],
      })),
    };
    const app = await makeApp(repository);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/admin-directory?page=2',
      headers: bearer(app, 'owner'),
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(repository.listUsers).toHaveBeenCalledWith({ page: 2, limit: 20 });
    expect(response.json().users[0].roles).toEqual(['USER']);
    expect(response.body).not.toContain('passwordHash');
  });

  it('rejects excessive pagination before accessing the database', async () => {
    const repository = { listUsers: vi.fn() };
    const app = await makeApp(repository);
    const response = await app.inject({
      method: 'GET', url: '/api/v1/users/admin-directory?page=1001',
      headers: bearer(app, 'owner'),
    });
    expect(response.statusCode).toBe(400);
    expect(repository.listUsers).not.toHaveBeenCalled();
  });
});

describe('minimal directory repository fields', () => {
  it('selects only approved fields and projects safe role information', async () => {
    const count = vi.fn(() => ({ kind: 'count' }));
    const findMany = vi.fn(() => ({ kind: 'list' }));
    const database = {
      user: { count, findMany },
      $transaction: vi.fn(async () => [
        1,
        [{
          id: 'u1', email: 'person@example.test',
          status: 'ACTIVE', emailVerifiedAt: new Date(),
          createdAt: new Date('2026-11-03T00:00:00.000Z'),
          roles: [{ role: { key: 'USER' } }],
        }],
      ]),
    };
    const repository = createAdminDirectoryRepository(/** @type {any} */ (database));
    const result = await repository.listUsers({ page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.users[0]).toEqual({
      id: 'u1', email: 'person@example.test', status: 'ACTIVE',
      verified: true, createdAt: '2026-11-03T00:00:00.000Z',
      roles: ['USER'],
    });
    const query = findMany.mock.calls[0];
    expect(query).toBeDefined();
    expect(JSON.stringify(query)).not.toContain('passwordHash');
    expect(JSON.stringify(query)).not.toContain('authSessions');
  });
});
