import { randomBytes } from 'node:crypto';

import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import { paymentsRepository } from './payments.repository.js';

const RANDOM_BYTES = 24;
const MAX_GENERATION_ATTEMPTS = 3;
const APP_USER_ID = /^av_rc_[A-Za-z0-9_-]{32}$/;

function requiredUserId(value) {
  if (typeof value !== 'string') {
    throw new ValidationError('userId is required.');
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    throw new ValidationError('userId is invalid.');
  }

  return normalized;
}

function exactAppUserId(value) {
  if (typeof value !== 'string' || value !== value.trim() || !APP_USER_ID.test(value)) {
    throw new ValidationError('RevenueCat App User ID is invalid.');
  }

  return value;
}

function generateOpaqueAppUserId(randomBytesFn) {
  const bytes = randomBytesFn(RANDOM_BYTES);
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    throw new TypeError('RevenueCat identity generator must return bytes.');
  }

  const normalized = Buffer.from(bytes);
  if (normalized.length !== RANDOM_BYTES) {
    throw new TypeError('RevenueCat identity generator returned an invalid byte length.');
  }

  return `av_rc_${normalized.toString('base64url')}`;
}

/**
 * Server-owned RevenueCat customer identity boundary.
 *
 * The generated App User ID is an opaque non-guessable identifier, not an
 * AttraVoya user ID, email address, entitlement, or authorization credential.
 * A later authenticated mobile slice may obtain only the current user's value
 * and a later verified-webhook slice may resolve it back to that user.
 *
 * This boundary does not trust a client-supplied RevenueCat identity, establish
 * purchase ownership by itself, mutate subscriptions, or grant Pro.
 *
 * @param {{
 *   createOrReuseRevenueCatSubscriberIdentity: (input: any) => Promise<any>,
 *   findRevenueCatSubscriberIdentityByAppUserId: (input: any) => Promise<any>
 * }} [repository]
 * @param {{ randomBytesFn?: typeof randomBytes }} [options]
 */
export function createRevenueCatSubscriberIdentityService(
  repository = paymentsRepository,
  options = {},
) {
  if (
    !repository?.createOrReuseRevenueCatSubscriberIdentity ||
    !repository?.findRevenueCatSubscriberIdentityByAppUserId
  ) {
    throw new TypeError('RevenueCat subscriber identity repository is required.');
  }

  const randomBytesFn = options.randomBytesFn ?? randomBytes;

  return Object.freeze({
    /**
     * Return the stable server-owned RevenueCat App User ID for one authenticated
     * AttraVoya account, creating it once when necessary.
     */
    async getOrCreateForUser({ userId }) {
      const normalizedUserId = requiredUserId(userId);

      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
        const appUserId = generateOpaqueAppUserId(randomBytesFn);
        const result = await repository.createOrReuseRevenueCatSubscriberIdentity({
          userId: normalizedUserId,
          appUserId,
        });

        if (result.identity) {
          return Object.freeze({
            userId: result.identity.userId,
            appUserId: result.identity.appUserId,
            created: Boolean(result.created),
          });
        }

        if (!result.collision) {
          throw new ConflictError('RevenueCat subscriber identity could not be created safely.');
        }
      }

      throw new ConflictError('RevenueCat subscriber identity generation collided repeatedly.');
    },

    /**
     * Resolve only an ID matching the server-owned opaque format. Callers still
     * need verified provider evidence before this lookup can establish billing
     * ownership in a future lifecycle-processing slice.
     */
    async resolveOwnedUser({ appUserId }) {
      const normalizedAppUserId = exactAppUserId(appUserId);
      const identity = await repository.findRevenueCatSubscriberIdentityByAppUserId({
        appUserId: normalizedAppUserId,
      });

      if (!identity) {
        throw new NotFoundError('RevenueCat subscriber identity was not found.');
      }

      return Object.freeze({
        userId: identity.userId,
        appUserId: identity.appUserId,
      });
    },
  });
}

export const revenueCatSubscriberIdentityService = createRevenueCatSubscriberIdentityService();
