import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';

const DEFAULT_ATTEMPT_TTL_MS = 30 * 60 * 1000;
const PROVIDER = 'stripe';

function requiredText(value, name, maxLength) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${name} is required.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ValidationError(`${name} is invalid.`);
  }

  return normalized;
}

function validNow(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError('A valid current time is required.');
  }
  return value;
}

/**
 * Internal checkout ownership/idempotency boundary.
 *
 * This service does not call Stripe and is not registered as HTTP. It creates
 * the durable server-owned attempt that a later Stripe Checkout Session call
 * must use as its idempotency/ownership anchor.
 *
 * @param {{
 *   repository: {
 *     createOrReuseCheckoutAttempt: (input: any) => Promise<any>,
 *     bindCheckoutSession: (input: any) => Promise<any>,
 *   },
 *   checkoutPolicy: { resolve: (planKey: string) => any },
 *   now?: () => Date,
 *   attemptTtlMs?: number,
 * }} options
 */
export function createCheckoutAttemptService({
  repository,
  checkoutPolicy,
  now = () => new Date(),
  attemptTtlMs = DEFAULT_ATTEMPT_TTL_MS,
}) {
  if (!repository?.createOrReuseCheckoutAttempt || !repository?.bindCheckoutSession) {
    throw new TypeError('Checkout-attempt repository is required.');
  }

  if (!checkoutPolicy?.resolve) {
    throw new TypeError('Stripe checkout policy is required.');
  }

  if (!Number.isInteger(attemptTtlMs) || attemptTtlMs < 60_000 || attemptTtlMs > 86_400_000) {
    throw new TypeError('Checkout-attempt TTL is invalid.');
  }

  return Object.freeze({
    /**
     * @param {{ userId: string, planKey: string }} input
     */
    async createOrReuse({ userId, planKey }) {
      const normalizedUserId = requiredText(userId, 'userId', 128);
      const normalizedPlanKey = requiredText(planKey, 'planKey', 64);

      // Policy resolution proves purchase mode/configuration is currently valid.
      // Price IDs and redirects remain internal and are not persisted here.
      checkoutPolicy.resolve(normalizedPlanKey);

      const currentTime = validNow(now());
      const expiresAt = new Date(currentTime.getTime() + attemptTtlMs);
      const result = await repository.createOrReuseCheckoutAttempt({
        userId: normalizedUserId,
        planKey: normalizedPlanKey,
        provider: PROVIDER,
        now: currentTime,
        expiresAt,
      });

      if (result.outcome === 'PLAN_NOT_FOUND' || !result.attempt) {
        throw new NotFoundError('Subscription plan was not found.');
      }

      if (result.attempt.userId !== normalizedUserId || result.attempt.provider !== PROVIDER) {
        throw new ConflictError('Checkout attempt ownership is invalid.');
      }

      if (result.attempt.plan?.key !== normalizedPlanKey) {
        throw new ConflictError('Another subscription checkout is already in progress.');
      }

      return Object.freeze({
        attempt: result.attempt,
        created: result.created === true,
        duplicate: result.created !== true,
        idempotencyKey: `attravoya-checkout-${result.attempt.id}`,
      });
    },

    /**
     * Persist the Stripe Checkout Session identity returned by a later trusted
     * server-side Stripe API call.
     *
     * @param {{
     *   userId: string,
     *   attemptId: string,
     *   externalCheckoutSessionId: string
     * }} input
     */
    async bindStripeSession({ userId, attemptId, externalCheckoutSessionId }) {
      const normalizedUserId = requiredText(userId, 'userId', 128);
      const normalizedAttemptId = requiredText(attemptId, 'attemptId', 128);
      const normalizedSessionId = requiredText(
        externalCheckoutSessionId,
        'externalCheckoutSessionId',
        255,
      );

      if (!normalizedSessionId.startsWith('cs_')) {
        throw new ValidationError('externalCheckoutSessionId is invalid.');
      }

      const result = await repository.bindCheckoutSession({
        attemptId: normalizedAttemptId,
        userId: normalizedUserId,
        provider: PROVIDER,
        externalCheckoutSessionId: normalizedSessionId,
      });

      if (result.providerIdentityConflict) {
        throw new ConflictError('Stripe Checkout Session is already linked.');
      }

      if (!result.attempt || result.attempt.userId !== normalizedUserId) {
        throw new NotFoundError('Checkout attempt was not found.');
      }

      if (result.attempt.provider !== PROVIDER) {
        throw new ConflictError('Checkout attempt provider is invalid.');
      }

      if (result.transitioned) {
        return Object.freeze({
          attempt: result.attempt,
          duplicate: false,
        });
      }

      if (
        result.attempt.status === 'SESSION_CREATED' &&
        result.attempt.externalCheckoutSessionId === normalizedSessionId
      ) {
        return Object.freeze({
          attempt: result.attempt,
          duplicate: true,
        });
      }

      throw new ConflictError('Checkout attempt cannot accept this Stripe session.');
    },
  });
}
