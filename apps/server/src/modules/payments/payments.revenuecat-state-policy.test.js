import { PLANS } from '@attravoya/constants';
import { describe, expect, it } from 'vitest';

import { createRevenueCatAndroidProductPolicy } from './payments.revenuecat-product-policy.js';
import { mapVerifiedRevenueCatAndroidState } from './payments.revenuecat-state-policy.js';
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
    id: 'evt_rc_state_1',
    type: 'INITIAL_PURCHASE',
    event_timestamp_ms: 1_780_000_000_000,
    product_id: 'attravoya_pro_v1:monthly-autorenewing',
    period_type: 'TRIAL',
    purchased_at_ms: 1_779_999_000_000,
    expiration_at_ms: 1_780_603_800_000,
    environment: 'PRODUCTION',
    original_transaction_id: 'GPA.1111-2222-3333-44444',
    store: 'PLAY_STORE',
    app_user_id: 'untrusted-client-identity',
    ...overrides,
  };

  return Buffer.from(JSON.stringify({ api_version: '1.0', event }));
}

async function evidenceFor(rawPayload) {
  const event = JSON.parse(rawPayload.toString('utf8')).event;
  const boundary = createBillingVerificationBoundary({
    provider: 'revenuecat',
    now: () => new Date('2026-09-24T21:30:00.000Z'),
    verify: async () => ({
      externalEventId: event.id,
      eventType: event.type,
      occurredAt: new Date(event.event_timestamp_ms),
    }),
  });

  return boundary.verifyEvent({ rawPayload });
}

async function decision(overrides = {}) {
  const rawPayload = payload(overrides);
  const evidence = await evidenceFor(rawPayload);

  return mapVerifiedRevenueCatAndroidState({
    rawPayload,
    evidence,
    productPolicy: productPolicy(),
  });
}

describe('RevenueCat Android subscription state policy', () => {
  it('maps a verified production trial purchase to TRIALING', async () => {
    const result = await decision();

    expect(result.action).toBe('APPLY');
    expect(result.reason).toBeNull();
    expect(result.state).toEqual({
      provider: 'revenuecat',
      externalSubscriptionId: 'GPA.1111-2222-3333-44444',
      status: 'TRIALING',
      currentPeriodEnd: new Date(1_780_603_800_000),
      canceledAt: null,
      providerStateUpdatedAt: new Date(1_780_000_000_000),
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.state)).toBe(true);
  });

  it('maps paid access-establishing lifecycle events to ACTIVE', async () => {
    for (const eventType of [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'UNCANCELLATION',
      'SUBSCRIPTION_EXTENDED',
    ]) {
      const result = await decision({
        type: eventType,
        period_type: 'NORMAL',
      });

      expect(result.action).toBe('APPLY');
      expect(result.state?.status).toBe('ACTIVE');
    }
  });

  it('maps EXPIRATION to EXPIRED instead of canceling access early', async () => {
    const result = await decision({
      type: 'EXPIRATION',
      period_type: 'NORMAL',
      event_timestamp_ms: 1_780_603_900_000,
    });

    expect(result.action).toBe('APPLY');
    expect(result.state?.status).toBe('EXPIRED');
    expect(result.state?.currentPeriodEnd).toEqual(new Date(1_780_603_800_000));
    expect(result.state?.canceledAt).toBeNull();
  });

  it('preserves access for cancellation, billing issues and scheduled pauses', async () => {
    for (const eventType of ['CANCELLATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED']) {
      const result = await decision({
        type: eventType,
        period_type: 'NORMAL',
      });

      expect(result).toMatchObject({
        action: 'IGNORE',
        reason: 'ACCESS_REMAINS_UNTIL_EXPIRATION',
        state: null,
      });
    }
  });

  it('never grants authoritative access from sandbox lifecycle events', async () => {
    const result = await decision({
      environment: 'SANDBOX',
      period_type: 'NORMAL',
    });

    expect(result).toMatchObject({
      action: 'IGNORE',
      reason: 'NON_PRODUCTION',
      state: null,
    });
  });

  it('rejects active state when the verified subscription period is already expired', async () => {
    const rawPayload = payload({
      period_type: 'NORMAL',
      expiration_at_ms: 1_779_999_999_999,
    });
    const evidence = await evidenceFor(rawPayload);

    expect(() =>
      mapVerifiedRevenueCatAndroidState({
        rawPayload,
        evidence,
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat active subscription expiration must be in the future.');
  });

  it('inherits the exact-byte verification requirement from lifecycle normalization', async () => {
    const original = payload();
    const evidence = await evidenceFor(original);
    const changed = payload({ period_type: 'NORMAL' });

    expect(() =>
      mapVerifiedRevenueCatAndroidState({
        rawPayload: changed,
        evidence,
        productPolicy: productPolicy(),
      }),
    ).toThrow('RevenueCat verified payload does not match exact request bytes.');
  });
});
