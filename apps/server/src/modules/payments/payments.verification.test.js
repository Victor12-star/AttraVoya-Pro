import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  createBillingVerificationBoundary,
  isVerifiedBillingEvidence,
} from './payments.verification.js';

const NOW = new Date('2026-09-23T16:00:00.000Z');
const OCCURRED_AT = new Date('2026-09-23T15:59:00.000Z');

describe('billing provider verification boundary', () => {
  it('hashes exact raw bytes and returns only privacy-minimized verified evidence', async () => {
    const rawPayload = Buffer.from('{"id":"evt_123","type":"subscription.updated"}');
    const verify = vi.fn(async ({ rawPayload: adapterPayload, headers }) => {
      expect(Buffer.isBuffer(adapterPayload)).toBe(true);
      expect(adapterPayload.equals(rawPayload)).toBe(true);
      expect(headers.authorization).toBe('provider-signature-secret');

      return {
        externalEventId: ' evt_123 ',
        eventType: ' subscription.updated ',
        occurredAt: OCCURRED_AT,
      };
    });
    const boundary = createBillingVerificationBoundary({
      provider: ' Stripe ',
      verify,
      now: () => NOW,
    });

    const evidence = await boundary.verifyEvent({
      rawPayload,
      headers: { authorization: 'provider-signature-secret' },
    });

    expect(evidence).toEqual({
      provider: 'stripe',
      externalEventId: 'evt_123',
      eventType: 'subscription.updated',
      payloadHash: createHash('sha256').update(rawPayload).digest('hex'),
      occurredAt: OCCURRED_AT,
      verifiedAt: NOW,
    });
    expect(isVerifiedBillingEvidence(evidence)).toBe(true);
    expect(isVerifiedBillingEvidence({ ...evidence })).toBe(false);
    expect(JSON.stringify(evidence)).not.toContain('provider-signature-secret');
    expect(JSON.stringify(evidence)).not.toContain(rawPayload.toString());
  });

  it('rejects non-byte, empty, and oversized payloads before provider verification', async () => {
    const verify = vi.fn();
    const boundary = createBillingVerificationBoundary({
      provider: 'stripe',
      verify,
      maxPayloadBytes: 4,
    });

    await expect(
      boundary.verifyEvent({ rawPayload: /** @type {any} */ ('{"id":"evt"}') }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    await expect(boundary.verifyEvent({ rawPayload: Buffer.alloc(0) })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
    await expect(boundary.verifyEvent({ rawPayload: Buffer.alloc(5) })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    expect(verify).not.toHaveBeenCalled();
  });

  it('fails closed when a provider adapter returns malformed verified identity', async () => {
    const boundary = createBillingVerificationBoundary({
      provider: 'stripe',
      verify: async () => ({
        externalEventId: '',
        eventType: 'subscription.updated',
        occurredAt: new Date('invalid'),
      }),
      now: () => NOW,
    });

    await expect(
      boundary.verifyEvent({ rawPayload: Buffer.from('provider-event') }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: 'PROVIDER_RESPONSE_ERROR',
    });
  });

  it('preserves provider authentication failures and never mints evidence on failure', async () => {
    const authenticationFailure = new Error('signature verification failed');
    const boundary = createBillingVerificationBoundary({
      provider: 'stripe',
      verify: async () => {
        throw authenticationFailure;
      },
      now: () => NOW,
    });

    await expect(
      boundary.verifyEvent({ rawPayload: Buffer.from('provider-event') }),
    ).rejects.toBe(authenticationFailure);
  });

  it('requires a valid server verification time', async () => {
    const boundary = createBillingVerificationBoundary({
      provider: 'stripe',
      verify: async () => ({
        externalEventId: 'evt_123',
        eventType: 'subscription.updated',
      }),
      now: () => new Date('invalid'),
    });

    await expect(
      boundary.verifyEvent({ rawPayload: Buffer.from('provider-event') }),
    ).rejects.toThrow('Billing verification requires a valid server time.');
  });
});
