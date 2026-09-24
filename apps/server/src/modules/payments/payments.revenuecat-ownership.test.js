import { PLANS } from '@attravoya/constants';
import { describe, expect, it, vi } from 'vitest';

import { createRevenueCatAndroidProductPolicy } from './payments.revenuecat-product-policy.js';
import { resolveVerifiedRevenueCatAndroidOwnership } from './payments.revenuecat-ownership.js';
import { createBillingVerificationBoundary } from './payments.verification.js';

const OWNED_ID = 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const OTHER_OWNED_ID = 'av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

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
    id: 'evt_rc_owner_1',
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

describe('verified RevenueCat Android ownership resolution', () => {
  it('resolves one server-owned identity across original ID and aliases', async () => {
    const rawPayload = payload();
    const evidence = await verifiedEvidence(rawPayload);
    const service = identityService();

    const result = await resolveVerifiedRevenueCatAndroidOwnership({
      rawPayload,
      evidence,
      productPolicy: productPolicy(),
      subscriberIdentityService: service,
    });

    expect(result.owner).toEqual({ userId: 'user-1', appUserId: OWNED_ID });
    expect(result.lifecycle.externalSubscriptionId).toBe('GPA.1111-2222-3333-44444');
    expect(result.lifecycle.planKey).toBe(PLANS.PRO_MONTHLY);
    expect(service.resolveOwnedUser).toHaveBeenCalledWith({ appUserId: OWNED_ID });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('accepts the server-owned identity when RevenueCat reports it only as an alias', async () => {
    const rawPayload = payload({
      app_user_id: '$RCAnonymousID:last-seen',
      original_app_user_id: '$RCAnonymousID:original',
      aliases: ['$RCAnonymousID:original', OWNED_ID],
    });
    const evidence = await verifiedEvidence(rawPayload);
    const service = identityService();

    const result = await resolveVerifiedRevenueCatAndroidOwnership({
      rawPayload,
      evidence,
      productPolicy: productPolicy(),
      subscriberIdentityService: service,
    });

    expect(result.owner.appUserId).toBe(OWNED_ID);
  });

  it('fails closed when no server-owned subscriber identity is present', async () => {
    const rawPayload = payload({
      app_user_id: '$RCAnonymousID:last-seen',
      original_app_user_id: '$RCAnonymousID:original',
      aliases: ['$RCAnonymousID:original', 'client-chosen-id'],
    });
    const evidence = await verifiedEvidence(rawPayload);
    const service = identityService();

    await expect(
      resolveVerifiedRevenueCatAndroidOwnership({
        rawPayload,
        evidence,
        productPolicy: productPolicy(),
        subscriberIdentityService: service,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(service.resolveOwnedUser).not.toHaveBeenCalled();
  });

  it('fails closed when verified aliases contain two server-owned identities', async () => {
    const rawPayload = payload({
      app_user_id: OWNED_ID,
      original_app_user_id: OWNED_ID,
      aliases: [OWNED_ID, OTHER_OWNED_ID],
    });
    const evidence = await verifiedEvidence(rawPayload);
    const service = identityService();

    await expect(
      resolveVerifiedRevenueCatAndroidOwnership({
        rawPayload,
        evidence,
        productPolicy: productPolicy(),
        subscriberIdentityService: service,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    expect(service.resolveOwnedUser).not.toHaveBeenCalled();
  });

  it('rejects malformed subscriber identity fields after lifecycle verification', async () => {
    const rawPayload = payload({ aliases: 'not-an-array' });
    const evidence = await verifiedEvidence(rawPayload);

    await expect(
      resolveVerifiedRevenueCatAndroidOwnership({
        rawPayload,
        evidence,
        productPolicy: productPolicy(),
        subscriberIdentityService: identityService(),
      }),
    ).rejects.toThrow('RevenueCat aliases are invalid.');
  });

  it('rejects forged evidence before subscriber identity lookup', async () => {
    const service = identityService();

    await expect(
      resolveVerifiedRevenueCatAndroidOwnership({
        rawPayload: payload(),
        evidence: {
          provider: 'revenuecat',
          externalEventId: 'evt_rc_owner_1',
          eventType: 'INITIAL_PURCHASE',
        },
        productPolicy: productPolicy(),
        subscriberIdentityService: service,
      }),
    ).rejects.toThrow('RevenueCat normalization requires verified billing evidence.');

    expect(service.resolveOwnedUser).not.toHaveBeenCalled();
  });
});
