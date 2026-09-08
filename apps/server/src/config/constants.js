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

// Public provider-backed discovery is more expensive than ordinary API reads.
// Keep typeahead/search usable while bounding automated provider amplification.
export const PROVIDER_SEARCH_RATE_LIMIT = Object.freeze({
  max: 60,
  timeWindow: '1 minute',
});

// Nearby, routing, media, event and news discovery can trigger broader external
// work, so they receive a tighter per-route budget before provider bulkheads act.
export const PROVIDER_DISCOVERY_RATE_LIMIT = Object.freeze({
  max: 30,
  timeWindow: '1 minute',
});
