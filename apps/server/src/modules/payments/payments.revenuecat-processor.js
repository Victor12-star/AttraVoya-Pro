import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import { paymentsRepository } from './payments.repository.js';
import { establishVerifiedRevenueCatAndroidSubscriptionOwnership } from './payments.revenuecat-subscription-ownership.js';
import { RevenueCatVerifiedIdentityMismatchError } from './payments.revenuecat-subscription.js';
import { mapVerifiedRevenueCatAndroidState } from './payments.revenuecat-state-policy.js';
import { resolveVerifiedRevenueCatAndroidTransfer } from './payments.revenuecat-transfer.js';

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

const REVENUECAT_KNOWN_NON_AUTHORITATIVE_EVENT_TYPES = new Set([
  'TEST',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'VIRTUAL_CURRENCY_TRANSACTION',
  'EXPERIMENT_ENROLLMENT',
  'PURCHASE_REDEEMED',
  'REFUND_REVERSED',
  'INVOICE_ISSUANCE',
  'SUBSCRIBER_ALIAS',
  'PRICE_INCREASE_CONSENT_REQUIRED',
  'PRICE_INCREASE_CONSENT_APPROVED',
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
 *   expectedAppId: string,
 *   paymentsService: {
 *     recordVerifiedEvent: (evidence: any) => Promise<any>,
 *     finalizeVerifiedEvent: (input: any) => Promise<any>,
 *     applyVerifiedSubscriptionState: (input: any) => Promise<any>,
 *     applyVerifiedRevenueCatOwnershipTransfer: (input: any) => Promise<any>
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
  expectedAppId,
  paymentsService,
  productPolicy,
  subscriberIdentityService,
  ownershipRepository = paymentsRepository,
}) {
  if (!verificationBoundary?.verifyEvent) {
    throw new TypeError('RevenueCat billing verification boundary is required.');
  }

  if (typeof expectedAppId !== 'string' || !expectedAppId.trim()) {
    throw new TypeError('RevenueCat expected app identity is required.');
  }

  if (
    !paymentsService?.recordVerifiedEvent ||
    !paymentsService?.finalizeVerifiedEvent ||
    !paymentsService?.applyVerifiedSubscriptionState ||
    !paymentsService?.applyVerifiedRevenueCatOwnershipTransfer
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

    if (evidence.eventType === 'TRANSFER') {
      let transfer;
      try {
        transfer = await resolveVerifiedRevenueCatAndroidTransfer({
          rawPayload,
          evidence,
          expectedAppId,
          subscriberIdentityService,
        });
      } catch (error) {
        if (error instanceof RevenueCatVerifiedIdentityMismatchError) throw error;
        if (!isExpectedLifecycleFailure(error)) throw error;

        const failed = await finalizeFailure(eventId, 'REVENUECAT_TRANSFER_OWNERSHIP_UNRESOLVED');
        return {
          ...failed,
          duplicate: recorded.duplicate || failed.duplicate,
        };
      }

      if (transfer.action === 'IGNORE') {
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

      const applied = await paymentsService.applyVerifiedRevenueCatOwnershipTransfer({
        eventId,
        provider: 'revenuecat',
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
        providerStateUpdatedAt: transfer.providerStateUpdatedAt,
      });

      if (applied.sourceMissing) {
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

      return {
        outcome: applied.stale ? 'IGNORED' : applied.applied ? 'APPLIED' : 'DUPLICATE',
        duplicate: recorded.duplicate || applied.duplicate,
        event: applied.event,
        subscription: applied.subscriptions?.[0] ?? null,
      };
    }

    if (!REVENUECAT_SUBSCRIPTION_EVENT_TYPES.has(evidence.eventType)) {
      if (!REVENUECAT_KNOWN_NON_AUTHORITATIVE_EVENT_TYPES.has(evidence.eventType)) {
        const failed = await finalizeFailure(eventId, 'REVENUECAT_EVENT_TYPE_UNSUPPORTED');
        return {
          ...failed,
          duplicate: recorded.duplicate || failed.duplicate,
        };
      }

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
        expectedAppId,
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
      planKey: established.ownership.lifecycle.planKey,
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
