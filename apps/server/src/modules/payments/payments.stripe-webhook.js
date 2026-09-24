const CHECKOUT_COMPLETION_EVENT_TYPE = 'checkout.session.completed';

/**
 * Route a Stripe webhook only after the shared verification boundary has
 * authenticated the exact raw request bytes and minted trusted event evidence.
 *
 * Event type is never read from unverified JSON for dispatch decisions.
 *
 * @param {{
 *   verificationBoundary: { verifyEvent: (input: any) => Promise<any> },
 *   subscriptionProcessor: { processVerified: (input: any) => Promise<any> },
 *   checkoutCompletionProcessor: { processVerified: (input: any) => Promise<any> },
 * }} dependencies
 */
export function createStripeWebhookEventProcessor({
  verificationBoundary,
  subscriptionProcessor,
  checkoutCompletionProcessor,
}) {
  if (!verificationBoundary?.verifyEvent) {
    throw new TypeError('Stripe billing verification boundary is required.');
  }
  if (!subscriptionProcessor?.processVerified) {
    throw new TypeError('Stripe subscription processor is required.');
  }
  if (!checkoutCompletionProcessor?.processVerified) {
    throw new TypeError('Stripe checkout completion processor is required.');
  }

  return Object.freeze({
    /**
     * @param {{ rawPayload: Buffer, headers?: object }} input
     */
    async process({ rawPayload, headers = {} }) {
      const evidence = await verificationBoundary.verifyEvent({ rawPayload, headers });

      if (evidence.eventType === CHECKOUT_COMPLETION_EVENT_TYPE) {
        return checkoutCompletionProcessor.processVerified({
          rawPayload,
          evidence,
        });
      }

      return subscriptionProcessor.processVerified({
        rawPayload,
        evidence,
      });
    },
  });
}
