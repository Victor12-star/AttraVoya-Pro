import { PLANS } from '@attravoya/constants';

import { ValidationError } from '../../errors/app-error.js';

const GOOGLE_PLAY_SUBSCRIPTION_ID = /^(?!android\.test)[a-z0-9][a-z0-9._]{0,39}$/;
const GOOGLE_PLAY_BASE_PLAN_ID = /^[a-z0-9][a-z0-9-]*$/;
const MAX_REVENUECAT_PRODUCT_ID_LENGTH = 200;

function normalizeConfiguredProductId(value, planKey) {
  if (typeof value !== 'string') {
    throw new TypeError(`${planKey} RevenueCat product identifier is required.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_REVENUECAT_PRODUCT_ID_LENGTH) {
    throw new TypeError(`${planKey} RevenueCat product identifier is invalid.`);
  }

  const parts = normalized.split(':');
  if (
    parts.length !== 2 ||
    !GOOGLE_PLAY_SUBSCRIPTION_ID.test(parts[0]) ||
    !GOOGLE_PLAY_BASE_PLAN_ID.test(parts[1])
  ) {
    throw new TypeError(`${planKey} RevenueCat product identifier is invalid.`);
  }

  return normalized;
}

/**
 * Create the internal RevenueCat/Google Play product policy.
 *
 * Google Play subscription base plans are represented by RevenueCat as
 * subscription_id:base-plan-id. This policy accepts only the two server-owned
 * configured products and maps them to AttraVoya's internal plan keys.
 *
 * It does not establish subscriber ownership, trust client/App User IDs, grant
 * entitlements, register webhook ingress, or expose provider identifiers.
 *
 * @param {{ productIds: Record<string, string | undefined> }} options
 */
export function createRevenueCatAndroidProductPolicy({ productIds }) {
  if (!productIds || typeof productIds !== 'object' || Array.isArray(productIds)) {
    throw new TypeError('RevenueCat Android product configuration is required.');
  }

  const configured = Object.freeze({
    [PLANS.PRO_MONTHLY]: normalizeConfiguredProductId(
      productIds[PLANS.PRO_MONTHLY],
      PLANS.PRO_MONTHLY,
    ),
    [PLANS.PRO_YEARLY]: normalizeConfiguredProductId(
      productIds[PLANS.PRO_YEARLY],
      PLANS.PRO_YEARLY,
    ),
  });

  if (configured[PLANS.PRO_MONTHLY] === configured[PLANS.PRO_YEARLY]) {
    throw new TypeError('RevenueCat Android products must use distinct identifiers.');
  }

  const planByProductId = new Map(
    Object.entries(configured).map(([planKey, productId]) => [productId, planKey]),
  );

  return Object.freeze({
    /**
     * Resolve an authenticated provider product to an internal plan.
     * Unknown products fail closed and the error deliberately omits the
     * untrusted product identifier.
     */
    resolvePlanKey(productId) {
      if (typeof productId !== 'string' || productId !== productId.trim() || !productId) {
        throw new ValidationError('RevenueCat product identifier is invalid.');
      }

      const planKey = planByProductId.get(productId);
      if (!planKey) {
        throw new ValidationError('RevenueCat product is not supported.');
      }

      return planKey;
    },
  });
}
