import { PRO_PLAN_KEYS } from '@attravoya/constants';

import {
  stripeCheckoutReturnUrlsFromEnvironment,
  stripePurchasePriceIdsFromEnvironment,
} from '../../config/env.js';
import { ServiceUnavailableError, ValidationError } from '../../errors/app-error.js';

/** @type {Set<string>} */
const PRO_PLAN_SET = new Set(PRO_PLAN_KEYS);

/**
 * Build the internal server-owned Stripe checkout policy.
 *
 * This does not call Stripe and is not an HTTP route. It only resolves a
 * recognized AttraVoya plan to deployment-owned billing configuration.
 *
 * @param {Record<string, any>} environment Validated server environment.
 */
export function createStripeCheckoutPolicy(environment) {
  const enabled = environment.STRIPE_PURCHASE_ENABLED === true;
  const priceIds = /** @type {Record<string, string | undefined>} */ (
    stripePurchasePriceIdsFromEnvironment(environment)
  );
  const returnUrls = /** @type {{ successUrl?: string, cancelUrl?: string }} */ (
    stripeCheckoutReturnUrlsFromEnvironment(environment)
  );

  return Object.freeze({
    enabled,

    /**
     * @param {string} planKey Authoritative AttraVoya plan key.
     */
    resolve(planKey) {
      if (!enabled) {
        throw new ServiceUnavailableError('Subscription purchase is not available.');
      }

      if (!PRO_PLAN_SET.has(planKey)) {
        throw new ValidationError('Selected subscription plan is not available.');
      }

      const priceId = priceIds[planKey];
      if (!priceId || !returnUrls.successUrl || !returnUrls.cancelUrl) {
        throw new ServiceUnavailableError('Subscription purchase is not configured.');
      }

      return Object.freeze({
        planKey,
        priceId,
        quantity: 1,
        successUrl: returnUrls.successUrl,
        cancelUrl: returnUrls.cancelUrl,
      });
    },
  });
}
