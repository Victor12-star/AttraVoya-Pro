import { describe, expect, it, jest } from '@jest/globals';

import {
  createRevenueCatPurchasesAdapter,
  resolvePurchasesModule,
} from '../src/services/revenuecat-purchases-adapter.js';

function createNativePurchases() {
  return {
    configure: jest.fn(() => undefined),
    logIn: jest.fn(async () => ({ customerInfo: { entitlements: { active: { pro: {} } } } })),
    logOut: jest.fn(async () => ({ customerInfo: { ignored: true } })),
  };
}

describe('RevenueCat Purchases adapter boundary', () => {
  it('accepts the React Native package default export shape', () => {
    const purchases = createNativePurchases();

    expect(resolvePurchasesModule({ default: purchases })).toBe(purchases);
  });

  it('accepts the direct module shape used by test and compatibility boundaries', () => {
    const purchases = createNativePurchases();

    expect(resolvePurchasesModule(purchases)).toBe(purchases);
  });

  it('rejects an unavailable or incomplete native module', () => {
    for (const moduleValue of [null, {}, { default: {} }]) {
      expect(() => createRevenueCatPurchasesAdapter(moduleValue)).toThrow(
        'RevenueCat Purchases native module is unavailable.',
      );
    }
  });

  it('forwards configure, logIn and logOut without exposing CustomerInfo', async () => {
    const purchases = createNativePurchases();
    const adapter = createRevenueCatPurchasesAdapter({ default: purchases });
    const configuration = {
      apiKey: 'goog_public123',
      appUserID: 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    };

    await expect(adapter.configure(configuration)).resolves.toBeUndefined();
    await expect(adapter.logIn(configuration.appUserID)).resolves.toBeUndefined();
    await expect(adapter.logOut()).resolves.toBeUndefined();

    expect(purchases.configure).toHaveBeenCalledWith(configuration);
    expect(purchases.logIn).toHaveBeenCalledWith(configuration.appUserID);
    expect(purchases.logOut).toHaveBeenCalledTimes(1);
  });

  it('propagates native lifecycle failures so the session layer can fail closed', async () => {
    const purchases = createNativePurchases();
    purchases.logIn.mockRejectedValueOnce(new Error('native login failed'));
    const adapter = createRevenueCatPurchasesAdapter(purchases);

    await expect(adapter.logIn('av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB')).rejects.toThrow(
      'native login failed',
    );
  });
});
