import { describe, expect, it, vi } from 'vitest';

import { createPaymentsRepository } from './payments.repository.js';
import {
  createRevenueCatSubscriberIdentityService,
} from './payments.revenuecat-subscriber-identity.js';

function identity(overrides = {}) {
  return {
    id: 'rc-identity-1',
    userId: 'user-1',
    appUserId: 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    createdAt: new Date('2026-09-24T18:30:00.000Z'),
    updatedAt: new Date('2026-09-24T18:30:00.000Z'),
    ...overrides,
  };
}

function bytes(fill) {
  return Buffer.alloc(24, fill);
}

describe('RevenueCat subscriber identity service', () => {
  it(
    'creates a non-guessable provider ID without exposing the AttraVoya user ID or email',
    async () => {
      const repository = {
        createOrReuseRevenueCatSubscriberIdentity: vi.fn(async ({ userId, appUserId }) => ({
          identity: identity({ userId, appUserId }),
          created: true,
          collision: false,
        })),
        findRevenueCatSubscriberIdentityByAppUserId: vi.fn(),
      };
      const service = createRevenueCatSubscriberIdentityService(repository, {
        randomBytesFn: () => bytes(7),
      });

      const result = await service.getOrCreateForUser({ userId: ' user-1 ' });

      expect(result.userId).toBe('user-1');
      expect(result.appUserId).toMatch(/^av_rc_[A-Za-z0-9_-]{32}$/);
      expect(result.appUserId).not.toContain('user-1');
      expect(result.appUserId).not.toContain('@');
      expect(result.appUserId).not.toContain('/');
      expect(result.created).toBe(true);
      expect(repository.createOrReuseRevenueCatSubscriberIdentity).toHaveBeenCalledWith({
        userId: 'user-1',
        appUserId: result.appUserId,
      });
    },
  );

  it('returns the concurrent winner instead of replacing an existing user mapping', async () => {
    const existing = identity();
    const repository = {
      createOrReuseRevenueCatSubscriberIdentity: vi.fn(async () => ({
        identity: existing,
        created: false,
        collision: false,
      })),
      findRevenueCatSubscriberIdentityByAppUserId: vi.fn(),
    };
    const service = createRevenueCatSubscriberIdentityService(repository, {
      randomBytesFn: () => bytes(8),
    });

    const result = await service.getOrCreateForUser({ userId: 'user-1' });

    expect(result).toEqual({
      userId: 'user-1',
      appUserId: existing.appUserId,
      created: false,
    });
  });

  it('retries a generated App User ID collision without reassigning ownership', async () => {
    const repository = {
      createOrReuseRevenueCatSubscriberIdentity: vi
        .fn()
        .mockResolvedValueOnce({ identity: null, created: false, collision: true })
        .mockImplementationOnce(async ({ userId, appUserId }) => ({
          identity: identity({ userId, appUserId }),
          created: true,
          collision: false,
        })),
      findRevenueCatSubscriberIdentityByAppUserId: vi.fn(),
    };
    let generation = 0;
    const service = createRevenueCatSubscriberIdentityService(repository, {
      randomBytesFn: () => {
        generation += 1;
        return bytes(generation);
      },
    });

    const result = await service.getOrCreateForUser({ userId: 'user-1' });

    expect(repository.createOrReuseRevenueCatSubscriberIdentity).toHaveBeenCalledTimes(2);
    expect(result.created).toBe(true);
  });

  it('fails closed after bounded repeated random identity collisions', async () => {
    const repository = {
      createOrReuseRevenueCatSubscriberIdentity: vi.fn(async () => ({
        identity: null,
        created: false,
        collision: true,
      })),
      findRevenueCatSubscriberIdentityByAppUserId: vi.fn(),
    };
    const service = createRevenueCatSubscriberIdentityService(repository, {
      randomBytesFn: () => bytes(3),
    });

    await expect(service.getOrCreateForUser({ userId: 'user-1' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
    expect(repository.createOrReuseRevenueCatSubscriberIdentity).toHaveBeenCalledTimes(3);
  });

  it(
    'resolves only an exact server-owned RevenueCat identity and fails closed when unknown',
    async () => {
      const owned = identity();
      const repository = {
        createOrReuseRevenueCatSubscriberIdentity: vi.fn(),
        findRevenueCatSubscriberIdentityByAppUserId: vi
          .fn()
          .mockResolvedValueOnce(owned)
          .mockResolvedValueOnce(null),
      };
      const service = createRevenueCatSubscriberIdentityService(repository);

      await expect(service.resolveOwnedUser({ appUserId: owned.appUserId })).resolves.toEqual({
        userId: owned.userId,
        appUserId: owned.appUserId,
      });

      await expect(
        service.resolveOwnedUser({
          appUserId: 'av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    },
  );

  it(
    'rejects client-shaped or malformed RevenueCat identities before database lookup',
    async () => {
      const repository = {
        createOrReuseRevenueCatSubscriberIdentity: vi.fn(),
        findRevenueCatSubscriberIdentityByAppUserId: vi.fn(),
      };
      const service = createRevenueCatSubscriberIdentityService(repository);

      for (const value of [
        'user-1',
        'victor@example.test',
        '$RCAnonymousID:123',
        ' av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA ',
        'av_rc_invalid/value',
      ]) {
        await expect(service.resolveOwnedUser({ appUserId: value })).rejects.toMatchObject({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      expect(repository.findRevenueCatSubscriberIdentityByAppUserId).not.toHaveBeenCalled();
    },
  );
});

describe('RevenueCat subscriber identity repository', () => {
  it('reuses an existing one-to-one user mapping without creating another row', async () => {
    const existing = identity();
    const findUnique = vi.fn(async () => existing);
    const create = vi.fn();
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        revenueCatSubscriberIdentity: { findUnique, create },
      }),
    );

    const result = await repository.createOrReuseRevenueCatSubscriberIdentity({
      userId: 'user-1',
      appUserId: 'av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    });

    expect(result).toEqual({ identity: existing, created: false, collision: false });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates the first server-owned mapping with privacy-minimized fields', async () => {
    const created = identity();
    const findUnique = vi.fn(async () => null);
    const create = vi.fn(async () => created);
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        revenueCatSubscriberIdentity: { findUnique, create },
      }),
    );

    const result = await repository.createOrReuseRevenueCatSubscriberIdentity({
      userId: 'user-1',
      appUserId: created.appUserId,
    });

    expect(result).toEqual({ identity: created, created: true, collision: false });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'user-1',
          appUserId: created.appUserId,
        },
      }),
    );
  });

  it('returns the concurrent winner after a user uniqueness race', async () => {
    const duplicate = Object.assign(new Error('unique conflict'), { code: 'P2002' });
    const existing = identity();
    const findUnique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    const create = vi.fn(async () => {
      throw duplicate;
    });
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        revenueCatSubscriberIdentity: { findUnique, create },
      }),
    );

    const result = await repository.createOrReuseRevenueCatSubscriberIdentity({
      userId: 'user-1',
      appUserId: 'av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    });

    expect(result).toEqual({ identity: existing, created: false, collision: false });
  });

  it('reports an opaque App User ID collision without stealing another mapping', async () => {
    const duplicate = Object.assign(new Error('unique conflict'), { code: 'P2002' });
    const findUnique = vi.fn(async () => null);
    const create = vi.fn(async () => {
      throw duplicate;
    });
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        revenueCatSubscriberIdentity: { findUnique, create },
      }),
    );

    const result = await repository.createOrReuseRevenueCatSubscriberIdentity({
      userId: 'user-1',
      appUserId: 'av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    });

    expect(result).toEqual({ identity: null, created: false, collision: true });
  });

  it('looks up provider ownership only by the unique App User ID', async () => {
    const owned = identity();
    const findUnique = vi.fn(async () => owned);
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        revenueCatSubscriberIdentity: { findUnique },
      }),
    );

    const result = await repository.findRevenueCatSubscriberIdentityByAppUserId({
      appUserId: owned.appUserId,
    });

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { appUserId: owned.appUserId },
      }),
    );
    expect(result).toBe(owned);
  });
});
