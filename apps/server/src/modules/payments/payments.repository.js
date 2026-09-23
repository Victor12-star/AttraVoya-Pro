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
      try {
        const event = await prismaClient.billingEvent.create({
          data: {
            provider,
            externalEventId,
            eventType,
            payloadHash,
            occurredAt,
            verifiedAt,
          },
          select: EVENT_SELECT,
        });

        return { event, created: true };
      } catch (error) {
        // The provider/event unique constraint is the concurrency-safe replay
        // boundary. If another worker won the insert race, return that existing
        // record so the service can distinguish an exact retry from a conflict.
        if (error?.code !== 'P2002') throw error;

        const event = await prismaClient.billingEvent.findUnique({
          where: {
            provider_externalEventId: {
              provider,
              externalEventId,
            },
          },
          select: EVENT_SELECT,
        });

        if (!event) throw error;
        return { event, created: false };
      }
    },
  };
}

export const paymentsRepository = createPaymentsRepository();
