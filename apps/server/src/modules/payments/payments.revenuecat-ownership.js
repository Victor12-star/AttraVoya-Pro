import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import { normalizeVerifiedRevenueCatAndroidLifecycle } from './payments.revenuecat-subscription.js';

const SERVER_APP_USER_ID = /^av_rc_[A-Za-z0-9_-]{32}$/;
const MAX_IDENTITY_LENGTH = 255;
const MAX_ALIASES = 100;

function requiredIdentity(value, name) {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    !value ||
    value.length > MAX_IDENTITY_LENGTH
  ) {
    throw new ValidationError(`${name} is invalid.`);
  }
  return value;
}

function verifiedSubscriberCandidates(rawPayload) {
  let payload;
  try {
    payload = JSON.parse(rawPayload.toString('utf8'));
  } catch {
    throw new ValidationError('RevenueCat subscriber identity payload is invalid.');
  }

  const event = payload?.event;
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new ValidationError('RevenueCat subscriber identity payload is invalid.');
  }

  const appUserId = requiredIdentity(event.app_user_id, 'RevenueCat App User ID');
  const originalAppUserId = requiredIdentity(
    event.original_app_user_id,
    'RevenueCat original App User ID',
  );

  if (!Array.isArray(event.aliases) || event.aliases.length > MAX_ALIASES) {
    throw new ValidationError('RevenueCat aliases are invalid.');
  }

  const aliases = event.aliases.map((value) => requiredIdentity(value, 'RevenueCat alias'));
  const candidates = new Set(
    [appUserId, originalAppUserId, ...aliases].filter((value) => SERVER_APP_USER_ID.test(value)),
  );

  if (candidates.size === 0) {
    throw new NotFoundError('RevenueCat subscriber ownership is not established.');
  }

  if (candidates.size !== 1) {
    throw new ConflictError('RevenueCat subscriber ownership is ambiguous.');
  }

  return [...candidates][0];
}

/**
 * Resolve an authenticated RevenueCat Google Play lifecycle event to exactly one
 * server-owned AttraVoya subscriber identity.
 *
 * The lifecycle normalizer first proves that the evidence belongs to these exact
 * raw bytes and that the store/product/subscription identity is supported. Only
 * then are RevenueCat subscriber identifiers inspected. Anonymous and arbitrary
 * client identifiers are ignored; exactly one server-generated av_rc_* identity
 * must be present across app_user_id, original_app_user_id and aliases.
 *
 * This boundary does not create or mutate subscriptions, grant entitlements,
 * register webhook ingress, or accept a client-supplied App User ID.
 */
export async function resolveVerifiedRevenueCatAndroidOwnership({
  rawPayload,
  evidence,
  productPolicy,
  subscriberIdentityService,
}) {
  if (!subscriberIdentityService?.resolveOwnedUser) {
    throw new TypeError('RevenueCat subscriber identity service is required.');
  }

  const lifecycle = normalizeVerifiedRevenueCatAndroidLifecycle({
    rawPayload,
    evidence,
    productPolicy,
  });

  const appUserId = verifiedSubscriberCandidates(rawPayload);
  const owner = await subscriberIdentityService.resolveOwnedUser({ appUserId });

  return Object.freeze({
    lifecycle,
    owner: Object.freeze({
      userId: owner.userId,
      appUserId: owner.appUserId,
    }),
  });
}
