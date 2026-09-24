import { PLANS } from '@attravoya/constants';
import {
  DEFAULT_BODY_LIMIT_BYTES,
  STRIPE_CHECKOUT_BODY_LIMIT_BYTES,
  STRIPE_CHECKOUT_RATE_LIMIT,
  STRIPE_PLAN_CATALOG_RATE_LIMIT,
  STRIPE_WEBHOOK_RATE_LIMIT,
} from '../../config/constants.js';
import { createCheckoutAttemptService } from './payments.checkout-attempt.js';
import { createStripeCheckoutController } from './payments.checkout-controller.js';
import { createStripePlanCatalogController } from './payments.plan-catalog-controller.js';
import { paymentsRepository } from './payments.repository.js';
import { paymentsSchemas } from './payments.schema.js';
import { paymentsService } from './payments.service.js';
import { createPaymentsController } from './payments.controller.js';
import { createStripeCheckoutCompletionProcessor } from './payments.stripe-checkout-completion.js';
import { createStripeCheckoutPolicy } from './payments.stripe-checkout-policy.js';
import {
  createStripeCheckoutGateway,
  createStripeCheckoutSessionService,
} from './payments.stripe-checkout-session.js';
import { createStripePlanCatalogService } from './payments.stripe-plan-catalog.js';
import { createStripeSubscriptionEventProcessor } from './payments.stripe-subscription.js';
import { createStripeWebhookEventProcessor } from './payments.stripe-webhook.js';
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

  const service = options.paymentsService ?? paymentsService;
  const subscriptionProcessor = createStripeSubscriptionEventProcessor({
    verificationBoundary,
    paymentsService: service,
  });
  const checkoutCompletionProcessor = createStripeCheckoutCompletionProcessor({
    verificationBoundary,
    paymentsService: service,
  });

  return createStripeWebhookEventProcessor({
    verificationBoundary,
    subscriptionProcessor,
    checkoutCompletionProcessor,
  });
}

function createStripeCheckoutService(options) {
  if (options.stripeCheckoutSessionService) {
    return options.stripeCheckoutSessionService;
  }

  const checkoutPolicy =
    options.stripeCheckoutPolicy ??
    createStripeCheckoutPolicy({
      enabled: options.stripePurchaseEnabled,
      priceIds: options.stripePurchasePriceIds,
      returnUrls: options.stripeCheckoutReturnUrls,
    });

  const checkoutAttemptService =
    options.checkoutAttemptService ??
    createCheckoutAttemptService({
      repository: options.paymentsRepository ?? paymentsRepository,
      checkoutPolicy,
      now: options.checkoutNow,
    });

  const stripeGateway =
    options.stripeCheckoutGateway ??
    createStripeCheckoutGateway({
      secretKey: options.stripeSecretKey,
    });

  return createStripeCheckoutSessionService({
    checkoutAttemptService,
    checkoutPolicy,
    stripeGateway,
  });
}

function createStripeCatalogService(options) {
  if (options.stripePlanCatalogService) {
    return options.stripePlanCatalogService;
  }

  return createStripePlanCatalogService({
    secretKey: options.stripeSecretKey,
    priceIds: options.stripePurchasePriceIds,
    httpClient: options.stripePlanCatalogHttpClient,
    cache: options.stripePlanCatalogCache,
  });
}

/**
 * Register payment-provider HTTP ingress.
 *
 * Stripe webhook parsing is isolated to a child Fastify scope so exact raw
 * provider bytes reach signature verification without changing normal JSON
 * parsing for authenticated checkout or the rest of the application.
 */
export async function paymentsRoutes(app, options = {}) {
  const protectedApp = /** @type {any} */ (app);

  app.get('/checkout/availability', {
    onRequest: [protectedApp.authenticate],
    schema: paymentsSchemas.stripeCheckoutAvailability,
    handler: async (_request, reply) => {
      const available = Boolean(options.stripePurchaseEnabled);
      reply.header('Cache-Control', 'private, no-store');
      return reply.code(200).send({
        available,
        planKeys: available ? [PLANS.PRO_MONTHLY, PLANS.PRO_YEARLY] : [],
      });
    },
  });

  if (options.stripePurchaseEnabled) {
    if (!options.stripeWebhookEnabled) {
      throw new TypeError('Stripe purchase requires verified webhook ingress.');
    }

    const checkoutController = createStripeCheckoutController({
      stripeCheckoutSessionService: createStripeCheckoutService(options),
    });
    const catalogController = createStripePlanCatalogController({
      stripePlanCatalogService: createStripeCatalogService(options),
    });

    app.get('/checkout/stripe/plans', {
      onRequest: [protectedApp.authenticate],
      config: { rateLimit: STRIPE_PLAN_CATALOG_RATE_LIMIT },
      schema: paymentsSchemas.stripePlanCatalog,
      handler: catalogController.list,
    });

    app.post('/checkout/stripe', {
      onRequest: [protectedApp.authenticate],
      bodyLimit: STRIPE_CHECKOUT_BODY_LIMIT_BYTES,
      config: { rateLimit: STRIPE_CHECKOUT_RATE_LIMIT },
      schema: paymentsSchemas.stripeCheckout,
      handler: checkoutController.create,
    });
  }

  if (!options.stripeWebhookEnabled) return;

  const processor = createStripeProcessor(options);
  const controller = createPaymentsController({
    stripeWebhookProcessor: processor,
  });

  await app.register(async function stripeWebhookIngress(webhookApp) {
    webhookApp.removeContentTypeParser('application/json');
    webhookApp.addContentTypeParser(
      'application/json',
      {
        parseAs: 'buffer',
        bodyLimit: DEFAULT_BODY_LIMIT_BYTES,
      },
      (_request, body, done) => done(null, body),
    );

    webhookApp.post('/webhooks/stripe', {
      bodyLimit: DEFAULT_BODY_LIMIT_BYTES,
      config: { rateLimit: STRIPE_WEBHOOK_RATE_LIMIT },
      handler: controller.stripeWebhook,
    });
  });
}
