/**
 * Fine-grained permission identifiers.
 * Permissions are grouped by domain; roles map to permission sets in
 * packages/database (role-permission join) and are enforced server-side via
 * the `authorize` hook. Keep identifiers stable — they are persisted.
 */
export const PERMISSIONS = Object.freeze({
  // Destinations & reference data
  DESTINATIONS_READ: 'destinations:read',
  DESTINATIONS_WRITE: 'destinations:write',
  CITIES_WRITE: 'cities:write',
  COUNTRIES_WRITE: 'countries:write',
  EMERGENCY_READ: 'emergency:read',
  EMERGENCY_WRITE: 'emergency:write',
  PHRASEBOOK_WRITE: 'phrasebook:write',

  // Users & roles
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  ROLES_WRITE: 'roles:write',

  // Platform administration
  PROVIDERS_WRITE: 'providers:write',
  FEATURE_FLAGS_WRITE: 'feature-flags:write',
  AUDIT_READ: 'audit:read',
  SUBSCRIPTIONS_READ: 'subscriptions:read',
  SUBSCRIPTIONS_WRITE: 'subscriptions:write',
});

/** @type {Record<string, string>} Human-readable labels for each permission. */
export const PERMISSION_LABELS = Object.freeze({
  [PERMISSIONS.DESTINATIONS_READ]: 'View destinations',
  [PERMISSIONS.DESTINATIONS_WRITE]: 'Edit destinations',
  [PERMISSIONS.CITIES_WRITE]: 'Edit cities',
  [PERMISSIONS.COUNTRIES_WRITE]: 'Edit countries',
  [PERMISSIONS.EMERGENCY_READ]: 'View emergency information',
  [PERMISSIONS.EMERGENCY_WRITE]: 'Edit emergency information',
  [PERMISSIONS.PHRASEBOOK_WRITE]: 'Edit phrasebook entries',
  [PERMISSIONS.USERS_READ]: 'View users',
  [PERMISSIONS.USERS_WRITE]: 'Edit users',
  [PERMISSIONS.ROLES_WRITE]: 'Edit roles',
  [PERMISSIONS.PROVIDERS_WRITE]: 'Configure providers',
  [PERMISSIONS.FEATURE_FLAGS_WRITE]: 'Toggle feature flags',
  [PERMISSIONS.AUDIT_READ]: 'View audit logs',
  [PERMISSIONS.SUBSCRIPTIONS_READ]: 'View subscriptions',
  [PERMISSIONS.SUBSCRIPTIONS_WRITE]: 'Edit subscriptions',
});
