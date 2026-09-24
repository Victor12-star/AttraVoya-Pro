import { PLANS } from '@attravoya/constants';
import { describe, expect, it } from 'vitest';

import { createRevenueCatAndroidProductPolicy } from './payments.revenuecat-product-policy.js';
import { normalizeVerifiedRevenueCatAndroidLifecycle } from './payments.revenuecat-subscription.js';
import { createBillingVerificationBoundary } from './payments.verification.js';

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
    id: 'evt_rc_1',
    type: 'INITIAL_PURCHASE',
    event_timestamp_ms: 1_780_000_000_000,
    product_id: 'attravoya_pro_v1:monthly-autorenewing',
    period_type: 'TRIAL',
    purchased_at_ms: 1_779_999_000_000,
    expiration_at_ms: 1_780_603_800_000,
    environment: 'PRODUCTION',
    transaction_id: 'GPA.1111-2222-3333-44444',
    original_transaction_id: 'GPA.1111-2222-3333-44444',
    store: 'PLAY_STORE',
    app_user_id: 'untrusted-client-identity',
    original_app_user_id: 'also-untrusted',
    aliases: ['alias-that-must-not-become-ownership'],
    entitlement_ids: ['pro'],
    ...overrides,
  };

  return Buffer.from(JSON.stringify({ api_version: '1.0', event }));
}

async function verifiedEvidence(rawPayload) {
  const parsed = JSON.parse(rawPayload.toString('utf8')).event;
  const boundary = createBillingVerificationBoundary({
    provider: 'revenuecat',
    now: () => new Date('2026-09-24T18:00:00.000Z'),
    verify: async () => ({
      externalEventId: parsed.id,
      eventType: parsed.type,
      occurredAt: new Date(parsed.event_timestamp_ms),
    }),
  });

  return boundary.verifyEvent({ rawPayload, headers: {} });
}

describe('RevenueCat Android lifecycle normalization', () => {
  it('normalizes only verified Google Play lifecycle data to a server-owned plan', async () => {
    const rawPayload = payload();
    const evidence = await verifiedEvidence(rawPayload);

    const normalized = normalizeVerifiedRevenueCatAndroidLifecycle({
      rawPayload,
      evidence,
      productPolicy: productPolicy(),
    });

    expect(normalized).toEqual({
      provider: 'revenuecat',
      store: 'PLAY_STORE',
      environment: 'PRODUCTION',
      externalSubscriptionId: 'GPA.1111-2222-3333-44444',
      planKey: PLANS.PRO_MONTHLY,
      eventType: 'INITIAL_PURCHASE',
      periodType: 'TRIAL',
      purchasedAt: new Date(1_779_999_000_000),
      expiresAt: new Date(1_780_603_800_000),
      providerStateUpdatedAt: new Date(1_780_000_000_000),
    });
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(normalized).not.toHaveProperty('appUserId');
    expect(normalized).not.toHaveProperty('aliases');
    expect(normalized).not.toHaveProperty('entitlementIds');
    expect(normalized).not.toHaveProperty('transactionId');
  });

  it('rejects plain evidence even when its fields look verified', () => {
    const rawPayload = payload();

    expect(() =>
      normalizeVerifiedRevenueCatAndroidLifecycle({
        rawPayload,
        evidence: {
          provider: 'revenuecat',
          externalEventId: 'evt_rc_1',
          eventType: 'INITIAL_PURCHASE',
          occurredAt: new Date(1_780_000_000_000),
        },
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat normalization requires verified billing evidence.');
  });

  it('fails closed when exact verified payload bytes are changed', async () => {
    const original = payload();
    const evidence = await verifiedEvidence(original);
    const changedProduct = payload({ product_id: 'attravoya_pro_v1:yearly-autorenewing' });

    expect(() =>
      normalizeVerifiedRevenueCatAndroidLifecycle({
        rawPayload: changedProduct,
        evidence,
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat verified payload does not match exact request bytes.');
  });

  it('fails closed when verified identity and exact payload disagree', async () => {
    const original = payload();
    const evidence = await verifiedEvidence(original);
    const changed = payload({ id: 'evt_rc_changed' });

    expect(() =>
      normalizeVerifiedRevenueCatAndroidLifecycle({
        rawPayload: changed,
        evidence,
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat verified payload does not match exact request bytes.');
  });

  it('rejects non-Google-Play events and unknown products', async () => {
    const appStorePayload = payload({ store: 'APP_STORE' });
    const appStoreEvidence = await verifiedEvidence(appStorePayload);

    expect(() =>
      normalizeVerifiedRevenueCatAndroidLifecycle({
        rawPayload: appStorePayload,
        evidence: appStoreEvidence,
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat lifecycle event is not from Google Play.');

    const unknownProductPayload = payload({ product_id: 'attravoya_pro_v1:weekly' });
    const unknownProductEvidence = await verifiedEvidence(unknownProductPayload);

    expect(() =>
      normalizeVerifiedRevenueCatAndroidLifecycle({
        rawPayload: unknownProductPayload,
        evidence: unknownProductEvidence,
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat product is not supported.');
  });

  it('accepts supported lifecycle types without converting cancellation into entitlement loss', async () => {
    for (const eventType of [
      'RENEWAL',
      'CANCELLATION',
      'UNCANCELLATION',
      'BILLING_ISSUE',
      'EXPIRATION',
      'SUBSCRIPTION_PAUSED',
      'SUBSCRIPTION_EXTENDED',
    ]) {
      const rawPayload = payload({ type: eventType, period_type: 'NORMAL' });
      const evidence = await verifiedEvidence(rawPayload);

      const normalized = normalizeVerifiedRevenueCatAndroidLifecycle({
        rawPayload,
        evidence,
        productPolicy: productPolicy(),
      });

      expect(normalized.eventType).toBe(eventType);
      expect(normalized).not.toHaveProperty('status');
    }
  });

  it('rejects unsupported event types and malformed lifecycle timestamps', async () => {
    const unsupported = payload({ type: 'TRANSFER' });
    const unsupportedEvidence = await verifiedEvidence(unsupported);

    expect(() =>
      normalizeVerifiedRevenueCatAndroidLifecycle({
        rawPayload: unsupported,
        evidence: unsupportedEvidence,
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat lifecycle event type is unsupported.');

    const malformed = payload({ purchased_at_ms: -1 });
    const malformedEvidence = await verifiedEvidence(malformed);

    expect(() =>
      normalizeVerifiedRevenueCatAndroidLifecycle({
        rawPayload: malformed,
        evidence: malformedEvidence,
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat purchase time is invalid.');
  });
});
