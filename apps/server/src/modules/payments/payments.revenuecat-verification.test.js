import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createRevenueCatWebhookVerifier } from './payments.revenuecat-verification.js';
import {
  createBillingVerificationBoundary,
  isVerifiedBillingEvidence,
} from './payments.verification.js';

const SECRET = 'revenuecat_test_signing_secret';
const NOW = new Date('2026-09-24T16:00:00.000Z');
const TIMESTAMP = Math.floor(NOW.getTime() / 1000);
const EVENT_TIMESTAMP_MS = NOW.getTime() - 12_000;

function payload(overrides = {}) {
  return Buffer.from(
    JSON.stringify({
      api_version: '1.0',
      event: {
        id: 'rc_evt_123',
        type: 'RENEWAL',
        event_timestamp_ms: EVENT_TIMESTAMP_MS,
        app_user_id: 'must-not-enter-evidence',
        product_id: 'attravoya_pro_monthly:base',
        store: 'PLAY_STORE',
        ...overrides,
      },
    }),
  );
}

function signature(rawPayload, timestamp = TIMESTAMP, secret = SECRET) {
  return createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(String(timestamp)), Buffer.from('.'), rawPayload]))
    .digest('hex');
}

function header(
  rawPayload,
  timestamp = TIMESTAMP,
  signatures = [signature(rawPayload, timestamp)],
) {
  return `t=${timestamp},${signatures.map((value) => `v1=${value}`).join(',')}`;
}

describe('RevenueCat webhook verifier', () => {
  it('authenticates exact raw bytes and returns only normalized event identity', async () => {
    const rawPayload = payload();
    const verify = createRevenueCatWebhookVerifier({
      webhookSigningSecret: SECRET,
      now: () => NOW,
    });

    const result = await verify({
      rawPayload,
      headers: { 'x-revenuecat-webhook-signature': header(rawPayload) },
    });

    expect(result).toEqual({
      externalEventId: 'rc_evt_123',
      eventType: 'RENEWAL',
      occurredAt: new Date(EVENT_TIMESTAMP_MS),
    });
    expect(JSON.stringify(result)).not.toContain('must-not-enter-evidence');
    expect(JSON.stringify(result)).not.toContain('attravoya_pro_monthly');
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });

  it('mints opaque billing evidence only after RevenueCat authentication succeeds', async () => {
    const rawPayload = payload();
    const boundary = createBillingVerificationBoundary({
      provider: 'revenuecat',
      verify: createRevenueCatWebhookVerifier({
        webhookSigningSecret: SECRET,
        now: () => NOW,
      }),
      now: () => NOW,
    });

    const evidence = await boundary.verifyEvent({
      rawPayload,
      headers: { 'x-revenuecat-webhook-signature': header(rawPayload) },
    });

    expect(isVerifiedBillingEvidence(evidence)).toBe(true);
    expect(evidence).toMatchObject({
      provider: 'revenuecat',
      externalEventId: 'rc_evt_123',
      eventType: 'RENEWAL',
      occurredAt: new Date(EVENT_TIMESTAMP_MS),
      verifiedAt: NOW,
    });
    expect(JSON.stringify(evidence)).not.toContain('must-not-enter-evidence');
  });

  it('accepts one valid v1 signature among rotation candidates', async () => {
    const rawPayload = payload();
    const verify = createRevenueCatWebhookVerifier({
      webhookSigningSecret: SECRET,
      now: () => NOW,
    });

    const result = await verify({
      rawPayload,
      headers: {
        'x-revenuecat-webhook-signature': header(rawPayload, TIMESTAMP, [
          '0'.repeat(64),
          signature(rawPayload),
          'f'.repeat(64),
        ]),
      },
    });

    expect(result.externalEventId).toBe('rc_evt_123');
  });

  it('rejects payload tampering after the signature was created', async () => {
    const originalPayload = payload();
    const tamperedPayload = payload({ id: 'rc_evt_tampered' });
    const verify = createRevenueCatWebhookVerifier({
      webhookSigningSecret: SECRET,
      now: () => NOW,
    });

    await expect(
      verify({
        rawPayload: tamperedPayload,
        headers: {
          'x-revenuecat-webhook-signature': header(originalPayload),
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects signatures outside the replay tolerance', async () => {
    const rawPayload = payload();
    const staleTimestamp = TIMESTAMP - 301;
    const verify = createRevenueCatWebhookVerifier({
      webhookSigningSecret: SECRET,
      now: () => NOW,
      toleranceSeconds: 300,
    });

    await expect(
      verify({
        rawPayload,
        headers: {
          'x-revenuecat-webhook-signature': header(rawPayload, staleTimestamp),
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects missing or malformed signature metadata', async () => {
    const rawPayload = payload();
    const verify = createRevenueCatWebhookVerifier({
      webhookSigningSecret: SECRET,
      now: () => NOW,
    });

    await expect(verify({ rawPayload, headers: {} })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    await expect(
      verify({
        rawPayload,
        headers: {
          'x-revenuecat-webhook-signature': 't=not-a-time,v1=bad',
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('authenticates before rejecting malformed or unsupported RevenueCat events', async () => {
    const malformed = Buffer.from('{not-json');
    const unsupported = Buffer.from(
      JSON.stringify({
        api_version: '2.0',
        event: {
          id: 'rc_evt_123',
          type: 'RENEWAL',
          event_timestamp_ms: EVENT_TIMESTAMP_MS,
        },
      }),
    );
    const invalidIdentity = payload({ id: '', type: '' });
    const verify = createRevenueCatWebhookVerifier({
      webhookSigningSecret: SECRET,
      now: () => NOW,
    });

    for (const rawPayload of [malformed, unsupported, invalidIdentity]) {
      await expect(
        verify({
          rawPayload,
          headers: {
            'x-revenuecat-webhook-signature': header(rawPayload),
          },
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    }
  });

  it('rejects invalid event timestamps after authentication', async () => {
    const rawPayload = payload({ event_timestamp_ms: -1 });
    const verify = createRevenueCatWebhookVerifier({
      webhookSigningSecret: SECRET,
      now: () => NOW,
    });

    await expect(
      verify({
        rawPayload,
        headers: {
          'x-revenuecat-webhook-signature': header(rawPayload),
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('requires a configured signing secret and valid server time', async () => {
    expect(() =>
      createRevenueCatWebhookVerifier({
        webhookSigningSecret: '',
        now: () => NOW,
      }),
    ).toThrow('RevenueCat webhook signing secret is required.');

    const rawPayload = payload();
    const verify = createRevenueCatWebhookVerifier({
      webhookSigningSecret: SECRET,
      now: () => new Date('invalid'),
    });

    await expect(
      verify({
        rawPayload,
        headers: {
          'x-revenuecat-webhook-signature': header(rawPayload),
        },
      }),
    ).rejects.toThrow('RevenueCat verification requires a valid server time.');
  });
});
