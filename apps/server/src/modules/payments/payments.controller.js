import { ValidationError } from '../../errors/app-error.js';

/**
 * HTTP boundary for Stripe webhook delivery.
 *
 * The controller intentionally returns only a minimal acknowledgement after the
 * internal trust chain has authenticated and deterministically handled an event.
 * Provider/payment state is never reflected back to the public webhook caller.
 */
export function createPaymentsController({ stripeWebhookProcessor }) {
  if (!stripeWebhookProcessor?.process) {
    throw new TypeError('Stripe webhook event processor is required.');
  }

  return {
    async stripeWebhook(request, reply) {
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        throw new ValidationError('Stripe webhook requires exact raw request bytes.');
      }

      await stripeWebhookProcessor.process({
        rawPayload: request.body,
        headers: request.headers,
      });

      return reply.code(200).send({ received: true });
    },
  };
}


/**
 * Authenticated handoff for the current account's server-owned RevenueCat ID.
 *
 * The opaque App User ID is customer identity only. It is not entitlement
 * proof, purchase ownership proof, a provider secret, or an authorization token.
 */
export function createRevenueCatAndroidIdentityController({
  revenueCatSubscriberIdentityService,
}) {
  if (!revenueCatSubscriberIdentityService?.getOrCreateForUser) {
    throw new TypeError('RevenueCat subscriber identity service is required.');
  }

  return {
    async getCurrentIdentity(request, reply) {
      const identity = await revenueCatSubscriberIdentityService.getOrCreateForUser({
        userId: request.auth.id,
      });

      reply.header('Cache-Control', 'private, no-store');
      return reply.code(200).send({ appUserId: identity.appUserId });
    },
  };
}

/**
 * HTTP boundary for RevenueCat webhook delivery.
 *
 * The processor owns HMAC verification, replay-safe event recording, subscriber
 * ownership resolution and subscription-state mutation. This controller never
 * reflects billing state or provider identifiers back to the public caller.
 */
export function createRevenueCatWebhookController({ revenueCatWebhookProcessor }) {
  if (!revenueCatWebhookProcessor?.process) {
    throw new TypeError('RevenueCat webhook event processor is required.');
  }

  return {
    async revenueCatWebhook(request, reply) {
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        throw new ValidationError('RevenueCat webhook requires exact raw request bytes.');
      }

      await revenueCatWebhookProcessor.process({
        rawPayload: request.body,
        headers: request.headers,
      });

      return reply.code(200).send({ received: true });
    },
  };
}
