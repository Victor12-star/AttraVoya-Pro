import { ConflictError } from '../../errors/app-error.js';
import { paymentsRepository } from './payments.repository.js';
import { resolveVerifiedRevenueCatAndroidOwnership } from './payments.revenuecat-ownership.js';

/**
 * Establish non-entitling provider subscription ownership from an already
 * verified RevenueCat Google Play lifecycle event.
 *
 * The verified ownership boundary proves the exact raw provider bytes, maps the
 * Google Play product through server-owned configuration, and resolves exactly
 * one server-owned RevenueCat subscriber identity before this function may
 * persist anything. New subscriptions are always PENDING; this phase does not
 * apply lifecycle status or grant Pro.
 *
 * @param {{
 *   rawPayload: Buffer,
 *   evidence: object,
 *   productPolicy: { resolvePlanKey: (productId: string) => string },
 *   subscriberIdentityService: { resolveOwnedUser: (input: any) => Promise<any> },
 *   repository?: {
 *     createOrReuseProviderSubscriptionOwnership: (input: any) => Promise<any>
 *   }
 * }} input
 */
export async function establishVerifiedRevenueCatAndroidSubscriptionOwnership({
  rawPayload,
  evidence,
  productPolicy,
  subscriberIdentityService,
  repository = paymentsRepository,
}) {
  if (!repository?.createOrReuseProviderSubscriptionOwnership) {
    throw new TypeError('Provider subscription ownership repository is required.');
  }

  const ownership = await resolveVerifiedRevenueCatAndroidOwnership({
    rawPayload,
    evidence,
    productPolicy,
    subscriberIdentityService,
  });

  const result = await repository.createOrReuseProviderSubscriptionOwnership({
    userId: ownership.owner.userId,
    planKey: ownership.lifecycle.planKey,
    provider: 'revenuecat',
    externalSubscriptionId: ownership.lifecycle.externalSubscriptionId,
  });

  if (result.outcome === 'PLAN_NOT_ACTIVE') {
    throw new ConflictError('RevenueCat subscription plan is not available.');
  }

  if (result.outcome === 'PROVIDER_IDENTITY_CONFLICT') {
    throw new ConflictError('RevenueCat subscription ownership conflicts with existing state.');
  }

  if ((result.outcome !== 'CREATED' && result.outcome !== 'EXISTING') || !result.subscription) {
    throw new ConflictError('RevenueCat subscription ownership could not be established safely.');
  }

  if (result.outcome === 'CREATED' && result.subscription.status !== 'PENDING') {
    throw new ConflictError('RevenueCat subscription ownership must begin as pending.');
  }

  return Object.freeze({
    ownership,
    subscription: result.subscription,
    created: result.outcome === 'CREATED',
  });
}
