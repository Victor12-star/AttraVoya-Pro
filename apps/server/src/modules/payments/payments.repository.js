import { prisma } from '@attravoya/database';

const EVENT_SELECT = Object.freeze({
  id: true,
  provider: true,
  externalEventId: true,
  eventType: true,
  payloadHash: true,
  processingStatus: true,
  occurredAt: true,
  verifiedAt: true,
  receivedAt: true,
  processedAt: true,
  failureCode: true,
  subscriptionId: true,
});

export function createPaymentsRepository(prismaClient = prisma) {
  return {
    async recordVerifiedEvent({
      provider,
      externalEventId,
      eventType,
      payloadHash,
      occurredAt,
      verifiedAt,
    }) {
      let created = false;

      const event = await prismaClient.billingEvent.upsert({
        where: {
          provider_externalEventId: {
            provider,
            externalEventId,
          },
        },
        create: {
          provider,
          externalEventId,
          eventType,
          payloadHash,
          occurredAt,
          verifiedAt,
        },
        update: {},
        select: EVENT_SELECT,
      });

      // Prisma upsert does not expose whether the create branch won. A second
      // read is unnecessary: the immutable identity fields let the service
      // safely classify exact retries versus conflicting replay attempts.
      created =
        event.eventType === eventType &&
        event.payloadHash === payloadHash &&
        event.verifiedAt.getTime() === verifiedAt.getTime();

      return { event, created };
    },
  };
}

export const paymentsRepository = createPaymentsRepository();
