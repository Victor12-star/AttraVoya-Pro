/**
 * Role identifiers for AttraVoya Pro access control.
 * Stored as a string column in PostgreSQL (see packages/database).
 * Ordering here is authority-ascending for use in `minimumRole` checks.
 */
export const ROLES = Object.freeze({
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

/** Authority-ascending array; a role at index i implies all roles before it. */
export const ROLE_ORDER = /** @type {readonly string[]} */ (
  Object.freeze([ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
);

const KNOWN_ROLES = /** @type {ReadonlySet<string>} */ (new Set(Object.values(ROLES)));

/**
 * @param {string} role A candidate role string.
 * @returns {boolean} True when the string is a known role identifier.
 */
export function isRole(role) {
  return KNOWN_ROLES.has(role);
}

/**
 * @param {string} role Role to test.
 * @param {string} required Minimum required role.
 * @returns {boolean} True when `role` has at least the authority of `required`.
 */
export function roleMeets(role, required) {
  const roleIndex = ROLE_ORDER.indexOf(role);
  const requiredIndex = ROLE_ORDER.indexOf(required);
  if (roleIndex === -1 || requiredIndex === -1) return false;
  return roleIndex >= requiredIndex;
}
