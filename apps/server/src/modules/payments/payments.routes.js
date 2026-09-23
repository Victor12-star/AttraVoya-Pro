import { DEFAULT_BODY_LIMIT_BYTES, STRIPE_WEBHOOK_RATE_LIMIT } from '../../config/constants.js';
import { paymentsService } from './payments.service.js';
import { createPaymentsController } from './payments.controller.js';
import { createStripeSubscriptionEventProcessor } from './payments.stripe-subscription.js';
import { createStripeWebhookVerifier } from './payments.stripe-verification.js';
import { createBillingVerificationBoundary } from './payments.verification.js';

function createStripeProcessor(options) {
  if (options.stripeWebhookProcessor) return options.stripeWebhookProcessor;

  const verifyStripeWebhook = createStripeWebhookVerifier({
    webhookSecret: options.stripeWebhookSecret,
    toleranceSeconds: options.stripeWebhookToleranceSeconds,
    now: options.now,
  });
  const verificationBoundary = createBillingVerificationBoundary({
    provider: 'stripe',
    verify: verifyStripeWebhook,
    now: options.now,
    maxPayloadBytes: DEFAULT_BODY_LIMIT_BYTES,
  });

  return createStripeSubscriptionEventProcessor({
    verificationBoundary,
    paymentsService: options.paymentsService ?? paymentsService,
  });
}

/**
 * Register payment-provider HTTP ingress.
 *
 * Stripe is opt-in. When disabled, no webhook route or raw-body parser is
 * installed. When enabled, JSON parsing is replaced only inside this
 * encapsulated plugin so the exact provider bytes reach signature verification
 * without changing ordinary API JSON parsing.
 */
export async function paymentsRoutes(app, options = {}) {
  if (!options.stripeWebhookEnabled) return;

  const processor = createStripeProcessor(options);
  const controller = createPaymentsController({
    stripeSubscriptionProcessor: processor,
  });

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(
    'application/json',
    {
      parseAs: 'buffer',
      bodyLimit: DEFAULT_BODY_LIMIT_BYTES,
    },
    (_request, body, done) => done(null, body),
  );

  app.post('/webhooks/stripe', {
    bodyLimit: DEFAULT_BODY_LIMIT_BYTES,
    config: { rateLimit: STRIPE_WEBHOOK_RATE_LIMIT },
    handler: controller.stripeWebhook,
  });
}
