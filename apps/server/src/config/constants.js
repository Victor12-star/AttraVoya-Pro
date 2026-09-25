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

// Orchestrators must still be able to distinguish a live/ready instance while
// ordinary API traffic is being shed. Give health probes a separate, bounded
// ceiling rather than disabling abuse protection entirely.
export const HEALTH_PROBE_RATE_LIMIT = Object.freeze({
  max: 300,
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

// Stripe can legitimately retry and burst webhook delivery, but the public
// endpoint still needs a separate abuse ceiling from ordinary application API traffic.
export const STRIPE_WEBHOOK_RATE_LIMIT = Object.freeze({
  max: 60,
  timeWindow: '1 minute',
});

// RevenueCat can retry lifecycle deliveries and may send short bursts after a
// store event. Keep webhook abuse isolated from ordinary API traffic.
export const REVENUECAT_WEBHOOK_RATE_LIMIT = Object.freeze({
  max: 60,
  timeWindow: '1 minute',
});

// Creating a hosted checkout session is a credentialed provider write. Keep it
// deliberately tighter than ordinary API traffic; duplicate clicks remain
// idempotent through the server-owned CheckoutAttempt and Stripe key.
export const STRIPE_CHECKOUT_RATE_LIMIT = Object.freeze({
  max: 6,
  timeWindow: '1 minute',
});

export const STRIPE_CHECKOUT_BODY_LIMIT_BYTES = 8 * 1024;

export const STRIPE_PLAN_CATALOG_RATE_LIMIT = Object.freeze({
  max: 30,
  timeWindow: '1 minute',
});
