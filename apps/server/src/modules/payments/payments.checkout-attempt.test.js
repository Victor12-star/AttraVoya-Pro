import { describe, expect, it, vi } from 'vitest';

import { createPaymentsRepository } from './payments.repository.js';
import { createCheckoutAttemptService } from './payments.checkout-attempt.js';

const NOW = new Date('2026-09-23T20:05:00.000Z');
const EXPIRES_AT = new Date('2026-09-23T20:35:00.000Z');

function attempt(overrides = {}) {
  return {
    id: 'attempt-1',
    userId: 'user-1',
    provider: 'stripe',
    status: 'PENDING',
    activeUserKey: 'user-1',
    externalCheckoutSessionId: null,
    createdAt: NOW,
    updatedAt: NOW,
    expiresAt: EXPIRES_AT,
    plan: {
      id: 'plan-1',
      key: 'PRO_MONTHLY',
      isActive: true,
    },
    ...overrides,
  };
}

function checkoutPolicy() {
  return {
    resolve: vi.fn((planKey) => ({
      planKey,
      priceId: 'price_server_owned',
      quantity: 1,
      successUrl: 'https://example.com/premium?checkout=success',
      cancelUrl: 'https://example.com/premium?checkout=cancelled',
    })),
  };
}

describe('checkout attempt service', () => {
  it('creates a server-owned attempt and derives the future Stripe idempotency key', async () => {
    const repository = {
      createOrReuseCheckoutAttempt: vi.fn(async () => ({
        outcome: 'CREATED',
        attempt: attempt(),
        created: true,
      })),
      bindCheckoutSession: vi.fn(),
    };
    const policy = checkoutPolicy();
    const service = createCheckoutAttemptService({
      repository,
      checkoutPolicy: policy,
      now: () => NOW,
    });

    const result = await service.createOrReuse({
      userId: ' user-1 ',
      planKey: ' PRO_MONTHLY ',
    });

    expect(policy.resolve).toHaveBeenCalledWith('PRO_MONTHLY');
    expect(repository.createOrReuseCheckoutAttempt).toHaveBeenCalledWith({
      userId: 'user-1',
      planKey: 'PRO_MONTHLY',
      provider: 'stripe',
      now: NOW,
      expiresAt: EXPIRES_AT,
    });
    expect(result).toMatchObject({
      created: true,
      duplicate: false,
      idempotencyKey: 'attravoya-checkout-attempt-1',
      attempt: {
        id: 'attempt-1',
        userId: 'user-1',
        status: 'PENDING',
      },
    });
  });

  it('reuses the same-plan active attempt for duplicate clicks', async () => {
    const repository = {
      createOrReuseCheckoutAttempt: vi.fn(async () => ({
        outcome: 'EXISTING',
        attempt: attempt(),
        created: false,
      })),
      bindCheckoutSession: vi.fn(),
    };
    const service = createCheckoutAttemptService({
      repository,
      checkoutPolicy: checkoutPolicy(),
      now: () => NOW,
    });

    const result = await service.createOrReuse({
      userId: 'user-1',
      planKey: 'PRO_MONTHLY',
    });

    expect(result).toMatchObject({
      created: false,
      duplicate: true,
      idempotencyKey: 'attravoya-checkout-attempt-1',
    });
  });

  it('fails closed when another plan already owns the active attempt', async () => {
    const repository = {
      createOrReuseCheckoutAttempt: vi.fn(async () => ({
        outcome: 'EXISTING',
        attempt: attempt({
          plan: { id: 'plan-2', key: 'PRO_YEARLY', isActive: true },
        }),
        created: false,
      })),
      bindCheckoutSession: vi.fn(),
    };
    const service = createCheckoutAttemptService({
      repository,
      checkoutPolicy: checkoutPolicy(),
      now: () => NOW,
    });

    await expect(
      service.createOrReuse({
        userId: 'user-1',
        planKey: 'PRO_MONTHLY',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('checks server purchase policy before creating checkout ownership', async () => {
    const repository = {
      createOrReuseCheckoutAttempt: vi.fn(),
      bindCheckoutSession: vi.fn(),
    };
    const policyError = new Error('purchase disabled');
    const policy = {
      resolve: vi.fn(() => {
        throw policyError;
      }),
    };
    const service = createCheckoutAttemptService({
      repository,
      checkoutPolicy: policy,
      now: () => NOW,
    });

    await expect(
      service.createOrReuse({
        userId: 'user-1',
        planKey: 'PRO_MONTHLY',
      }),
    ).rejects.toBe(policyError);

    expect(repository.createOrReuseCheckoutAttempt).not.toHaveBeenCalled();
  });

  it(
    'binds a trusted Stripe Checkout Session once and treats exact retry as idempotent',
    async () => {
      const firstAttempt = attempt({
        status: 'SESSION_CREATED',
        externalCheckoutSessionId: 'cs_test_123',
      });
      const repository = {
        createOrReuseCheckoutAttempt: vi.fn(),
        bindCheckoutSession: vi
          .fn()
          .mockResolvedValueOnce({
            attempt: firstAttempt,
            transitioned: true,
          })
          .mockResolvedValueOnce({
            attempt: firstAttempt,
            transitioned: false,
          }),
      };
      const service = createCheckoutAttemptService({
        repository,
        checkoutPolicy: checkoutPolicy(),
        now: () => NOW,
      });

      const first = await service.bindStripeSession({
        userId: 'user-1',
        attemptId: 'attempt-1',
        externalCheckoutSessionId: 'cs_test_123',
      });
      const retry = await service.bindStripeSession({
        userId: 'user-1',
        attemptId: 'attempt-1',
        externalCheckoutSessionId: 'cs_test_123',
      });

      expect(first.duplicate).toBe(false);
      expect(retry.duplicate).toBe(true);
    },
  );

  it('rejects invalid or conflicting Stripe Checkout Session identity', async () => {
    const repository = {
      createOrReuseCheckoutAttempt: vi.fn(),
      bindCheckoutSession: vi.fn(async () => ({
        attempt: null,
        transitioned: false,
        providerIdentityConflict: true,
      })),
    };
    const service = createCheckoutAttemptService({
      repository,
      checkoutPolicy: checkoutPolicy(),
      now: () => NOW,
    });

    await expect(
      service.bindStripeSession({
        userId: 'user-1',
        attemptId: 'attempt-1',
        externalCheckoutSessionId: 'not-a-stripe-session',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });

    await expect(
      service.bindStripeSession({
        userId: 'user-1',
        attemptId: 'attempt-1',
        externalCheckoutSessionId: 'cs_test_conflict',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});

describe('checkout attempt repository', () => {
  it('expires an old active attempt before creating a new one', async () => {
    const planFindUnique = vi.fn(async () => ({
      id: 'plan-1',
      key: 'PRO_MONTHLY',
      isActive: true,
    }));
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const findUnique = vi.fn(async () => null);
    const create = vi.fn(async () => attempt());
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        plan: { findUnique: planFindUnique },
        checkoutAttempt: {
          updateMany,
          findUnique,
          create,
        },
      }),
    );

    const result = await repository.createOrReuseCheckoutAttempt({
      userId: 'user-1',
      planKey: 'PRO_MONTHLY',
      provider: 'stripe',
      now: NOW,
      expiresAt: EXPIRES_AT,
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        activeUserKey: 'user-1',
        status: { in: ['PENDING', 'SESSION_CREATED'] },
        expiresAt: { lte: NOW },
      },
      data: {
        status: 'EXPIRED',
        activeUserKey: null,
      },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'user-1',
          planId: 'plan-1',
          provider: 'stripe',
          activeUserKey: 'user-1',
          expiresAt: EXPIRES_AT,
        },
      }),
    );
    expect(result).toMatchObject({ outcome: 'CREATED', created: true });
  });

  it('returns the concurrent winner after an active-user uniqueness race', async () => {
    const duplicateError = Object.assign(new Error('unique conflict'), { code: 'P2002' });
    const winner = attempt();
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        plan: {
          findUnique: vi.fn(async () => ({
            id: 'plan-1',
            key: 'PRO_MONTHLY',
            isActive: true,
          })),
        },
        checkoutAttempt: {
          updateMany: vi.fn(async () => ({ count: 0 })),
          findUnique: vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(winner),
          create: vi.fn(async () => {
            throw duplicateError;
          }),
        },
      }),
    );

    const result = await repository.createOrReuseCheckoutAttempt({
      userId: 'user-1',
      planKey: 'PRO_MONTHLY',
      provider: 'stripe',
      now: NOW,
      expiresAt: EXPIRES_AT,
    });

    expect(result).toMatchObject({
      outcome: 'EXISTING',
      created: false,
      attempt: { id: 'attempt-1' },
    });
  });

  it('binds a provider session only while the owned attempt is pending', async () => {
    const bound = attempt({
      status: 'SESSION_CREATED',
      externalCheckoutSessionId: 'cs_test_123',
    });
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        checkoutAttempt: {
          updateMany,
          findUnique: vi.fn(async () => bound),
        },
      }),
    );

    const result = await repository.bindCheckoutSession({
      attemptId: 'attempt-1',
      userId: 'user-1',
      provider: 'stripe',
      externalCheckoutSessionId: 'cs_test_123',
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'attempt-1',
        userId: 'user-1',
        provider: 'stripe',
        status: 'PENDING',
        activeUserKey: 'user-1',
        externalCheckoutSessionId: null,
      },
      data: {
        status: 'SESSION_CREATED',
        externalCheckoutSessionId: 'cs_test_123',
      },
    });
    expect(result).toMatchObject({
      transitioned: true,
      attempt: { status: 'SESSION_CREATED' },
    });
  });
});
