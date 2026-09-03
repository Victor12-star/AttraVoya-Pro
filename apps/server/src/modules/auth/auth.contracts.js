/**
 * Shared authentication constants that are intentionally kept out of route
 * handlers so cookie/session behaviour is consistent across login, refresh,
 * logout, and future mobile/web authentication clients.
 */
export const AUTH_COOKIES = Object.freeze({
  ACCESS: 'attravoya_access',
  REFRESH: 'attravoya_refresh',
});

export const AUTH_TOKEN_BYTES = 48;

/**
 * Hash opaque one-time/session tokens before storing them in PostgreSQL.
 * A database leak must not immediately reveal usable verification, reset, or
 * refresh credentials.
 */
export const TOKEN_HASH_ALGORITHM = 'sha256';
