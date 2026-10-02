import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createBillingVerificationBoundary } from './payments.verification.js';
import { resolveVerifiedRevenueCatAndroidTransfer } from './payments.revenuecat-transfer.js';

const FROM_APP_USER_ID = 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const TO_APP_USER_ID = 'av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const APP_ID = 'app_attravoya_android';

function payload(overrides = {}) {
  return Buffer.from(
    JSON.stringify({
      api_version: '1.0',
      event: {
        id: 'evt_transfer_1',
        type: 'TRANSFER',
        event_timestamp_ms: 1_780_000_000_000,
        app_id: APP_ID,
        store: 'PLAY_STORE',
        environment: 'PRODUCTION',
        transferred_from: [FROM_APP_USER_ID],
        transferred_to: [TO_APP_USER_ID],
        ...overrides,
      },
    }),
  );
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

function subscriberIdentityService() {
  return {
    resolveOwnedUser: vi.fn(async ({ appUserId }) => {
      if (appUserId === FROM_APP_USER_ID) return { userId: 'user-from', appUserId };
      if (appUserId === TO_APP_USER_ID) return { userId: 'user-to', appUserId };
      throw new Error('unexpected identity');
    }),
  };
}

describe('RevenueCat Android transfer ownership', () => {
  it('resolves one verified server-owned source and destination', async () => {
    const rawPayload = payload();
    const evidence = await evidenceFor(rawPayload);
    const identities = subscriberIdentityService();

    await expect(
      resolveVerifiedRevenueCatAndroidTransfer({
        rawPayload,
        evidence,
        expectedAppId: APP_ID,
        subscriberIdentityService: identities,
      }),
    ).resolves.toEqual({
      action: 'APPLY',
      fromUserId: 'user-from',
      toUserId: 'user-to',
      providerStateUpdatedAt: new Date(1_780_000_000_000),
    });

    expect(identities.resolveOwnedUser).toHaveBeenCalledTimes(2);
  });

  it('rejects transfer event-time evidence that does not match the verified payload', async () => {
    const rawPayload = payload();
    const event = JSON.parse(rawPayload.toString('utf8')).event;
    const mismatchedEvidence = await createBillingVerificationBoundary({
      provider: 'revenuecat',
      verify: async () => ({
        externalEventId: event.id,
        eventType: event.type,
        occurredAt: new Date(1_780_000_001_000),
      }),
    }).verifyEvent({ rawPayload });

    await expect(
      resolveVerifiedRevenueCatAndroidTransfer({
        rawPayload,
        evidence: mismatchedEvidence,
        expectedAppId: APP_ID,
        subscriberIdentityService: subscriberIdentityService(),
      }),
    ).rejects.toThrow('RevenueCat verified transfer event time does not match payload.');
  });

  it('fails closed for ambiguous server-owned identities', async () => {
    const rawPayload = payload({
      transferred_from: [FROM_APP_USER_ID, 'av_rc_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'],
    });
    const evidence = await evidenceFor(rawPayload);

    await expect(
      resolveVerifiedRevenueCatAndroidTransfer({
        rawPayload,
        evidence,
        expectedAppId: APP_ID,
        subscriberIdentityService: subscriberIdentityService(),
      }),
    ).rejects.toThrow('RevenueCat transfer ownership is ambiguous.');
  });

  it('rejects wrong app, wrong store and changed exact bytes', async () => {
    const original = payload();
    const evidence = await evidenceFor(original);

    await expect(
      resolveVerifiedRevenueCatAndroidTransfer({
        rawPayload: payload({ app_id: 'app_other' }),
        evidence,
        expectedAppId: APP_ID,
        subscriberIdentityService: subscriberIdentityService(),
      }),
    ).rejects.toThrow('does not match exact request bytes');

    for (const overrides of [{ app_id: 'app_other' }, { store: 'APP_STORE' }]) {
      const rawPayload = payload(overrides);
      const matchingEvidence = await evidenceFor(rawPayload);
      await expect(
        resolveVerifiedRevenueCatAndroidTransfer({
          rawPayload,
          evidence: matchingEvidence,
          expectedAppId: APP_ID,
          subscriberIdentityService: subscriberIdentityService(),
        }),
      ).rejects.toThrow(/unexpected app|not from Google Play/);
    }
  });

  it('ignores sandbox transfer events before resolving ownership', async () => {
    const rawPayload = payload({ environment: 'SANDBOX' });
    const evidence = await evidenceFor(rawPayload);
    const identities = subscriberIdentityService();

    await expect(
      resolveVerifiedRevenueCatAndroidTransfer({
        rawPayload,
        evidence,
        expectedAppId: APP_ID,
        subscriberIdentityService: identities,
      }),
    ).resolves.toEqual({ action: 'IGNORE', reason: 'NON_PRODUCTION' });

    expect(identities.resolveOwnedUser).not.toHaveBeenCalled();
  });

  it('requires evidence minted for the exact payload', async () => {
    const rawPayload = payload();
    const plainEvidence = {
      provider: 'revenuecat',
      externalEventId: 'evt_transfer_1',
      eventType: 'TRANSFER',
      occurredAt: new Date(1_780_000_000_000),
      payloadHash: createHash('sha256').update(rawPayload).digest('hex'),
    };

    await expect(
      resolveVerifiedRevenueCatAndroidTransfer({
        rawPayload,
        evidence: plainEvidence,
        expectedAppId: APP_ID,
        subscriberIdentityService: subscriberIdentityService(),
      }),
    ).rejects.toThrow('requires verified billing evidence');
  });
});
