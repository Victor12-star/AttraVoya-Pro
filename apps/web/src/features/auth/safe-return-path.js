const ALLOWED_RETURN_PATHS = new Set(['/delete-account']);

/**
 * Authentication redirects are allowlisted so query parameters can never send
 * a signed-in traveller to an external or attacker-controlled destination.
 */
export function safeAuthReturnPath(value, fallback = '/trips') {
  return typeof value === 'string' && ALLOWED_RETURN_PATHS.has(value) ? value : fallback;
}
