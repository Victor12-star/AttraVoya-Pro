/**
 * Entitlement identifiers that gate optional Premium capabilities.
 *
 * Safety rule: basic emergency numbers, nearby hospitals/police/pharmacies,
 * emergency-location tools, and essential emergency phrases are intentionally
 * NOT entitlements. Those functions remain available without a Premium plan.
 */
export const ENTITLEMENTS = Object.freeze({
  OFFLINE_MAPS: 'offline_maps',
  OFFLINE_PHRASEBOOK: 'offline_phrasebook',
  REAL_TIME_SAFETY_ALERTS: 'real_time_safety_alerts',
  ADVANCED_WEATHER: 'advanced_weather',
  ADVANCED_BUDGET_OPTIMIZATION: 'advanced_budget_optimization',
  UNLIMITED_TRIP_PLANNING: 'unlimited_trip_planning',
  UNLIMITED_FAVORITES: 'unlimited_favorites',
  AD_FREE: 'ad_free',
});

/** @type {Record<string, string>} Human-readable labels for each entitlement. */
export const ENTITLEMENT_LABELS = Object.freeze({
  [ENTITLEMENTS.OFFLINE_MAPS]: 'Offline maps',
  [ENTITLEMENTS.OFFLINE_PHRASEBOOK]: 'Offline phrasebook',
  [ENTITLEMENTS.REAL_TIME_SAFETY_ALERTS]: 'Real-time safety alerts',
  [ENTITLEMENTS.ADVANCED_WEATHER]: 'Advanced weather',
  [ENTITLEMENTS.ADVANCED_BUDGET_OPTIMIZATION]: 'Advanced budget optimization',
  [ENTITLEMENTS.UNLIMITED_TRIP_PLANNING]: 'Unlimited trip planning',
  [ENTITLEMENTS.UNLIMITED_FAVORITES]: 'Unlimited favorites',
  [ENTITLEMENTS.AD_FREE]: 'Ad-free experience',
});
