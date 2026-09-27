const PURCHASE_CANCELLED_ERROR_CODE = '1';
const ALLOWED_PERIODS = new Set(['monthly', 'yearly']);

const RESULT = Object.freeze({
  CANCELLED: Object.freeze({ status: 'cancelled' }),
  COMPLETED: Object.freeze({ status: 'completed' }),
  FAILED: Object.freeze({ status: 'failed' }),
  UNAVAILABLE: Object.freeze({ status: 'unavailable' }),
});

function selectPackage(offerings, period) {
  const current = offerings?.current;
  if (!current) return null;
  return period === 'monthly' ? (current.monthly ?? null) : (current.annual ?? null);
}

function isCancelledPurchase(error) {
  return error?.code === PURCHASE_CANCELLED_ERROR_CODE || error?.userCancelled === true;
}

/**
 * Execute a RevenueCat Android purchase without treating provider state as an
 * AttraVoya entitlement. A successful SDK response means only that the store
 * command completed; callers must still refresh server-verified subscription
 * state before showing Pro access.
 */
export async function executeRevenueCatPurchase({ period, session, purchases }) {
  if (!ALLOWED_PERIODS.has(period)) {
    throw new TypeError('RevenueCat purchase period is invalid.');
  }
  if (typeof session?.syncAuthenticatedUser !== 'function') {
    throw new TypeError('RevenueCat Android session is required.');
  }
  if (
    typeof purchases?.getOfferings !== 'function' ||
    typeof purchases?.purchasePackage !== 'function'
  ) {
    throw new TypeError('RevenueCat Purchases command adapter is required.');
  }

  try {
    const sessionStatus = await session.syncAuthenticatedUser();
    if (sessionStatus?.status === 'disabled') {
      return RESULT.UNAVAILABLE;
    }

    const offerings = await purchases.getOfferings();
    const packageValue = selectPackage(offerings, period);
    if (!packageValue) {
      return RESULT.UNAVAILABLE;
    }

    await purchases.purchasePackage(packageValue);
    return RESULT.COMPLETED;
  } catch (error) {
    return isCancelledPurchase(error) ? RESULT.CANCELLED : RESULT.FAILED;
  }
}
