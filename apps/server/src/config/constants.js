export const APP_NAME = 'AttraVoya Pro';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Keep JSON/API request bodies deliberately bounded so malformed or abusive
// clients cannot force the server to buffer arbitrarily large payloads. The
// current API contracts are all comfortably below this ceiling.
export const DEFAULT_BODY_LIMIT_BYTES = 256 * 1024;

export const DEFAULT_RATE_LIMIT = Object.freeze({
  max: 120,
  timeWindow: '1 minute',
});
