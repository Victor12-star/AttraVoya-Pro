import { ENTITLEMENTS } from '@attravoya/constants';

import { AuthenticationError, SubscriptionRequiredError } from '../errors/app-error.js';

const ENTITLEMENT_SET = new Set(Object.values(ENTITLEMENTS));

/**
 * Build a Fastify hook that protects a route with one server-authoritative
 * entitlement. The client may use entitlement state for rendering, but this
 * hook is the enforcement boundary for paid capabilities.
 *
 * @param {{ service: { hasEntitlement: Function }, entitlement: string }} options
 */
export function createRequireEntitlementHook({ service, entitlement }) {
  if (!service?.hasEntitlement) {
    throw new TypeError('Entitlements service is required.');
  }

  if (!ENTITLEMENT_SET.has(entitlement)) {
    throw new TypeError('A recognized entitlement is required.');
  }

  return async function requireEntitlement(request) {
    if (!request.auth) {
      throw new AuthenticationError();
    }

    const granted = await service.hasEntitlement({
      userId: request.auth.id,
      entitlement,
    });

    if (!granted) {
      throw new SubscriptionRequiredError();
    }
  };
}
