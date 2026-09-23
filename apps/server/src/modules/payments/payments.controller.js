import { ValidationError } from '../../errors/app-error.js';

/**
 * HTTP boundary for Stripe webhook delivery.
 *
 * The controller intentionally returns only a minimal acknowledgement after the
 * internal trust chain has authenticated and deterministically handled an event.
 * Provider/payment state is never reflected back to the public webhook caller.
 */
export function createPaymentsController({ stripeSubscriptionProcessor }) {
  if (!stripeSubscriptionProcessor?.process) {
    throw new TypeError('Stripe subscription event processor is required.');
  }

  return {
    async stripeWebhook(request, reply) {
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        throw new ValidationError('Stripe webhook requires exact raw request bytes.');
      }

      await stripeSubscriptionProcessor.process({
        rawPayload: request.body,
        headers: request.headers,
      });

      return reply.code(200).send({ received: true });
    },
  };
}
