import { createContext, useContext } from 'react';

const MobileBillingContext = createContext(/** @type {any} */ (null));

/**
 * Share the single RevenueCat runtime created at the application root. Keeping
 * one runtime avoids duplicate native SDK configuration or identity races.
 *
 * @param {{children: import('react').ReactNode, revenueCatRuntime: any}} props
 */
export function MobileBillingProvider({ children, revenueCatRuntime }) {
  if (
    typeof revenueCatRuntime?.loadOfferingCatalog !== 'function' ||
    typeof revenueCatRuntime?.purchasePlan !== 'function' ||
    typeof revenueCatRuntime?.restorePurchases !== 'function'
  ) {
    throw new TypeError('RevenueCat mobile billing runtime is invalid.');
  }

  return (
    <MobileBillingContext.Provider value={revenueCatRuntime}>
      {children}
    </MobileBillingContext.Provider>
  );
}

export function useMobileBilling() {
  const value = useContext(MobileBillingContext);
  if (!value) {
    throw new Error('useMobileBilling must be used inside MobileBillingProvider.');
  }
  return value;
}
