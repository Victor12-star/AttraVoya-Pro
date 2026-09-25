import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import { paymentsRepository } from './payments.repository.js';
import { establishVerifiedRevenueCatAndroidSubscriptionOwnership } from './payments.revenuecat-subscription-ownership.js';
import {
  RevenueCatVerifiedIdentityMismatchError,
} from './payments.revenuecat-subscription.js';
import { mapVerifiedRevenueCatAndroidState } from './payments.revenuecat-state-policy.js';

const REVENUECAT_SUBSCRIPTION_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'BILLING_ISSUE',
  'EXPIRATION',
  'SUBSCRIPTION_PAUSED',
  'SUBSCRIPTION_EXTENDED',
]);

function isExpectedLifecycleFailure(error) {
  return (
    error instanceof ValidationError ||
    error instanceof ConflictError ||
    error instanceof NotFoundError
  );
}

/**
 * Compose RevenueCat verification evidence, the replay-safe billing ledger,
 * server-owned subscriber ownership, and transactional subscription state.
 *
 * This boundary is intentionally internal. A later slice may expose verified
 * RevenueCat webhook ingress, but no HTTP route or client purchase result is
 * trusted here.
 *
 * @param {{
 *   verificationBoundary: { verifyEvent: (input: any) => Promise<any> },
 *   paymentsService: {
 *     recordVerifiedEvent: (evidence: any) => Promise<any>,
 *     finalizeVerifiedEvent: (input: any) => Promise<any>,
 *     applyVerifiedSubscriptionState: (input: any) => Promise<any>
 *   },
 *   productPolicy: { resolvePlanKey: (productId: string) => string },
 *   subscriberIdentityService: { resolveOwnedUser: (input: any) => Promise<any> },
 *   ownershipRepository?: {
 *     createOrReuseProviderSubscriptionOwnership: (input: any) => Promise<any>
 *   }
 * }} dependencies
 */
export function createRevenueCatSubscriptionEventProcessor({
  verificationBoundary,
  paymentsService,
  productPolicy,
  subscriberIdentityService,
  ownershipRepository = paymentsRepository,
}) {
  if (!verificationBoundary?.verifyEvent) {
    throw new TypeError('RevenueCat billing verification boundary is required.');
  }

  if (
    !paymentsService?.recordVerifiedEvent ||
    !paymentsService?.finalizeVerifiedEvent ||
    !paymentsService?.applyVerifiedSubscriptionState
  ) {
    throw new TypeError('Payments service is required.');
  }

  if (!productPolicy?.resolvePlanKey) {
    throw new TypeError('RevenueCat Android product policy is required.');
  }

  if (!subscriberIdentityService?.resolveOwnedUser) {
    throw new TypeError('RevenueCat subscriber identity service is required.');
  }

  async function finalizeFailure(eventId, failureCode) {
    const finalized = await paymentsService.finalizeVerifiedEvent({
      eventId,
      outcome: 'FAILED',
      failureCode,
    });

    return {
      outcome: 'FAILED',
      duplicate: finalized.duplicate,
      failureCode,
      event: finalized.event,
      subscription: null,
    };
  }

  async function processVerified({ rawPayload, evidence }) {
    const recorded = await paymentsService.recordVerifiedEvent(evidence);
    const eventId = recorded.event.id;

    if (!REVENUECAT_SUBSCRIPTION_EVENT_TYPES.has(evidence.eventType)) {
      const finalized = await paymentsService.finalizeVerifiedEvent({
        eventId,
        outcome: 'IGNORED',
      });

      return {
        outcome: 'IGNORED',
        duplicate: recorded.duplicate || finalized.duplicate,
        event: finalized.event,
        subscription: null,
      };
    }

    let decision;
    try {
      decision = mapVerifiedRevenueCatAndroidState({
        rawPayload,
        evidence,
        productPolicy,
      });
    } catch (error) {
      if (error instanceof RevenueCatVerifiedIdentityMismatchError) throw error;
      if (!isExpectedLifecycleFailure(error)) throw error;

      const failed = await finalizeFailure(eventId, 'REVENUECAT_LIFECYCLE_INVALID');
      return {
        ...failed,
        duplicate: recorded.duplicate || failed.duplicate,
      };
    }

    if (decision.action === 'IGNORE') {
      const finalized = await paymentsService.finalizeVerifiedEvent({
        eventId,
        outcome: 'IGNORED',
      });

      return {
        outcome: 'IGNORED',
        duplicate: recorded.duplicate || finalized.duplicate,
        event: finalized.event,
        subscription: null,
      };
    }

    let established;
    try {
      established = await establishVerifiedRevenueCatAndroidSubscriptionOwnership({
        rawPayload,
        evidence,
        productPolicy,
        subscriberIdentityService,
        repository: ownershipRepository,
      });
    } catch (error) {
      if (error instanceof RevenueCatVerifiedIdentityMismatchError) throw error;
      if (!isExpectedLifecycleFailure(error)) throw error;

      const failed = await finalizeFailure(eventId, 'REVENUECAT_OWNERSHIP_UNRESOLVED');
      return {
        ...failed,
        duplicate: recorded.duplicate || failed.duplicate,
      };
    }

    const state = decision.state;
    if (!state) {
      throw new TypeError('RevenueCat state decision is missing an applicable state.');
    }

    const applied = await paymentsService.applyVerifiedSubscriptionState({
      eventId,
      subscriptionId: established.subscription.id,
      provider: 'revenuecat',
      status: state.status,
      currentPeriodEnd: state.currentPeriodEnd,
      canceledAt: state.canceledAt,
      providerStateUpdatedAt: state.providerStateUpdatedAt,
    });

    return {
      outcome: applied.stale ? 'IGNORED' : applied.applied ? 'APPLIED' : 'DUPLICATE',
      duplicate: recorded.duplicate || applied.duplicate,
      event: applied.event,
      subscription: applied.subscription,
    };
  }

  return Object.freeze({
    async process({ rawPayload, headers = {} }) {
      const evidence = await verificationBoundary.verifyEvent({ rawPayload, headers });
      return processVerified({ rawPayload, evidence });
    },

    processVerified,
  });
}
