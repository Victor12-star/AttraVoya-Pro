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

const CHECKOUT_ATTEMPT_SELECT = Object.freeze({
  id: true,
  userId: true,
  provider: true,
  status: true,
  activeUserKey: true,
  externalCheckoutSessionId: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
  plan: {
    select: {
      id: true,
      key: true,
      isActive: true,
    },
  },
});

const SUBSCRIPTION_SELECT = Object.freeze({
  id: true,
  userId: true,
  planId: true,
  status: true,
  provider: true,
  externalCustomerId: true,
  externalSubscriptionId: true,
  currentPeriodEnd: true,
  providerStateUpdatedAt: true,
  canceledAt: true,
});

export function createPaymentsRepository(prismaClient = prisma) {
  return {
    async createOrReuseCheckoutAttempt({ userId, planKey, provider, now, expiresAt }) {
      const plan = await prismaClient.plan.findUnique({
        where: { key: planKey },
        select: { id: true, key: true, isActive: true },
      });

      if (!plan?.isActive) {
        return { outcome: 'PLAN_NOT_FOUND', attempt: null, created: false };
      }

      // Release only an already-expired active attempt. The conditional update
      // makes concurrent callers race safely without deleting audit history.
      await prismaClient.checkoutAttempt.updateMany({
        where: {
          activeUserKey: userId,
          status: { in: ['PENDING', 'SESSION_CREATED'] },
          expiresAt: { lte: now },
        },
        data: {
          status: 'EXPIRED',
          activeUserKey: null,
        },
      });

      const existing = await prismaClient.checkoutAttempt.findUnique({
        where: { activeUserKey: userId },
        select: CHECKOUT_ATTEMPT_SELECT,
      });

      if (existing) {
        return { outcome: 'EXISTING', attempt: existing, created: false };
      }

      try {
        const attempt = await prismaClient.checkoutAttempt.create({
          data: {
            userId,
            planId: plan.id,
            provider,
            activeUserKey: userId,
            expiresAt,
          },
          select: CHECKOUT_ATTEMPT_SELECT,
        });

        return { outcome: 'CREATED', attempt, created: true };
      } catch (error) {
        // The activeUserKey unique constraint is the duplicate-click/concurrent
        // request boundary. A second worker returns the winner's attempt.
        if (error?.code !== 'P2002') throw error;

        const attempt = await prismaClient.checkoutAttempt.findUnique({
          where: { activeUserKey: userId },
          select: CHECKOUT_ATTEMPT_SELECT,
        });

        if (!attempt) throw error;
        return { outcome: 'EXISTING', attempt, created: false };
      }
    },

    async bindCheckoutSession({ attemptId, userId, provider, externalCheckoutSessionId }) {
      try {
        const update = await prismaClient.checkoutAttempt.updateMany({
          where: {
            id: attemptId,
            userId,
            provider,
            status: 'PENDING',
            activeUserKey: userId,
            externalCheckoutSessionId: null,
          },
          data: {
            status: 'SESSION_CREATED',
            externalCheckoutSessionId,
          },
        });

        const attempt = await prismaClient.checkoutAttempt.findUnique({
          where: { id: attemptId },
          select: CHECKOUT_ATTEMPT_SELECT,
        });

        return {
          attempt,
          transitioned: update.count === 1,
        };
      } catch (error) {
        // A Stripe Checkout Session must map to exactly one server-owned
        // attempt. Do not hide provider-session uniqueness collisions.
        if (error?.code === 'P2002') {
          return { attempt: null, transitioned: false, providerIdentityConflict: true };
        }
        throw error;
      }
    },

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

    async applyVerifiedCheckoutCompletion({
      eventId,
      provider,
      externalCheckoutSessionId,
      externalSubscriptionId,
      processedAt,
    }) {
      try {
        return await prismaClient.$transaction(async (tx) => {
          const event = await tx.billingEvent.findUnique({
            where: { id: eventId },
            select: EVENT_SELECT,
          });

          if (!event) return { outcome: 'EVENT_NOT_FOUND' };
          if (event.provider !== provider) return { outcome: 'PROVIDER_MISMATCH', event };
          if (event.processingStatus !== 'PENDING') {
            return { outcome: 'ALREADY_PROCESSED', event };
          }

          const attempt = await tx.checkoutAttempt.findUnique({
            where: {
              provider_externalCheckoutSessionId: {
                provider,
                externalCheckoutSessionId,
              },
            },
            select: CHECKOUT_ATTEMPT_SELECT,
          });

          if (!attempt) return { outcome: 'CHECKOUT_ATTEMPT_NOT_FOUND', event };
          if (!attempt.plan?.isActive) {
            return { outcome: 'PLAN_NOT_ACTIVE', event, attempt };
          }

          const existingSubscription = await tx.subscription.findUnique({
            where: {
              provider_externalSubscriptionId: {
                provider,
                externalSubscriptionId,
              },
            },
            select: SUBSCRIPTION_SELECT,
          });

          if (
            existingSubscription &&
            (existingSubscription.userId !== attempt.userId ||
              existingSubscription.planId !== attempt.plan.id)
          ) {
            return {
              outcome: 'PROVIDER_IDENTITY_CONFLICT',
              event,
              attempt,
              subscription: existingSubscription,
            };
          }

          const isFreshOwnedAttempt =
            attempt.status === 'SESSION_CREATED' && attempt.activeUserKey === attempt.userId;
          const isAlreadyLinked =
            attempt.status === 'COMPLETED' &&
            attempt.activeUserKey === null &&
            Boolean(existingSubscription);

          if (!isFreshOwnedAttempt && !isAlreadyLinked) {
            return {
              outcome: 'CHECKOUT_ATTEMPT_STATE_CONFLICT',
              event,
              attempt,
              subscription: existingSubscription,
            };
          }

          const claimed = await tx.billingEvent.updateMany({
            where: { id: eventId, processingStatus: 'PENDING' },
            data: {
              processingStatus: 'APPLIED',
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

          let subscription = existingSubscription;
          if (!subscription) {
            subscription = await tx.subscription.create({
              data: {
                userId: attempt.userId,
                planId: attempt.plan.id,
                status: 'PENDING',
                provider,
                externalSubscriptionId,
              },
              select: SUBSCRIPTION_SELECT,
            });
          }

          const completed = await tx.checkoutAttempt.updateMany({
            where: {
              id: attempt.id,
              userId: attempt.userId,
              provider,
              status: 'SESSION_CREATED',
              activeUserKey: attempt.userId,
              externalCheckoutSessionId,
            },
            data: {
              status: 'COMPLETED',
              activeUserKey: null,
            },
          });

          if (completed.count !== 1) {
            const currentAttempt = await tx.checkoutAttempt.findUnique({
              where: { id: attempt.id },
              select: CHECKOUT_ATTEMPT_SELECT,
            });

            if (
              currentAttempt?.status !== 'COMPLETED' ||
              currentAttempt.userId !== attempt.userId ||
              currentAttempt.plan?.id !== attempt.plan.id
            ) {
              throw Object.assign(new Error('Checkout attempt changed during completion.'), {
                code: 'CHECKOUT_ATTEMPT_STATE_CONFLICT',
              });
            }
          }

          const appliedEvent = await tx.billingEvent.update({
            where: { id: eventId },
            data: { subscriptionId: subscription.id },
            select: EVENT_SELECT,
          });

          return {
            outcome: existingSubscription ? 'ALREADY_LINKED' : 'APPLIED',
            event: appliedEvent,
            attempt,
            subscription,
          };
        });
      } catch (error) {
        if (error?.code === 'P2002') {
          return { outcome: 'PROVIDER_IDENTITY_CONFLICT' };
        }
        if (error?.code === 'CHECKOUT_ATTEMPT_STATE_CONFLICT') {
          return { outcome: 'CHECKOUT_ATTEMPT_STATE_CONFLICT' };
        }
        throw error;
      }
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
