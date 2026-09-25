import { getRevenueCatAndroidConfiguration } from './revenuecat-config.js';

const REVENUECAT_APP_USER_ID_PATTERN = /^av_rc_[A-Za-z0-9_-]{32}$/;

function invalidIdentity() {
  const error = new Error('The RevenueCat mobile identity response is invalid.');
  error.code = 'INVALID_REVENUECAT_IDENTITY';
  return error;
}

/**
 * Treat the authenticated API response as untrusted input before it reaches the
 * native billing SDK. The App User ID is identity only; it never grants Pro.
 */
export function normalizeRevenueCatAndroidIdentity(value) {
  const appUserId = typeof value?.appUserId === 'string' ? value.appUserId.trim() : '';
  if (!REVENUECAT_APP_USER_ID_PATTERN.test(appUserId)) {
    throw invalidIdentity();
  }

  return Object.freeze({ appUserId });
}

/**
 * Coordinate RevenueCat's identified-user lifecycle without coupling auth code
 * to the native package. A later slice supplies the real Purchases SDK.
 *
 * Purchases.configure is called at most once for this service instance. Later
 * authenticated accounts use logIn, while logout clears only RevenueCat's local
 * customer identity. Server entitlements remain the authorization boundary.
 */
export function createRevenueCatAndroidSession({
  client,
  purchases,
  getConfiguration = getRevenueCatAndroidConfiguration,
}) {
  if (typeof client?.getRevenueCatAndroidIdentity !== 'function') {
    throw new TypeError('RevenueCat Android identity client is required.');
  }
  if (
    typeof purchases?.configure !== 'function' ||
    typeof purchases?.logIn !== 'function' ||
    typeof purchases?.logOut !== 'function'
  ) {
    throw new TypeError('RevenueCat Purchases SDK adapter is required.');
  }
  if (typeof getConfiguration !== 'function') {
    throw new TypeError('RevenueCat Android configuration reader is required.');
  }

  let configured = false;
  let currentAppUserId = null;
  let syncPromise = null;

  async function performAuthenticatedSync() {
    const configuration = getConfiguration();
    if (configuration?.enabled !== true) {
      return Object.freeze({ status: 'disabled' });
    }

    const identity = normalizeRevenueCatAndroidIdentity(
      await client.getRevenueCatAndroidIdentity(),
    );

    if (!configured) {
      await purchases.configure({
        apiKey: configuration.apiKey,
        appUserID: identity.appUserId,
      });
      configured = true;
      currentAppUserId = identity.appUserId;
      return Object.freeze({ status: 'configured' });
    }

    if (currentAppUserId === identity.appUserId) {
      return Object.freeze({ status: 'ready' });
    }

    await purchases.logIn(identity.appUserId);
    currentAppUserId = identity.appUserId;
    return Object.freeze({ status: 'identified' });
  }

  function syncAuthenticatedUser() {
    if (syncPromise) return syncPromise;

    syncPromise = performAuthenticatedSync().finally(() => {
      syncPromise = null;
    });
    return syncPromise;
  }

  async function clearAuthenticatedUser() {
    if (syncPromise) {
      try {
        await syncPromise;
      } catch {
        // Failed initialization leaves no trusted RevenueCat identity to clear.
      }
    }

    if (!configured) {
      return Object.freeze({ status: 'not_configured' });
    }
    if (!currentAppUserId) {
      return Object.freeze({ status: 'anonymous' });
    }

    await purchases.logOut();
    currentAppUserId = null;
    return Object.freeze({ status: 'anonymous' });
  }

  return Object.freeze({
    clearAuthenticatedUser,
    syncAuthenticatedUser,
  });
}

export { REVENUECAT_APP_USER_ID_PATTERN };
