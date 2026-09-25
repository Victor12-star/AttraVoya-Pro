function resolvePurchasesModule(moduleValue) {
  const purchases = moduleValue?.default ?? moduleValue;

  if (
    typeof purchases?.configure !== 'function' ||
    typeof purchases?.logIn !== 'function' ||
    typeof purchases?.logOut !== 'function'
  ) {
    throw new TypeError('RevenueCat Purchases native module is unavailable.');
  }

  return purchases;
}

/**
 * Keep the rest of the mobile application independent from RevenueCat's module
 * shape. This adapter intentionally exposes only the identified-user lifecycle
 * required by the server-owned session contract.
 *
 * CustomerInfo returned by RevenueCat is discarded here because local provider
 * state must never become the authorization source for AttraVoya Pro.
 */
export function createRevenueCatPurchasesAdapter(moduleValue) {
  const purchases = resolvePurchasesModule(moduleValue);

  return Object.freeze({
    async configure(configuration) {
      purchases.configure(configuration);
    },

    async logIn(appUserId) {
      await purchases.logIn(appUserId);
    },

    async logOut() {
      await purchases.logOut();
    },
  });
}

export { resolvePurchasesModule };
