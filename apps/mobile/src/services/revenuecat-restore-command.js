const RESULT = Object.freeze({
  COMPLETED: Object.freeze({ status: 'completed' }),
  FAILED: Object.freeze({ status: 'failed' }),
  UNAVAILABLE: Object.freeze({ status: 'unavailable' }),
});

/**
 * Ask RevenueCat to restore store purchases for an explicitly identified
 * AttraVoya user. Completion means only that the provider command finished.
 * Callers must refresh server-verified subscription state before showing Pro.
 */
export async function executeRevenueCatRestore({ session, purchases }) {
  if (typeof session?.syncAuthenticatedUser !== 'function') {
    throw new TypeError('RevenueCat Android session is required.');
  }
  if (typeof purchases?.restorePurchases !== 'function') {
    throw new TypeError('RevenueCat Purchases restore adapter is required.');
  }

  try {
    const sessionStatus = await session.syncAuthenticatedUser();
    if (sessionStatus?.status === 'disabled') {
      return RESULT.UNAVAILABLE;
    }

    await purchases.restorePurchases();
    return RESULT.COMPLETED;
  } catch {
    return RESULT.FAILED;
  }
}
