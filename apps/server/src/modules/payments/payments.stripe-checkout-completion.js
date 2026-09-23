import { ValidationError } from '../../errors/app-error.js';

const EVENT_TYPE = 'checkout.session.completed';

class StripeVerifiedCheckoutIdentityMismatchError extends ValidationError {}

function parseVerifiedCheckoutCompletion(rawPayload, evidence) {
  let event;
  try {
    event = JSON.parse(rawPayload.toString('utf8'));
  } catch {
    throw new ValidationError('Stripe checkout completion payload is invalid.');
  }

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new ValidationError('Stripe checkout completion payload is invalid.');
  }

  const eventId = typeof event.id === 'string' ? event.id.trim() : '';
  const eventType = typeof event.type === 'string' ? event.type.trim() : '';
  if (eventId !== evidence.externalEventId || eventType !== evidence.eventType) {
    throw new StripeVerifiedCheckoutIdentityMismatchError(
      'Stripe verified event identity does not match payload.',
    );
  }

  const session = event.data?.object;
  if (!session || typeof session !== 'object' || Array.isArray(session)) {
    throw new ValidationError('Stripe checkout completion object is invalid.');
  }

  const externalCheckoutSessionId = typeof session.id === 'string' ? session.id.trim() : '';
  const mode = typeof session.mode === 'string' ? session.mode.trim().toLowerCase() : '';
  const externalSubscriptionId =
    typeof session.subscription === 'string' ? session.subscription.trim() : '';

  if (!externalCheckoutSessionId.startsWith('cs_') || externalCheckoutSessionId.length > 255) {
    throw new ValidationError('Stripe Checkout Session identity is invalid.');
  }

  if (mode !== 'subscription') {
    throw new ValidationError('Stripe Checkout Session mode is invalid.');
  }

  if (!externalSubscriptionId.startsWith('sub_') || externalSubscriptionId.length > 255) {
    throw new ValidationError('Stripe subscription identity is invalid.');
  }

  return {
    externalCheckoutSessionId,
    externalSubscriptionId,
  };
}

/**
 * Internal verified checkout-completion ownership bridge.
 *
 * This processor does not create Checkout Sessions and is not registered as an
 * HTTP route. It authenticates exact Stripe request bytes through the existing
 * verification boundary, records privacy-minimized evidence, then attaches the
 * provider subscription identity only to the server-owned CheckoutAttempt.
 *
 * @param {{
 *   verificationBoundary: { verifyEvent: (input: any) => Promise<any> },
 *   paymentsService: {
 *     recordVerifiedEvent: (evidence: any) => Promise<any>,
 *     finalizeVerifiedEvent: (input: any) => Promise<any>,
 *     applyVerifiedCheckoutCompletion: (input: any) => Promise<any>
 *   }
 * }} dependencies
 */
export function createStripeCheckoutCompletionProcessor({
  verificationBoundary,
  paymentsService,
}) {
  if (!verificationBoundary?.verifyEvent) {
    throw new TypeError('Stripe billing verification boundary is required.');
  }

  if (
    !paymentsService?.recordVerifiedEvent ||
    !paymentsService?.finalizeVerifiedEvent ||
    !paymentsService?.applyVerifiedCheckoutCompletion
  ) {
    throw new TypeError('Payments service is required.');
  }

  return Object.freeze({
    /**
     * @param {{ rawPayload: Buffer, headers?: object }} input
     */
    async process({ rawPayload, headers = {} }) {
      const evidence = await verificationBoundary.verifyEvent({ rawPayload, headers });
      const recorded = await paymentsService.recordVerifiedEvent(evidence);
      const eventId = recorded.event.id;

      if (evidence.eventType !== EVENT_TYPE) {
        const finalized = await paymentsService.finalizeVerifiedEvent({
          eventId,
          outcome: 'IGNORED',
        });

        return {
          outcome: 'IGNORED',
          duplicate: recorded.duplicate || finalized.duplicate,
          event: finalized.event,
          subscription: null,
        };
      }

      let completion;
      try {
        completion = parseVerifiedCheckoutCompletion(rawPayload, evidence);
      } catch (error) {
        if (error instanceof StripeVerifiedCheckoutIdentityMismatchError) throw error;

        const finalized = await paymentsService.finalizeVerifiedEvent({
          eventId,
          outcome: 'FAILED',
          failureCode: 'STRIPE_CHECKOUT_COMPLETION_INVALID',
        });

        return {
          outcome: 'FAILED',
          duplicate: recorded.duplicate || finalized.duplicate,
          failureCode: 'STRIPE_CHECKOUT_COMPLETION_INVALID',
          event: finalized.event,
          subscription: null,
        };
      }

      try {
        const applied = await paymentsService.applyVerifiedCheckoutCompletion({
          eventId,
          provider: 'stripe',
          externalCheckoutSessionId: completion.externalCheckoutSessionId,
          externalSubscriptionId: completion.externalSubscriptionId,
        });

        return {
          outcome: applied.applied ? 'APPLIED' : 'DUPLICATE',
          duplicate: recorded.duplicate || applied.duplicate,
          event: applied.event,
          subscription: applied.subscription,
        };
      } catch (error) {
        const failureCode =
          error?.code === 'NOT_FOUND'
            ? 'CHECKOUT_ATTEMPT_NOT_FOUND'
            : error?.code === 'CONFLICT'
              ? 'CHECKOUT_COMPLETION_CONFLICT'
              : null;

        if (!failureCode) throw error;

        const finalized = await paymentsService.finalizeVerifiedEvent({
          eventId,
          outcome: 'FAILED',
          failureCode,
        });

        return {
          outcome: 'FAILED',
          duplicate: recorded.duplicate || finalized.duplicate,
          failureCode,
          event: finalized.event,
          subscription: null,
        };
      }
    },
  });
}
