import { PRO_PLAN_KEYS } from '@attravoya/constants';

import { ServiceUnavailableError, ValidationError } from '../../errors/app-error.js';

/** @type {Set<string>} */
const PRO_PLAN_SET = new Set(PRO_PLAN_KEYS);

/**
 * Build the internal server-owned Stripe checkout policy from configuration
 * that has already passed startup validation.
 *
 * This does not call Stripe, read process environment, or register an HTTP
 * route. Keeping configuration injection explicit makes this policy deterministic
 * in tests and prevents hidden startup side effects.
 *
 * @param {{
 *   enabled?: boolean,
 *   priceIds?: Record<string, string | undefined>,
 *   returnUrls?: { successUrl?: string, cancelUrl?: string },
 * }} [configuration]
 */
export function createStripeCheckoutPolicy(configuration = {}) {
  const enabled = configuration.enabled === true;
  const priceIds = configuration.priceIds ?? {};
  const returnUrls = configuration.returnUrls ?? {};

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
