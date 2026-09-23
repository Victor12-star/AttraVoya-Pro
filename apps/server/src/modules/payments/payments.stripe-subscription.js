import { ValidationError } from '../../errors/app-error.js';

const STRIPE_SUBSCRIPTION_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

const STRIPE_STATUS_MAP = Object.freeze({
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  canceled: 'CANCELED',
  unpaid: 'EXPIRED',
  incomplete: 'EXPIRED',
  incomplete_expired: 'EXPIRED',
  paused: 'EXPIRED',
});

function parseStripeEvent(rawPayload, evidence) {
  let event;
  try {
    event = JSON.parse(rawPayload.toString('utf8'));
  } catch {
    throw new ValidationError('Stripe subscription event payload is invalid.');
  }

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new ValidationError('Stripe subscription event payload is invalid.');
  }

  const eventId = typeof event.id === 'string' ? event.id.trim() : '';
  const eventType = typeof event.type === 'string' ? event.type.trim() : '';
  if (eventId !== evidence.externalEventId || eventType !== evidence.eventType) {
    throw new ValidationError('Stripe verified event identity does not match payload.');
  }

  const object = event.data?.object;
  if (!object || typeof object !== 'object' || Array.isArray(object)) {
    throw new ValidationError('Stripe subscription event object is invalid.');
  }

  return object;
}

function unixDate(value, name, { required = false } = {}) {
  if (value == null) {
    if (required) throw new ValidationError(`${name} is required.`);
    return null;
  }

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ValidationError(`${name} is invalid.`);
  }

  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) {
    throw new ValidationError(`${name} is invalid.`);
  }

  return date;
}

function normalizeSubscriptionState(rawPayload, evidence) {
  const object = parseStripeEvent(rawPayload, evidence);
  const externalSubscriptionId = typeof object.id === 'string' ? object.id.trim() : '';
  const stripeStatus = typeof object.status === 'string' ? object.status.trim().toLowerCase() : '';
  const status = STRIPE_STATUS_MAP[stripeStatus];

  if (!externalSubscriptionId || externalSubscriptionId.length > 255) {
    throw new ValidationError('Stripe subscription identity is invalid.');
  }

  if (!status) {
    throw new ValidationError('Stripe subscription status is unsupported.');
  }

  const currentPeriodEnd = unixDate(object.current_period_end, 'Stripe current period end');
  const canceledAt = unixDate(object.canceled_at, 'Stripe canceled time', {
    required: status === 'CANCELED',
  });

  if (!evidence.occurredAt) {
    throw new ValidationError('Stripe subscription event time is required.');
  }

  return {
    externalSubscriptionId,
    status,
    currentPeriodEnd,
    canceledAt,
    providerStateUpdatedAt: evidence.occurredAt,
  };
}

/**
 * Compose the already-established Stripe verification, verified-event ledger,
 * provider subscription identity, and transactional subscription-state
 * boundaries without exposing an HTTP route.
 *
 * @param {{
 *   verificationBoundary: { verifyEvent: (input: any) => Promise<any> },
 *   paymentsService: {
 *     recordVerifiedEvent: (evidence: any) => Promise<any>,
 *     finalizeVerifiedEvent: (input: any) => Promise<any>,
 *     resolveProviderSubscription: (input: any) => Promise<any>,
 *     applyVerifiedSubscriptionState: (input: any) => Promise<any>
 *   }
 * }} dependencies
 */
export function createStripeSubscriptionEventProcessor({ verificationBoundary, paymentsService }) {
  if (!verificationBoundary?.verifyEvent) {
    throw new TypeError('Stripe billing verification boundary is required.');
  }

  if (
    !paymentsService?.recordVerifiedEvent ||
    !paymentsService?.finalizeVerifiedEvent ||
    !paymentsService?.resolveProviderSubscription ||
    !paymentsService?.applyVerifiedSubscriptionState
  ) {
    throw new TypeError('Payments service is required.');
  }

  return {
    /**
     * @param {{ rawPayload: Buffer, headers?: object }} input
     */
    async process({ rawPayload, headers = {} }) {
      // Authentication happens before any provider data is trusted or parsed
      // into subscription state.
      const evidence = await verificationBoundary.verifyEvent({ rawPayload, headers });
      const recorded = await paymentsService.recordVerifiedEvent(evidence);
      const eventId = recorded.event.id;

      if (!STRIPE_SUBSCRIPTION_EVENT_TYPES.has(evidence.eventType)) {
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

      let state;
      try {
        state = normalizeSubscriptionState(rawPayload, evidence);
      } catch (error) {
        await paymentsService.finalizeVerifiedEvent({
          eventId,
          outcome: 'FAILED',
          failureCode: 'STRIPE_SUBSCRIPTION_STATE_INVALID',
        });
        throw error;
      }

      let subscription;
      try {
        subscription = await paymentsService.resolveProviderSubscription({
          provider: 'stripe',
          externalSubscriptionId: state.externalSubscriptionId,
        });
      } catch (error) {
        if (error?.code === 'NOT_FOUND') {
          const finalized = await paymentsService.finalizeVerifiedEvent({
            eventId,
            outcome: 'FAILED',
            failureCode: 'SUBSCRIPTION_IDENTITY_NOT_FOUND',
          });

          return {
            outcome: 'FAILED',
            duplicate: recorded.duplicate || finalized.duplicate,
            failureCode: 'SUBSCRIPTION_IDENTITY_NOT_FOUND',
            event: finalized.event,
            subscription: null,
          };
        }
        throw error;
      }

      const applied = await paymentsService.applyVerifiedSubscriptionState({
        eventId,
        subscriptionId: subscription.id,
        provider: 'stripe',
        status: state.status,
        currentPeriodEnd: state.currentPeriodEnd,
        canceledAt: state.canceledAt,
        providerStateUpdatedAt: state.providerStateUpdatedAt,
      });

      return {
        outcome: applied.stale
          ? 'IGNORED'
          : applied.applied
            ? 'APPLIED'
            : 'DUPLICATE',
        duplicate: recorded.duplicate || applied.duplicate,
        event: applied.event,
        subscription: applied.subscription,
      };
    },
  };
}
