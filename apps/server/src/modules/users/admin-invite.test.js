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
const { createAdminInviteService } = await import('./admin-invite.service.js');

const apps = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function appWithInvitation({ sendInvitation, repository }) {
  const app = await buildApp({
    logger: false,
    authRepository: {
      async findAuthorizationContextByUserId(userId) {
        const owner = userId === 'owner';
        return {
          id: userId,
          email: `${userId}@example.test`,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          roles: [owner ? 'SUPER_ADMIN' : 'USER'],
          permissions: owner ? ['roles:write'] : [],
        };
      },
    },
    healthRepository: { checkDatabase: async () => true },
    adminInviteRepository: repository,
    onAdminInvitationRequested: sendInvitation,
  });
  apps.push(app);
  return app;
}

function bearer(app, id) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: id })}` };
}

describe('secure administrator registration invitations', () => {
  it('blocks anonymous and regular-user requests before sending mail', async () => {
    const sendInvitation = vi.fn();
    const repository = { ownerCredential: vi.fn(), confirmOwner: vi.fn(), recordInvitation: vi.fn() };
    const app = await appWithInvitation({ sendInvitation, repository });
    const payload = { email: 'colleague@example.test', currentPassword: 'OwnerPassword123' };
    const anonymous = await app.inject({
      method: 'POST', url: '/api/v1/users/admin-invitations', payload,
    });
    const traveler = await app.inject({
      method: 'POST', url: '/api/v1/users/admin-invitations',
      headers: bearer(app, 'traveler'), payload,
    });
    expect(anonymous.statusCode).toBe(401);
    expect(traveler.statusCode).toBe(403);
    expect(sendInvitation).not.toHaveBeenCalled();
    expect(repository.ownerCredential).not.toHaveBeenCalled();
  });

  it('sends only registration instructions after current-password and ownership verification', async () => {
    const hash = await argon2.hash('OwnerPassword123', { type: argon2.argon2id });
    const repository = {
      ownerCredential: vi.fn(async () => ({
        passwordHash: hash, status: 'ACTIVE', emailVerifiedAt: new Date(), deletedAt: null,
      })),
      confirmOwner: vi.fn(async () => true),
      recordInvitation: vi.fn(async () => ({})),
    };
    const sendInvitation = vi.fn(async () => ({ messageId: 'test' }));
    const app = await appWithInvitation({ sendInvitation, repository });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/admin-invitations',
      headers: bearer(app, 'owner'),
      payload: { email: 'colleague@example.test', currentPassword: 'OwnerPassword123' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ sent: true, requiresRegistrationAndOwnerApproval: true });
    expect(sendInvitation).toHaveBeenCalledWith({ to: 'colleague@example.test' });
    expect(repository.confirmOwner).toHaveBeenCalledWith('owner', hash);
    expect(repository.recordInvitation).toHaveBeenCalledWith({
      actorId: 'owner', emailFingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(response.body).not.toContain('password');
  });

  it('never sends when password or owner privilege is invalid', async () => {
    const hash = await argon2.hash('OwnerPassword123', { type: argon2.argon2id });
    const repository = {
      ownerCredential: vi.fn(async () => ({
        passwordHash: hash, status: 'ACTIVE', emailVerifiedAt: new Date(), deletedAt: null,
      })),
      confirmOwner: vi.fn(async () => false),
      recordInvitation: vi.fn(),
    };
    const sendInvitation = vi.fn();
    const service = createAdminInviteService({ repository, sendInvitation });
    await expect(service.invite({
      actorId: 'owner',
      email: 'colleague@example.test',
      currentPassword: 'OwnerPassword123',
    })).rejects.toThrow('Owner authorization changed');
    expect(sendInvitation).not.toHaveBeenCalled();
    await expect(service.invite({
      actorId: 'owner',
      email: 'colleague@example.test',
      currentPassword: 'WrongPassword',
    })).rejects.toThrow('Owner password confirmation failed');
    expect(sendInvitation).not.toHaveBeenCalled();
    expect(repository.recordInvitation).not.toHaveBeenCalled();
  });

  it('fails closed if no mail provider exists', async () => {
    const hash = await argon2.hash('OwnerPassword123', { type: argon2.argon2id });
    const repository = {
      ownerCredential: async () => ({
        passwordHash: hash, status: 'ACTIVE', emailVerifiedAt: new Date(), deletedAt: null,
      }),
      confirmOwner: async () => true,
      recordInvitation: vi.fn(),
    };
    const app = await appWithInvitation({ repository });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/admin-invitations',
      headers: bearer(app, 'owner'),
      payload: { email: 'colleague@example.test', currentPassword: 'OwnerPassword123' },
    });
    expect(response.statusCode).toBe(503);
    expect(repository.recordInvitation).not.toHaveBeenCalled();
  });
});
