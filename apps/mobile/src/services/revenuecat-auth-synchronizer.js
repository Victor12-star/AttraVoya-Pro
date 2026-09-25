const SKIPPED_RESULT = Object.freeze({ status: 'skipped' });
const UNAVAILABLE_RESULT = Object.freeze({ status: 'unavailable' });

/**
 * Serialize RevenueCat identity changes behind the application's authenticated
 * session lifecycle. Provider failures are deliberately contained here because
 * billing identity synchronization must never become the login authorization
 * boundary for AttraVoya.
 */
export function createRevenueCatAuthSynchronizer(session) {
  if (session == null) {
    return Object.freeze({
      onAnonymous: async () => SKIPPED_RESULT,
      onAuthenticated: async () => SKIPPED_RESULT,
    });
  }

  if (
    typeof session.syncAuthenticatedUser !== 'function' ||
    typeof session.clearAuthenticatedUser !== 'function'
  ) {
    throw new TypeError('RevenueCat authentication session is invalid.');
  }

  let transition = Promise.resolve(SKIPPED_RESULT);

  function enqueue(operation) {
    const next = transition.then(async () => {
      try {
        return await operation();
      } catch {
        // Authentication remains server-owned even if the billing SDK is
        // temporarily unavailable or a provider lifecycle operation fails.
        return UNAVAILABLE_RESULT;
      }
    });
    transition = next;
    return next;
  }

  return Object.freeze({
    onAuthenticated() {
      return enqueue(() => session.syncAuthenticatedUser());
    },
    onAnonymous() {
      return enqueue(() => session.clearAuthenticatedUser());
    },
  });
}
