import { createRevenueCatAndroidSession } from './revenuecat-android-session.js';
import { getRevenueCatAndroidConfiguration } from './revenuecat-config.js';
import { loadRevenueCatOfferingCatalog } from './revenuecat-offering-catalog.js';
import { executeRevenueCatPurchase } from './revenuecat-purchase-command.js';
import { createRevenueCatPurchasesAdapter } from './revenuecat-purchases-adapter.js';
import { executeRevenueCatRestore } from './revenuecat-restore-command.js';

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
    async getOfferings() {
      const adapter = await getAdapter();
      return adapter.getOfferings();
    },
    async purchasePackage(packageValue) {
      const adapter = await getAdapter();
      return adapter.purchasePackage(packageValue);
    },
    async restorePurchases() {
      const adapter = await getAdapter();
      return adapter.restorePurchases();
    },
  });
}

/**
 * Compose the authenticated API client with RevenueCat's native Android SDK.
 * The session contract remains responsible for platform/config gating and uses
 * only the server-owned opaque RevenueCat App User ID.
 *
 * @param {{
 *   client: any,
 *   loadModule?: () => Promise<any>,
 *   getConfiguration?: () => any
 * }} options
 */
export function createRevenueCatAndroidRuntime({ client, loadModule, getConfiguration }) {
  const configurationReader = getConfiguration ?? getRevenueCatAndroidConfiguration;
  const purchases = createLazyRevenueCatPurchasesAdapter({
    ...(loadModule ? { loadModule } : {}),
  });
  const session = createRevenueCatAndroidSession({
    client,
    purchases,
    getConfiguration: configurationReader,
  });

  return Object.freeze({
    isAvailable() {
      try {
        return configurationReader()?.enabled === true;
      } catch {
        return false;
      }
    },
    syncAuthenticatedUser() {
      return session.syncAuthenticatedUser();
    },
    clearAuthenticatedUser() {
      return session.clearAuthenticatedUser();
    },
    loadOfferingCatalog() {
      return loadRevenueCatOfferingCatalog({ session, purchases });
    },
    purchasePlan(period) {
      return executeRevenueCatPurchase({ period, session, purchases });
    },
    restorePurchases() {
      return executeRevenueCatRestore({ session, purchases });
    },
  });
}
