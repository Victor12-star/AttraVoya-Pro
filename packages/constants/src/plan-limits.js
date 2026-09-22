/**
 * Authoritative commercial plan identifiers.
 *
 * FREE remains genuinely useful. PRO_MONTHLY and PRO_YEARLY share the same
 * product capabilities; billing cadence must never change authorization.
 *
 * PREMIUM is retained only as a legacy data key so older seeded databases can
 * be migrated safely. New subscriptions must never use it, and the entitlement
 * resolver deliberately does not treat it as Pro.
 */
export const PLANS = Object.freeze({
  FREE: 'FREE',
  PRO_MONTHLY: 'PRO_MONTHLY',
  PRO_YEARLY: 'PRO_YEARLY',
  PREMIUM: 'PREMIUM',
});

export const PRO_PLAN_KEYS = Object.freeze([PLANS.PRO_MONTHLY, PLANS.PRO_YEARLY]);

const FREE_LIMITS = Object.freeze({
  MAX_TRIPS: 1,
  MAX_FAVORITES: 10,
  OFFLINE_MAPS: 0,
});

const PRO_LIMITS = Object.freeze({
  MAX_TRIPS: null,
  MAX_FAVORITES: null,
  OFFLINE_MAPS: null,
});

/**
 * Per-plan usage limits. Core budget planning, account security and essential
 * emergency/safety access are intentionally not disabled for Free users.
 */
export const PLAN_LIMITS = Object.freeze({
  [PLANS.FREE]: FREE_LIMITS,
  [PLANS.PRO_MONTHLY]: PRO_LIMITS,
  [PLANS.PRO_YEARLY]: PRO_LIMITS,

  // Fail closed if an old PREMUIM/PREMIUM record is encountered by legacy code.
  // The seed marks this plan inactive and the entitlement service ignores it.
  [PLANS.PREMIUM]: FREE_LIMITS,
});

/**
 * @param {string} plan Plan identifier.
 * @param {string} limit Limit key.
 * @returns {number | null} Configured ceiling, or null when unlimited.
 */
export function getPlanLimit(plan, limit) {
  const limits = PLAN_LIMITS[plan];
  if (!limits) return 0;
  return limits[limit] ?? 0;
}
