import { AuthenticationError } from '../../errors/app-error.js';

/**
 * Authenticated HTTP boundary for starting the already-existing server-owned
 * Stripe Checkout flow.
 *
 * Only the authenticated account ID and validated AttraVoya plan key enter the
 * checkout service. Provider identifiers, prices, redirects, ownership fields
 * and entitlement state are never accepted from the client.
 */
export function createStripeCheckoutController({ stripeCheckoutSessionService }) {
  if (!stripeCheckoutSessionService?.create) {
    throw new TypeError('Stripe checkout session service is required.');
  }

  return Object.freeze({
    async create(request, reply) {
      if (!request.auth?.id) {
        throw new AuthenticationError();
      }

      const body = /** @type {{ planKey: string }} */ (request.body);
      const result = await stripeCheckoutSessionService.create({
        userId: request.auth.id,
        planKey: body.planKey,
      });

      reply.header('Cache-Control', 'private, no-store');
      return reply.code(200).send({
        checkoutUrl: result.checkoutUrl,
      });
    },
  });
}
