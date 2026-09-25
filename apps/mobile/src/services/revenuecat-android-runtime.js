import { createRevenueCatAndroidSession } from './revenuecat-android-session.js';
import { createRevenueCatPurchasesAdapter } from './revenuecat-purchases-adapter.js';

function defaultPurchasesModuleLoader() {
  return import('react-native-purchases');
}

/**
 * Load the native RevenueCat SDK only when the Android session actually needs
 * it. Disabled Android, iOS and web paths never evaluate the native module.
 *
 * A failed import is not cached permanently so a later authenticated retry can
 * recover after a transient native-module startup failure.
 */
export function createLazyRevenueCatPurchasesAdapter({
  loadModule = defaultPurchasesModuleLoader,
} = {}) {
  if (typeof loadModule !== 'function') {
    throw new TypeError('RevenueCat Purchases module loader is required.');
  }

  let adapterPromise = null;

  async function getAdapter() {
    if (!adapterPromise) {
      adapterPromise = Promise.resolve()
        .then(() => loadModule())
        .then((moduleValue) => createRevenueCatPurchasesAdapter(moduleValue))
        .catch((error) => {
          adapterPromise = null;
          throw error;
        });
    }

    return adapterPromise;
  }

  return Object.freeze({
    async configure(configuration) {
      const adapter = await getAdapter();
      return adapter.configure(configuration);
    },
    async logIn(appUserId) {
      const adapter = await getAdapter();
      return adapter.logIn(appUserId);
    },
    async logOut() {
      const adapter = await getAdapter();
      return adapter.logOut();
    },
  });
}

/**
 * Compose the authenticated API client with RevenueCat's native Android SDK.
 * The session contract remains responsible for platform/config gating and uses
 * only the server-owned opaque RevenueCat App User ID.
 */
export function createRevenueCatAndroidRuntime({
  client,
  loadModule,
  getConfiguration,
}) {
  return createRevenueCatAndroidSession({
    client,
    purchases: createLazyRevenueCatPurchasesAdapter({
      ...(loadModule ? { loadModule } : {}),
    }),
    ...(getConfiguration ? { getConfiguration } : {}),
  });
}
