import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createStripeWebhookVerifier } from './payments.stripe-verification.js';
import {
  createBillingVerificationBoundary,
  isVerifiedBillingEvidence,
} from './payments.verification.js';

const SECRET = 'whsec_test_secret';
const NOW = new Date('2026-09-23T16:30:00.000Z');
const TIMESTAMP = Math.floor(NOW.getTime() / 1000);

function payload(overrides = {}) {
  return Buffer.from(
    JSON.stringify({
      id: 'evt_123',
      type: 'customer.subscription.updated',
      created: TIMESTAMP - 10,
      ...overrides,
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

describe('Stripe webhook verifier', () => {
  it('authenticates exact raw bytes and returns only normalized event identity', async () => {
    const rawPayload = payload();
    const verify = createStripeWebhookVerifier({
      webhookSecret: SECRET,
      now: () => NOW,
    });

    const result = await verify({
      rawPayload,
      headers: { 'stripe-signature': header(rawPayload) },
    });

    expect(result).toEqual({
      externalEventId: 'evt_123',
      eventType: 'customer.subscription.updated',
      occurredAt: new Date((TIMESTAMP - 10) * 1000),
    });
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });

  it('mints opaque billing evidence only after Stripe authentication succeeds', async () => {
    const rawPayload = payload();
    const boundary = createBillingVerificationBoundary({
      provider: 'stripe',
      verify: createStripeWebhookVerifier({
        webhookSecret: SECRET,
        now: () => NOW,
      }),
      now: () => NOW,
    });

    const evidence = await boundary.verifyEvent({
      rawPayload,
      headers: { 'stripe-signature': header(rawPayload) },
    });

    expect(isVerifiedBillingEvidence(evidence)).toBe(true);
    expect(evidence).toMatchObject({
      provider: 'stripe',
      externalEventId: 'evt_123',
      eventType: 'customer.subscription.updated',
      verifiedAt: NOW,
    });
    expect(JSON.stringify(evidence)).not.toContain(SECRET);
  });

  it('accepts one valid v1 signature among rotation candidates', async () => {
    const rawPayload = payload();
    const verify = createStripeWebhookVerifier({
      webhookSecret: SECRET,
      now: () => NOW,
    });

    const result = await verify({
      rawPayload,
      headers: {
        'stripe-signature': header(rawPayload, TIMESTAMP, [
          '0'.repeat(64),
          signature(rawPayload),
          'f'.repeat(64),
        ]),
      },
    });

    expect(result.externalEventId).toBe('evt_123');
  });

  it('rejects payload tampering after the provider signature was created', async () => {
    const originalPayload = payload();
    const tamperedPayload = payload({ id: 'evt_tampered' });
    const verify = createStripeWebhookVerifier({
      webhookSecret: SECRET,
      now: () => NOW,
    });

    await expect(
      verify({
        rawPayload: tamperedPayload,
        headers: { 'stripe-signature': header(originalPayload) },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects signatures outside the replay tolerance', async () => {
    const rawPayload = payload();
    const staleTimestamp = TIMESTAMP - 301;
    const verify = createStripeWebhookVerifier({
      webhookSecret: SECRET,
      now: () => NOW,
      toleranceSeconds: 300,
    });

    await expect(
      verify({
        rawPayload,
        headers: { 'stripe-signature': header(rawPayload, staleTimestamp) },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects missing, malformed, or unsupported signature metadata', async () => {
    const rawPayload = payload();
    const verify = createStripeWebhookVerifier({
      webhookSecret: SECRET,
      now: () => NOW,
    });

    await expect(verify({ rawPayload, headers: {} })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    await expect(
      verify({
        rawPayload,
        headers: { 'stripe-signature': 't=not-a-time,v1=bad' },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('authenticates before rejecting malformed event JSON or identity', async () => {
    const malformed = Buffer.from('{not-json');
    const invalidIdentity = payload({ id: '', type: '' });
    const verify = createStripeWebhookVerifier({
      webhookSecret: SECRET,
      now: () => NOW,
    });

    await expect(
      verify({
        rawPayload: malformed,
        headers: { 'stripe-signature': header(malformed) },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    await expect(
      verify({
        rawPayload: invalidIdentity,
        headers: { 'stripe-signature': header(invalidIdentity) },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('requires a configured secret and valid server time', async () => {
    expect(() =>
      createStripeWebhookVerifier({
        webhookSecret: '',
        now: () => NOW,
      }),
    ).toThrow('Stripe webhook secret is required.');

    const rawPayload = payload();
    const verify = createStripeWebhookVerifier({
      webhookSecret: SECRET,
      now: () => new Date('invalid'),
    });

    await expect(
      verify({
        rawPayload,
        headers: { 'stripe-signature': header(rawPayload) },
      }),
    ).rejects.toThrow('Stripe verification requires a valid server time.');
  });
});
