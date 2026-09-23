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

const SUBSCRIPTION_SELECT = Object.freeze({
  id: true,
  userId: true,
  planId: true,
  status: true,
  provider: true,
  currentPeriodEnd: true,
  providerStateUpdatedAt: true,
  canceledAt: true,
});

export function createPaymentsRepository(prismaClient = prisma) {
  return {
    async findSubscriptionByProviderIdentity({ provider, externalSubscriptionId }) {
      return prismaClient.subscription.findUnique({
        where: {
          provider_externalSubscriptionId: {
            provider,
            externalSubscriptionId,
          },
        },
        select: SUBSCRIPTION_SELECT,
      });
    },

    async finalizePendingEvent({ eventId, status, failureCode, processedAt }) {
      const update = await prismaClient.billingEvent.updateMany({
        where: {
          id: eventId,
          processingStatus: 'PENDING',
        },
        data: {
          processingStatus: status,
          processedAt,
          failureCode,
        },
      });

      const event = await prismaClient.billingEvent.findUnique({
        where: { id: eventId },
        select: EVENT_SELECT,
      });

      return {
        event,
        transitioned: update.count === 1,
      };
    },

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

    async applyVerifiedSubscriptionState({
      eventId,
      subscriptionId,
      provider,
      status,
      currentPeriodEnd,
      canceledAt,
      providerStateUpdatedAt,
      processedAt,
    }) {
      return prismaClient.$transaction(async (tx) => {
        const event = await tx.billingEvent.findUnique({
          where: { id: eventId },
          select: EVENT_SELECT,
        });

        if (!event) return { outcome: 'EVENT_NOT_FOUND' };
        if (event.provider !== provider) return { outcome: 'PROVIDER_MISMATCH', event };
        if (event.processingStatus !== 'PENDING') {
          return { outcome: 'ALREADY_PROCESSED', event };
        }

        const subscription = await tx.subscription.findUnique({
          where: { id: subscriptionId },
          select: SUBSCRIPTION_SELECT,
        });

        if (!subscription) return { outcome: 'SUBSCRIPTION_NOT_FOUND', event };
        if (subscription.provider && subscription.provider !== provider) {
          return { outcome: 'SUBSCRIPTION_PROVIDER_MISMATCH', event, subscription };
        }

        // Claim the ledger row inside the same transaction. If another worker
        // already claimed this exact event, this worker performs no state write.
        const claimed = await tx.billingEvent.updateMany({
          where: { id: eventId, processingStatus: 'PENDING' },
          data: {
            processingStatus: 'APPLIED',
            subscriptionId,
            processedAt,
            failureCode: null,
          },
        });

        if (claimed.count !== 1) {
          const currentEvent = await tx.billingEvent.findUnique({
            where: { id: eventId },
            select: EVENT_SELECT,
          });
          return { outcome: 'ALREADY_PROCESSED', event: currentEvent };
        }

        // Compare-and-swap the provider timestamp. PostgreSQL rechecks this
        // predicate after concurrent row locks are released, preventing an older
        // provider event from overwriting state written by a newer event.
        const updated = await tx.subscription.updateMany({
          where: {
            id: subscriptionId,
            AND: [
              { OR: [{ provider: null }, { provider }] },
              {
                OR: [
                  { providerStateUpdatedAt: null },
                  { providerStateUpdatedAt: { lt: providerStateUpdatedAt } },
                ],
              },
            ],
          },
          data: {
            provider,
            status,
            currentPeriodEnd,
            providerStateUpdatedAt,
            canceledAt,
          },
        });

        if (updated.count !== 1) {
          const currentSubscription = await tx.subscription.findUnique({
            where: { id: subscriptionId },
            select: SUBSCRIPTION_SELECT,
          });

          if (!currentSubscription) {
            const failedEvent = await tx.billingEvent.update({
              where: { id: eventId },
              data: {
                processingStatus: 'FAILED',
                processedAt,
                subscriptionId,
                failureCode: 'SUBSCRIPTION_NOT_FOUND',
              },
              select: EVENT_SELECT,
            });
            return { outcome: 'SUBSCRIPTION_NOT_FOUND', event: failedEvent };
          }

          if (currentSubscription.provider && currentSubscription.provider !== provider) {
            const failedEvent = await tx.billingEvent.update({
              where: { id: eventId },
              data: {
                processingStatus: 'FAILED',
                processedAt,
                subscriptionId,
                failureCode: 'SUBSCRIPTION_PROVIDER_MISMATCH',
              },
              select: EVENT_SELECT,
            });
            return {
              outcome: 'SUBSCRIPTION_PROVIDER_MISMATCH',
              event: failedEvent,
              subscription: currentSubscription,
            };
          }

          const ignoredEvent = await tx.billingEvent.update({
            where: { id: eventId },
            data: {
              processingStatus: 'IGNORED',
              processedAt,
              subscriptionId,
              failureCode: 'STALE_PROVIDER_STATE',
            },
            select: EVENT_SELECT,
          });

          return {
            outcome: 'STALE',
            event: ignoredEvent,
            subscription: currentSubscription,
          };
        }

        const appliedSubscription = await tx.subscription.findUnique({
          where: { id: subscriptionId },
          select: SUBSCRIPTION_SELECT,
        });
        const appliedEvent = await tx.billingEvent.findUnique({
          where: { id: eventId },
          select: EVENT_SELECT,
        });

        return {
          outcome: 'APPLIED',
          event: appliedEvent,
          subscription: appliedSubscription,
        };
      });
    },
  };
}

export const paymentsRepository = createPaymentsRepository();
