/**
 * Feature-flag identifiers.
 * Flags are persisted in PostgreSQL so risky or provider-dependent behaviour
 * can be disabled without redeploying the application.
 */
export const FEATURE_FLAGS = Object.freeze({
  FLIGHTS_ENABLED: 'flights_enabled',
  ACCOMMODATION_INVENTORY_ENABLED: 'accommodation_inventory_enabled',
  TRANSLATION_ENABLED: 'translation_enabled',
  EVENTS_ENABLED: 'events_enabled',
  NEWS_ENABLED: 'news_enabled',
  PAYMENTS_ENABLED: 'payments_enabled',
  PREMIUM_CHECKOUT_ENABLED: 'premium_checkout_enabled',
  NEARBY_ENABLED: 'nearby_enabled',
  BUDGET_PLANNER_ENABLED: 'budget_planner_enabled',
});

/**
 * Only provider-independent features are enabled by default.
 * Premium checkout remains OFF until a real payment provider is configured.
 */
export const DEFAULT_ENABLED_FLAGS = Object.freeze([
  FEATURE_FLAGS.NEARBY_ENABLED,
  FEATURE_FLAGS.BUDGET_PLANNER_ENABLED,
]);
