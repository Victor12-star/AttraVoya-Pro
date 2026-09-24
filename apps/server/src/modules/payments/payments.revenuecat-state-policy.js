import { ValidationError } from '../../errors/app-error.js';
import { normalizeVerifiedRevenueCatAndroidLifecycle } from './payments.revenuecat-subscription.js';

const ACCESS_STATE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
]);

const ACCESS_PRESERVING_EVENTS = new Set(['CANCELLATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED']);

function requireSubscriptionExpiration(lifecycle) {
  const { expiresAt, providerStateUpdatedAt } = lifecycle;

  if (!(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime())) {
    throw new ValidationError('RevenueCat subscription expiration is required.');
  }

  if (ACCESS_STATE_EVENTS.has(lifecycle.eventType) && expiresAt <= providerStateUpdatedAt) {
    throw new ValidationError('RevenueCat active subscription expiration must be in the future.');
  }

  return expiresAt;
}

/**
 * Map an already verified RevenueCat Google Play lifecycle event to a safe
 * AttraVoya subscription-state decision.
 *
 * Cancellation, billing issues and scheduled pauses do not revoke access.
 * RevenueCat removes access on EXPIRATION, so those earlier events deliberately
 * produce no authoritative subscription mutation.
 *
 * Sandbox events are also non-entitling. Production access may be granted only
 * from verified production-store lifecycle evidence.
 *
 * @param {{
 *   rawPayload: Buffer,
 *   evidence: object,
 *   productPolicy: { resolvePlanKey: (productId: string) => string }
 * }} input
 */
export function mapVerifiedRevenueCatAndroidState({ rawPayload, evidence, productPolicy }) {
  const lifecycle = normalizeVerifiedRevenueCatAndroidLifecycle({
    rawPayload,
    evidence,
    productPolicy,
  });

  if (lifecycle.environment !== 'PRODUCTION') {
    return Object.freeze({
      action: 'IGNORE',
      reason: 'NON_PRODUCTION',
      lifecycle,
      state: null,
    });
  }

  if (ACCESS_PRESERVING_EVENTS.has(lifecycle.eventType)) {
    return Object.freeze({
      action: 'IGNORE',
      reason: 'ACCESS_REMAINS_UNTIL_EXPIRATION',
      lifecycle,
      state: null,
    });
  }

  const currentPeriodEnd = requireSubscriptionExpiration(lifecycle);

  if (lifecycle.eventType === 'EXPIRATION') {
    return Object.freeze({
      action: 'APPLY',
      reason: null,
      lifecycle,
      state: Object.freeze({
        provider: 'revenuecat',
        externalSubscriptionId: lifecycle.externalSubscriptionId,
        status: 'EXPIRED',
        currentPeriodEnd,
        canceledAt: null,
        providerStateUpdatedAt: lifecycle.providerStateUpdatedAt,
      }),
    });
  }

  if (!ACCESS_STATE_EVENTS.has(lifecycle.eventType)) {
    throw new ValidationError('RevenueCat lifecycle event cannot update subscription state.');
  }

  const status = lifecycle.periodType === 'TRIAL' ? 'TRIALING' : 'ACTIVE';

  return Object.freeze({
    action: 'APPLY',
    reason: null,
    lifecycle,
    state: Object.freeze({
      provider: 'revenuecat',
      externalSubscriptionId: lifecycle.externalSubscriptionId,
      status,
      currentPeriodEnd,
      canceledAt: null,
      providerStateUpdatedAt: lifecycle.providerStateUpdatedAt,
    }),
  });
}
