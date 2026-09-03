/**
 * Per-plan usage limits. Core budget planning and emergency/safety access are
 * intentionally not disabled for Free users; Premium expands convenience and
 * usage depth rather than removing the product's essential value.
 */
export const PLANS = Object.freeze({
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
});

/** @type {Record<string, Record<string, number | null>>} */
export const PLAN_LIMITS = Object.freeze({
  [PLANS.FREE]: {
    MAX_TRIPS: 1,
    MAX_FAVORITES: 10,
    OFFLINE_MAPS: 0,
  },
  [PLANS.PREMIUM]: {
    MAX_TRIPS: null,
    MAX_FAVORITES: null,
    OFFLINE_MAPS: null,
  },
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
