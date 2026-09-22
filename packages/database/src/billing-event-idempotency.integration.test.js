import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeDatabase, prisma } from '../src/index.js';
import { processBillingEventOnce } from '../src/billing-event-idempotency.js';

const enabled = process.env.BILLING_EVENT_IDEMPOTENCY_TEST === '1';
const suite = enabled ? describe : describe.skip;
const provider = 'ci_billing';
const prefix = `evt_${process.pid}_`;

function event(overrides = {}) {
  return {
    provider,
    externalEventId: `${prefix}${overrides.externalEventId ?? 'same'}`,
    eventType: overrides.eventType ?? 'subscription.updated',
    payloadSha256: overrides.payloadSha256 ?? 'c'.repeat(64),
  };
}

suite('billing event PostgreSQL idempotency', () => {
  beforeAll(async () => {
    await prisma.billingEventReceipt.deleteMany({ where: { provider } });
  });

  afterAll(async () => {
    await prisma.billingEventReceipt.deleteMany({ where: { provider } });
    await closeDatabase();
  });

  it('allows only one concurrent delivery to apply', async () => {
    let applyCount = 0;
    const input = event();

    const deliveries = await Promise.all([
      processBillingEventOnce({
        ...input,
        apply: async () => {
          applyCount += 1;
          return 'first';
        },
      }),
      processBillingEventOnce({
        ...input,
        apply: async () => {
          applyCount += 1;
          return 'second';
        },
      }),
    ]);

    expect(deliveries.map((item) => item.status).sort()).toEqual(['duplicate', 'processed']);
    expect(applyCount).toBe(1);
    await expect(
      prisma.billingEventReceipt.count({
        where: { provider, externalEventId: input.externalEventId },
      }),
    ).resolves.toBe(1);
  });

  it('rolls the receipt back when processing fails so a retry can succeed', async () => {
    const input = event({ externalEventId: 'rollback' });

    await expect(
      processBillingEventOnce({
        ...input,
        apply: async () => {
          throw new Error('intentional billing mutation failure');
        },
      }),
    ).rejects.toThrow('intentional billing mutation failure');

    await expect(
      prisma.billingEventReceipt.count({
        where: { provider, externalEventId: input.externalEventId },
      }),
    ).resolves.toBe(0);

    await expect(
      processBillingEventOnce({
        ...input,
        apply: async () => 'recovered',
      }),
    ).resolves.toEqual({ status: 'processed', value: 'recovered' });
  });

  it('rejects the same provider event ID with a different payload fingerprint', async () => {
    const input = event({ externalEventId: 'mismatch' });
    await processBillingEventOnce({ ...input, apply: async () => null });

    await expect(
      processBillingEventOnce({
        ...input,
        payloadSha256: 'd'.repeat(64),
        apply: async () => null,
      }),
    ).rejects.toThrow('Billing event replay does not match the stored receipt.');
  });
});
