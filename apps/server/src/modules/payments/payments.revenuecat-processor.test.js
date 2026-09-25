import { PLANS } from '@attravoya/constants';
import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../errors/app-error.js';
import { createRevenueCatSubscriptionEventProcessor } from './payments.revenuecat-processor.js';
import { createRevenueCatAndroidProductPolicy } from './payments.revenuecat-product-policy.js';
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
    id: 'evt_rc_processor_1',
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
    original_app_user_id: OWNED_ID,
    aliases: [OWNED_ID],
    ...overrides,
  };

  return Buffer.from(JSON.stringify({ api_version: '1.0', event }));
}

async function evidenceFor(rawPayload) {
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

function dependencies() {
  const event = {
    id: 'billing-event-1',
    processingStatus: 'PENDING',
  };
  const subscription = {
    id: 'subscription-1',
    userId: 'user-1',
    status: 'PENDING',
    provider: 'revenuecat',
    externalSubscriptionId: 'GPA.1111-2222-3333-44444',
  };

  const paymentsService = {
    recordVerifiedEvent: vi.fn(async () => ({
      event,
      duplicate: false,
    })),
    finalizeVerifiedEvent: vi.fn(async ({ outcome, failureCode = null }) => ({
      event: {
        ...event,
        processingStatus: outcome,
        failureCode,
      },
      duplicate: false,
    })),
    applyVerifiedSubscriptionState: vi.fn(async () => ({
      applied: true,
      duplicate: false,
      stale: false,
      event: {
        ...event,
        processingStatus: 'APPLIED',
      },
      subscription: {
        ...subscription,
        status: 'ACTIVE',
      },
    })),
  };

  const ownershipRepository = {
    createOrReuseProviderSubscriptionOwnership: vi.fn(async () => ({
      outcome: 'EXISTING',
      subscription,
      created: false,
    })),
  };

  const subscriberIdentityService = {
    resolveOwnedUser: vi.fn(async ({ appUserId }) => ({
      userId: 'user-1',
      appUserId,
    })),
  };

  const verificationBoundary = {
    verifyEvent: vi.fn(async ({ rawPayload }) => evidenceFor(rawPayload)),
  };

  return {
    verificationBoundary,
    paymentsService,
    ownershipRepository,
    subscriberIdentityService,
  };
}

function processor(overrides = {}) {
  const deps = dependencies();
  const instance = createRevenueCatSubscriptionEventProcessor({
    ...deps,
    productPolicy: productPolicy(),
    ...overrides,
  });

  return { instance, deps };
}

describe('RevenueCat subscription event processor', () => {
  it('applies verified production access state through established server ownership', async () => {
    const { instance, deps } = processor();
    const rawPayload = payload();
    const result = await instance.process({ rawPayload });

    expect(result.outcome).toBe('APPLIED');
    expect(deps.paymentsService.recordVerifiedEvent).toHaveBeenCalledTimes(1);
    expect(
      deps.ownershipRepository.createOrReuseProviderSubscriptionOwnership,
    ).toHaveBeenCalledWith({
      userId: 'user-1',
      planKey: PLANS.PRO_MONTHLY,
      provider: 'revenuecat',
      externalSubscriptionId: 'GPA.1111-2222-3333-44444',
    });
    expect(deps.paymentsService.applyVerifiedSubscriptionState).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      subscriptionId: 'subscription-1',
      provider: 'revenuecat',
      status: 'ACTIVE',
      currentPeriodEnd: new Date(1_780_603_800_000),
      canceledAt: null,
      providerStateUpdatedAt: new Date(1_780_000_000_000),
    });
  });

  it('terminalizes ordinary cancellation without mutating entitlement state', async () => {
    const { instance, deps } = processor();
    const result = await instance.process({
      rawPayload: payload({
        type: 'CANCELLATION',
        cancel_reason: 'UNSUBSCRIBE',
      }),
    });

    expect(result.outcome).toBe('IGNORED');
    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'IGNORED',
    });
    expect(
      deps.ownershipRepository.createOrReuseProviderSubscriptionOwnership,
    ).not.toHaveBeenCalled();
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('applies immediate non-entitling state for a verified Google Play refund', async () => {
    const { instance, deps } = processor();
    deps.paymentsService.applyVerifiedSubscriptionState.mockResolvedValueOnce({
      applied: true,
      duplicate: false,
      stale: false,
      event: { id: 'billing-event-1', processingStatus: 'APPLIED' },
      subscription: { id: 'subscription-1', status: 'CANCELED' },
    });

    const result = await instance.process({
      rawPayload: payload({
        type: 'CANCELLATION',
        cancel_reason: 'CUSTOMER_SUPPORT',
      }),
    });

    expect(result.outcome).toBe('APPLIED');
    expect(deps.paymentsService.applyVerifiedSubscriptionState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'CANCELED',
        canceledAt: new Date(1_780_000_000_000),
      }),
    );
  });

  it('ignores sandbox and unrelated verified RevenueCat events without ownership writes', async () => {
    const { instance, deps } = processor();

    const sandbox = await instance.process({
      rawPayload: payload({ environment: 'SANDBOX' }),
    });
    expect(sandbox.outcome).toBe('IGNORED');

    const transferPayload = payload({
      id: 'evt_rc_processor_transfer',
      type: 'TRANSFER',
    });
    const transfer = await instance.process({ rawPayload: transferPayload });
    expect(transfer.outcome).toBe('IGNORED');

    expect(
      deps.ownershipRepository.createOrReuseProviderSubscriptionOwnership,
    ).not.toHaveBeenCalled();
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('terminalizes malformed verified lifecycle data with a privacy-safe failure code', async () => {
    const { instance, deps } = processor();

    const result = await instance.process({
      rawPayload: payload({
        type: 'CANCELLATION',
        cancel_reason: undefined,
      }),
    });

    expect(result).toMatchObject({
      outcome: 'FAILED',
      failureCode: 'REVENUECAT_LIFECYCLE_INVALID',
    });
    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'FAILED',
      failureCode: 'REVENUECAT_LIFECYCLE_INVALID',
    });
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('terminalizes unresolved verified subscriber ownership without granting access', async () => {
    const { instance, deps } = processor({
      subscriberIdentityService: {
        resolveOwnedUser: vi.fn(async () => {
          throw new NotFoundError('RevenueCat subscriber identity was not found.');
        }),
      },
    });

    const result = await instance.process({ rawPayload: payload() });

    expect(result).toMatchObject({
      outcome: 'FAILED',
      failureCode: 'REVENUECAT_OWNERSHIP_UNRESOLVED',
    });
    expect(deps.paymentsService.finalizeVerifiedEvent).toHaveBeenCalledWith({
      eventId: 'billing-event-1',
      outcome: 'FAILED',
      failureCode: 'REVENUECAT_OWNERSHIP_UNRESOLVED',
    });
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });

  it('keeps exact-byte identity mismatches pending for investigation instead of terminalizing them', async () => {
    const { instance, deps } = processor();
    const original = payload();
    const evidence = await evidenceFor(original);
    const changed = payload({ period_type: 'TRIAL' });

    await expect(
      instance.processVerified({
        rawPayload: changed,
        evidence,
      }),
    ).rejects.toThrow('RevenueCat verified payload does not match exact request bytes.');

    expect(deps.paymentsService.recordVerifiedEvent).toHaveBeenCalledTimes(1);
    expect(deps.paymentsService.finalizeVerifiedEvent).not.toHaveBeenCalled();
    expect(deps.paymentsService.applyVerifiedSubscriptionState).not.toHaveBeenCalled();
  });
});
