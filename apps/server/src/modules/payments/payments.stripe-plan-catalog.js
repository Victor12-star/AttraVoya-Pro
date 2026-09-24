import { PLANS } from '@attravoya/constants';

import { ProviderResponseError } from '../../errors/app-error.js';
import {
  createProviderCache,
  loadProviderCacheValue,
} from '../../integrations/http/provider-cache.js';
import { createProviderHttpClient } from '../../integrations/http/provider-http-client.js';

const STRIPE_PRICE_URL = 'https://api.stripe.com/v1/prices/';
const DEFAULT_CACHE_TTL_SECONDS = 300;

const PLAN_DEFINITIONS = Object.freeze([
  Object.freeze({
    planKey: PLANS.PRO_MONTHLY,
    name: 'Pro Monthly',
    interval: 'month',
  }),
  Object.freeze({
    planKey: PLANS.PRO_YEARLY,
    name: 'Pro Yearly',
    interval: 'year',
  }),
]);

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

function safeStripePrice(response, definition, expectedPriceId) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new ProviderResponseError('Stripe returned an invalid subscription price.', {
      details: { provider: 'stripe' },
    });
  }

  const recurring = response.recurring;
  const valid =
    response.id === expectedPriceId &&
    response.object === 'price' &&
    response.active === true &&
    response.type === 'recurring' &&
    response.billing_scheme === 'per_unit' &&
    Number.isInteger(response.unit_amount) &&
    response.unit_amount > 0 &&
    typeof response.currency === 'string' &&
    /^[a-z]{3}$/.test(response.currency) &&
    recurring &&
    typeof recurring === 'object' &&
    recurring.interval === definition.interval &&
    recurring.interval_count === 1 &&
    recurring.usage_type === 'licensed';

  if (!valid) {
    throw new ProviderResponseError('Stripe returned an invalid subscription price.', {
      details: { provider: 'stripe' },
    });
  }

  return Object.freeze({
    planKey: definition.planKey,
    name: definition.name,
    unitAmount: response.unit_amount,
    currency: response.currency,
    interval: definition.interval,
  });
}

/**
 * Server-authoritative display catalog for configured Stripe subscription
 * prices. Price IDs and the Stripe secret never leave this boundary.
 *
 * @param {{
 *   secretKey: string,
 *   priceIds: Record<string, string | undefined>,
 *   httpClient?: { requestJson: (url: string, options?: any) => Promise<any> },
 *   cache?: any,
 *   cacheTtlSeconds?: number,
 * }} options
 */
export function createStripePlanCatalogService({
  secretKey,
  priceIds,
  httpClient,
  cache,
  cacheTtlSeconds = DEFAULT_CACHE_TTL_SECONDS,
}) {
  const normalizedSecret = requiredText(secretKey, 'Stripe secret key', 512);

  if (!priceIds || typeof priceIds !== 'object') {
    throw new TypeError('Stripe Price configuration is required.');
  }
  if (!Number.isInteger(cacheTtlSeconds) || cacheTtlSeconds < 30 || cacheTtlSeconds > 3600) {
    throw new TypeError('Stripe plan catalog cache TTL is invalid.');
  }

  const configured = Object.fromEntries(
    PLAN_DEFINITIONS.map((definition) => [
      definition.planKey,
      requiredText(priceIds[definition.planKey], `${definition.planKey} Stripe Price ID`, 255),
    ]),
  );

  for (const priceId of Object.values(configured)) {
    if (!priceId.startsWith('price_')) {
      throw new TypeError('Stripe Price configuration is invalid.');
    }
  }
  if (configured[PLANS.PRO_MONTHLY] === configured[PLANS.PRO_YEARLY]) {
    throw new TypeError('Stripe Price configuration must use distinct plan identities.');
  }

  const client =
    httpClient ??
    createProviderHttpClient({
      provider: 'stripe',
      timeoutMs: 8_000,
      totalTimeoutMs: 12_000,
      retryMax: 2,
      maxConcurrent: 2,
      maxQueued: 4,
      maxQueueWaitMs: 2_000,
    });
  if (typeof client?.requestJson !== 'function') {
    throw new TypeError('Stripe plan catalog requires an HTTP client.');
  }

  const priceCache =
    cache ??
    createProviderCache({
      maxEntries: 4,
      maxInFlight: 4,
    });

  async function loadPlan(definition) {
    const priceId = configured[definition.planKey];
    const cacheKey = `stripe-plan:${definition.planKey}:${priceId}`;

    return loadProviderCacheValue({
      cache: priceCache,
      key: cacheKey,
      ttlSeconds: cacheTtlSeconds,
      loader: async () => {
        const response = await client.requestJson(
          `${STRIPE_PRICE_URL}${encodeURIComponent(priceId)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${normalizedSecret}`,
            },
          },
        );

        return safeStripePrice(response, definition, priceId);
      },
    });
  }

  return Object.freeze({
    async list() {
      const plans = await Promise.all(PLAN_DEFINITIONS.map(loadPlan));
      return Object.freeze({
        plans: Object.freeze(plans),
      });
    },
  });
}
