import { ProviderResponseError } from '../../errors/app-error.js';
import { createProviderHttpClient } from '../../integrations/http/provider-http-client.js';

const STRIPE_CHECKOUT_SESSION_URL = 'https://api.stripe.com/v1/checkout/sessions';
const STRIPE_PROVIDER = 'stripe';
const STRIPE_CHECKOUT_HOST = 'checkout.stripe.com';
const DEFAULT_STRIPE_TIMEOUT_MS = 10_000;
const DEFAULT_STRIPE_TOTAL_TIMEOUT_MS = 15_000;

function requiredText(value, name, maxLength) {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} is required.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new TypeError(`${name} is invalid.`);
  }

  return normalized;
}

function validCheckoutUrl(value) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== STRIPE_CHECKOUT_HOST) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function validExpiry(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError('Checkout attempt expiry is invalid.');
  }

  return Math.floor(value.getTime() / 1000);
}

/**
 * Trusted Stripe Checkout API boundary.
 *
 * The caller supplies only server-owned checkout policy and checkout-attempt
 * state. No browser/mobile input is allowed to choose Stripe Price IDs,
 * redirects, idempotency keys, metadata ownership, or subscription mode.
 *
 * @param {{
 *   secretKey: string,
 *   httpClient?: { requestJson: (url: string, options?: any) => Promise<any> },
 * }} options
 */
export function createStripeCheckoutGateway({ secretKey, httpClient }) {
  const normalizedSecret = requiredText(secretKey, 'Stripe secret key', 512);
  const client =
    httpClient ??
    createProviderHttpClient({
      provider: STRIPE_PROVIDER,
      timeoutMs: DEFAULT_STRIPE_TIMEOUT_MS,
      totalTimeoutMs: DEFAULT_STRIPE_TOTAL_TIMEOUT_MS,
      // Checkout creation is a POST. Recovery uses the same durable
      // idempotency key on a later caller retry rather than hidden POST retries.
      retryMax: 0,
      maxConcurrent: 4,
      maxQueued: 12,
      maxQueueWaitMs: 3_000,
    });

  if (typeof client?.requestJson !== 'function') {
    throw new TypeError('Stripe checkout gateway requires an HTTP client.');
  }

  return Object.freeze({
    /**
     * @param {{
     *   attemptId: string,
     *   idempotencyKey: string,
     *   priceId: string,
     *   quantity: number,
     *   successUrl: string,
     *   cancelUrl: string,
     *   expiresAt: Date,
     * }} input
     */
    async createSubscriptionSession({
      attemptId,
      idempotencyKey,
      priceId,
      quantity,
      successUrl,
      cancelUrl,
      expiresAt,
    }) {
      const normalizedAttemptId = requiredText(attemptId, 'attemptId', 128);
      const normalizedIdempotencyKey = requiredText(idempotencyKey, 'idempotencyKey', 255);
      const normalizedPriceId = requiredText(priceId, 'priceId', 255);
      const normalizedSuccessUrl = requiredText(successUrl, 'successUrl', 2048);
      const normalizedCancelUrl = requiredText(cancelUrl, 'cancelUrl', 2048);

      if (!normalizedPriceId.startsWith('price_')) {
        throw new TypeError('Stripe priceId is invalid.');
      }
      if (!Number.isInteger(quantity) || quantity !== 1) {
        throw new TypeError('Stripe checkout quantity must be exactly one.');
      }

      const body = new URLSearchParams();
      body.set('mode', 'subscription');
      body.set('line_items[0][price]', normalizedPriceId);
      body.set('line_items[0][quantity]', '1');
      body.set('success_url', normalizedSuccessUrl);
      body.set('cancel_url', normalizedCancelUrl);
      body.set('expires_at', String(validExpiry(expiresAt)));

      // The opaque server-owned attempt is the only ownership correlation sent
      // to Stripe. Do not send an account email or internal user ID.
      body.set('client_reference_id', normalizedAttemptId);
      body.set('metadata[attravoya_checkout_attempt_id]', normalizedAttemptId);
      body.set('subscription_data[metadata][attravoya_checkout_attempt_id]', normalizedAttemptId);

      const response = await client.requestJson(STRIPE_CHECKOUT_SESSION_URL, {
        method: 'POST',
        retry: false,
        headers: {
          Authorization: `Bearer ${normalizedSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': normalizedIdempotencyKey,
        },
        body: body.toString(),
      });

      const sessionId =
        response && typeof response === 'object' && !Array.isArray(response) ? response.id : null;
      const checkoutUrl =
        response && typeof response === 'object' && !Array.isArray(response)
          ? validCheckoutUrl(response.url)
          : null;

      if (
        typeof sessionId !== 'string' ||
        !sessionId.startsWith('cs_') ||
        response.mode !== 'subscription' ||
        !checkoutUrl
      ) {
        throw new ProviderResponseError('Stripe returned an invalid checkout session.', {
          details: { provider: STRIPE_PROVIDER },
        });
      }

      return Object.freeze({
        id: sessionId,
        url: checkoutUrl,
      });
    },
  });
}

/**
 * Internal orchestration from authenticated account ownership to one Stripe
 * Checkout Session. This service is intentionally not registered as HTTP yet.
 *
 * @param {{
 *   checkoutAttemptService: {
 *     createOrReuse: (input: any) => Promise<any>,
 *     bindStripeSession: (input: any) => Promise<any>,
 *   },
 *   checkoutPolicy: { resolve: (planKey: string) => any },
 *   stripeGateway: { createSubscriptionSession: (input: any) => Promise<any> },
 * }} options
 */
export function createStripeCheckoutSessionService({
  checkoutAttemptService,
  checkoutPolicy,
  stripeGateway,
}) {
  if (!checkoutAttemptService?.createOrReuse || !checkoutAttemptService?.bindStripeSession) {
    throw new TypeError('Stripe checkout session service requires checkout-attempt ownership.');
  }
  if (!checkoutPolicy?.resolve) {
    throw new TypeError('Stripe checkout session service requires checkout policy.');
  }
  if (!stripeGateway?.createSubscriptionSession) {
    throw new TypeError('Stripe checkout session service requires Stripe gateway.');
  }

  return Object.freeze({
    /**
     * @param {{ userId: string, planKey: string }} input
     */
    async create({ userId, planKey }) {
      const ownership = await checkoutAttemptService.createOrReuse({ userId, planKey });
      const trustedPlanKey = ownership.attempt?.plan?.key;
      if (typeof trustedPlanKey !== 'string') {
        throw new TypeError('Checkout attempt is missing its trusted plan identity.');
      }
      const policy = checkoutPolicy.resolve(trustedPlanKey);

      const session = await stripeGateway.createSubscriptionSession({
        attemptId: ownership.attempt.id,
        idempotencyKey: ownership.idempotencyKey,
        priceId: policy.priceId,
        quantity: policy.quantity,
        successUrl: policy.successUrl,
        cancelUrl: policy.cancelUrl,
        expiresAt: ownership.attempt.expiresAt,
      });

      const binding = await checkoutAttemptService.bindStripeSession({
        userId,
        attemptId: ownership.attempt.id,
        externalCheckoutSessionId: session.id,
      });

      return Object.freeze({
        attemptId: binding.attempt.id,
        checkoutSessionId: session.id,
        checkoutUrl: session.url,
        duplicate: ownership.duplicate || binding.duplicate,
      });
    },
  });
}
