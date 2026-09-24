import { PLANS } from '@attravoya/constants';
import { describe, expect, it, vi } from 'vitest';

import { createPaymentsRepository } from './payments.repository.js';
import { createRevenueCatAndroidProductPolicy } from './payments.revenuecat-product-policy.js';
import {
  establishVerifiedRevenueCatAndroidSubscriptionOwnership,
} from './payments.revenuecat-subscription-ownership.js';
import { createBillingVerificationBoundary } from './payments.verification.js';

const OWNED_ID = 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function productPolicy() {
  return createRevenueCatAndroidProductPolicy({
    productIds: {
      [PLANS.PRO_MONTHLY]: 'attravoya_pro_v1:monthly-autorenewing',
      [PLANS.PRO_YEARLY]: 'attravoya_pro_v1:yearly-autorenewing',
    },
  });
}

function payload(overrides = {}) {
  const event = {
    id: 'evt_rc_subscription_owner_1',
    type: 'INITIAL_PURCHASE',
    event_timestamp_ms: 1_780_000_000_000,
    product_id: 'attravoya_pro_v1:monthly-autorenewing',
    period_type: 'NORMAL',
    purchased_at_ms: 1_779_999_000_000,
    expiration_at_ms: 1_780_603_800_000,
    environment: 'PRODUCTION',
    original_transaction_id: 'GPA.1111-2222-3333-44444',
    store: 'PLAY_STORE',
    app_user_id: OWNED_ID,
    original_app_user_id: '$RCAnonymousID:original',
    aliases: ['$RCAnonymousID:original', OWNED_ID],
    ...overrides,
  };

  return Buffer.from(JSON.stringify({ api_version: '1.0', event }));
}

async function verifiedEvidence(rawPayload) {
  const event = JSON.parse(rawPayload.toString('utf8')).event;
  return createBillingVerificationBoundary({
    provider: 'revenuecat',
    verify: async () => ({
      externalEventId: event.id,
      eventType: event.type,
      occurredAt: new Date(event.event_timestamp_ms),
    }),
  }).verifyEvent({ rawPayload });
}

function identityService() {
  return {
    resolveOwnedUser: vi.fn(async ({ appUserId }) => ({
      userId: 'user-1',
      appUserId,
    })),
  };
}

function pendingSubscription(overrides = {}) {
  return {
    id: 'subscription-rc-1',
    userId: 'user-1',
    planId: 'plan-pro-monthly',
    status: 'PENDING',
    provider: 'revenuecat',
    externalCustomerId: null,
    externalSubscriptionId: 'GPA.1111-2222-3333-44444',
    currentPeriodEnd: null,
    providerStateUpdatedAt: null,
    canceledAt: null,
    ...overrides,
  };
}

describe('verified RevenueCat provider subscription ownership', () => {
  it('creates only non-entitling pending ownership after the full verified chain', async () => {
    const rawPayload = payload();
    const evidence = await verifiedEvidence(rawPayload);
    const repository = {
      createOrReuseProviderSubscriptionOwnership: vi.fn(async () => ({
        outcome: 'CREATED',
        subscription: pendingSubscription(),
        created: true,
      })),
    };

    const result = await establishVerifiedRevenueCatAndroidSubscriptionOwnership({
      rawPayload,
      evidence,
      productPolicy: productPolicy(),
      subscriberIdentityService: identityService(),
      repository,
    });

    expect(repository.createOrReuseProviderSubscriptionOwnership).toHaveBeenCalledWith({
      userId: 'user-1',
      planKey: PLANS.PRO_MONTHLY,
      provider: 'revenuecat',
      externalSubscriptionId: 'GPA.1111-2222-3333-44444',
    });
    expect(result.created).toBe(true);
    expect(result.subscription.status).toBe('PENDING');
    expect(result.ownership.lifecycle.planKey).toBe(PLANS.PRO_MONTHLY);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('reuses an exact existing provider ownership without resetting its state', async () => {
    const rawPayload = payload();
    const evidence = await verifiedEvidence(rawPayload);
    const existing = pendingSubscription({
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-10-24T00:00:00.000Z'),
    });
    const repository = {
      createOrReuseProviderSubscriptionOwnership: vi.fn(async () => ({
        outcome: 'EXISTING',
        subscription: existing,
        created: false,
      })),
    };

    const result = await establishVerifiedRevenueCatAndroidSubscriptionOwnership({
      rawPayload,
      evidence,
      productPolicy: productPolicy(),
      subscriberIdentityService: identityService(),
      repository,
    });

    expect(result.created).toBe(false);
    expect(result.subscription).toBe(existing);
    expect(result.subscription.status).toBe('ACTIVE');
  });

  it('rejects forged evidence before any subscription write', async () => {
    const repository = {
      createOrReuseProviderSubscriptionOwnership: vi.fn(),
    };

    await expect(
      establishVerifiedRevenueCatAndroidSubscriptionOwnership({
        rawPayload: payload(),
        evidence: {
          provider: 'revenuecat',
          externalEventId: 'evt_rc_subscription_owner_1',
          eventType: 'INITIAL_PURCHASE',
        },
        productPolicy: productPolicy(),
        subscriberIdentityService: identityService(),
        repository,
      }),
    ).rejects.toThrow('RevenueCat normalization requires verified billing evidence.');

    expect(repository.createOrReuseProviderSubscriptionOwnership).not.toHaveBeenCalled();
  });

  it('fails closed for unavailable plans and provider identity conflicts', async () => {
    const rawPayload = payload();
    const evidence = await verifiedEvidence(rawPayload);

    for (const outcome of ['PLAN_NOT_ACTIVE', 'PROVIDER_IDENTITY_CONFLICT']) {
      const repository = {
        createOrReuseProviderSubscriptionOwnership: vi.fn(async () => ({
          outcome,
          subscription: null,
          created: false,
        })),
      };

      await expect(
        establishVerifiedRevenueCatAndroidSubscriptionOwnership({
          rawPayload,
          evidence,
          productPolicy: productPolicy(),
          subscriberIdentityService: identityService(),
          repository,
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    }
  });

  it('rejects a repository result that would create immediate entitlement state', async () => {
    const rawPayload = payload();
    const evidence = await verifiedEvidence(rawPayload);
    const repository = {
      createOrReuseProviderSubscriptionOwnership: vi.fn(async () => ({
        outcome: 'CREATED',
        subscription: pendingSubscription({ status: 'ACTIVE' }),
        created: true,
      })),
    };

    await expect(
      establishVerifiedRevenueCatAndroidSubscriptionOwnership({
        rawPayload,
        evidence,
        productPolicy: productPolicy(),
        subscriberIdentityService: identityService(),
        repository,
      }),
    ).rejects.toThrow('RevenueCat subscription ownership must begin as pending.');
  });
});

describe('provider subscription ownership repository', () => {
  it('creates an explicit pending subscription for an active internal plan', async () => {
    const created = pendingSubscription();
    const planFindUnique = vi.fn(async () => ({
      id: 'plan-pro-monthly',
      key: PLANS.PRO_MONTHLY,
      isActive: true,
    }));
    const subscriptionFindUnique = vi.fn(async () => null);
    const subscriptionCreate = vi.fn(async () => created);
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        plan: { findUnique: planFindUnique },
        subscription: {
          findUnique: subscriptionFindUnique,
          create: subscriptionCreate,
        },
      }),
    );

    const result = await repository.createOrReuseProviderSubscriptionOwnership({
      userId: 'user-1',
      planKey: PLANS.PRO_MONTHLY,
      provider: 'revenuecat',
      externalSubscriptionId: 'GPA.1111-2222-3333-44444',
    });

    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'user-1',
          planId: 'plan-pro-monthly',
          status: 'PENDING',
          provider: 'revenuecat',
          externalSubscriptionId: 'GPA.1111-2222-3333-44444',
        },
      }),
    );
    expect(result).toEqual({
      outcome: 'CREATED',
      subscription: created,
      created: true,
    });
  });

  it('reuses only the same user and plan for an existing provider identity', async () => {
    const existing = pendingSubscription();
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        plan: {
          findUnique: vi.fn(async () => ({
            id: 'plan-pro-monthly',
            key: PLANS.PRO_MONTHLY,
            isActive: true,
          })),
        },
        subscription: {
          findUnique: vi.fn(async () => existing),
          create: vi.fn(),
        },
      }),
    );

    await expect(
      repository.createOrReuseProviderSubscriptionOwnership({
        userId: 'user-1',
        planKey: PLANS.PRO_MONTHLY,
        provider: 'revenuecat',
        externalSubscriptionId: existing.externalSubscriptionId,
      }),
    ).resolves.toMatchObject({ outcome: 'EXISTING', created: false });

    const conflicting = await repository.createOrReuseProviderSubscriptionOwnership({
      userId: 'user-2',
      planKey: PLANS.PRO_MONTHLY,
      provider: 'revenuecat',
      externalSubscriptionId: existing.externalSubscriptionId,
    });

    expect(conflicting).toMatchObject({
      outcome: 'PROVIDER_IDENTITY_CONFLICT',
      created: false,
    });
  });

  it('reuses exact existing ownership even when the internal plan is later inactive', async () => {
    const existing = pendingSubscription({ status: 'ACTIVE' });
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        plan: {
          findUnique: vi.fn(async () => ({
            id: 'plan-pro-monthly',
            key: PLANS.PRO_MONTHLY,
            isActive: false,
          })),
        },
        subscription: {
          findUnique: vi.fn(async () => existing),
          create: vi.fn(),
        },
      }),
    );

    const result = await repository.createOrReuseProviderSubscriptionOwnership({
      userId: 'user-1',
      planKey: PLANS.PRO_MONTHLY,
      provider: 'revenuecat',
      externalSubscriptionId: existing.externalSubscriptionId,
    });

    expect(result).toMatchObject({
      outcome: 'EXISTING',
      subscription: existing,
      created: false,
    });
  });

  it('returns the concurrent winner only when ownership still matches', async () => {
    const duplicate = Object.assign(new Error('unique conflict'), { code: 'P2002' });
    const winner = pendingSubscription();
    const findUnique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        plan: {
          findUnique: vi.fn(async () => ({
            id: 'plan-pro-monthly',
            key: PLANS.PRO_MONTHLY,
            isActive: true,
          })),
        },
        subscription: {
          findUnique,
          create: vi.fn(async () => {
            throw duplicate;
          }),
        },
      }),
    );

    const result = await repository.createOrReuseProviderSubscriptionOwnership({
      userId: 'user-1',
      planKey: PLANS.PRO_MONTHLY,
      provider: 'revenuecat',
      externalSubscriptionId: winner.externalSubscriptionId,
    });

    expect(result).toMatchObject({ outcome: 'EXISTING', created: false });
  });

  it('does not create ownership for an inactive or missing internal plan', async () => {
    const subscriptionCreate = vi.fn();
    const repository = createPaymentsRepository(
      /** @type {any} */ ({
        plan: { findUnique: vi.fn(async () => null) },
        subscription: {
          findUnique: vi.fn(),
          create: subscriptionCreate,
        },
      }),
    );

    const result = await repository.createOrReuseProviderSubscriptionOwnership({
      userId: 'user-1',
      planKey: PLANS.PRO_MONTHLY,
      provider: 'revenuecat',
      externalSubscriptionId: 'GPA.1111-2222-3333-44444',
    });

    expect(result).toEqual({
      outcome: 'PLAN_NOT_ACTIVE',
      subscription: null,
      created: false,
    });
    expect(subscriptionCreate).not.toHaveBeenCalled();
  });
});
