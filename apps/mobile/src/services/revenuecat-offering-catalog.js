const PACKAGE_TYPES = Object.freeze({
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL',
});

function safePrice(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= 80 ? normalized : null;
}

function normalizePackage(packageValue, expectedType) {
  if (!packageValue || packageValue.packageType !== expectedType) return null;
  const price = safePrice(packageValue.product?.priceString);
  if (!price) return null;

  return Object.freeze({
    period: expectedType === PACKAGE_TYPES.MONTHLY ? 'monthly' : 'yearly',
    price,
  });
}

/**
 * Reduce RevenueCat's provider response to the only display fields needed by
 * AttraVoya. Product identifiers, offering identifiers, CustomerInfo and other
 * provider metadata are deliberately excluded from the returned catalog.
 */
export function normalizeRevenueCatOfferingCatalog(value) {
  const current = value?.current;
  if (!current) return Object.freeze([]);

  const plans = [
    normalizePackage(current.monthly, PACKAGE_TYPES.MONTHLY),
    normalizePackage(current.annual, PACKAGE_TYPES.ANNUAL),
  ].filter(Boolean);

  return Object.freeze(plans);
}

/**
 * Read the current RevenueCat offering after the identified session is ready.
 * This function never grants access and never performs a purchase.
 */
export async function loadRevenueCatOfferingCatalog({ session, purchases }) {
  if (typeof session?.syncAuthenticatedUser !== 'function') {
    throw new TypeError('RevenueCat Android session is required.');
  }
  if (typeof purchases?.getOfferings !== 'function') {
    throw new TypeError('RevenueCat Purchases offerings adapter is required.');
  }

  const status = await session.syncAuthenticatedUser();
  if (status?.status === 'disabled') {
    return Object.freeze([]);
  }

  return normalizeRevenueCatOfferingCatalog(await purchases.getOfferings());
}
