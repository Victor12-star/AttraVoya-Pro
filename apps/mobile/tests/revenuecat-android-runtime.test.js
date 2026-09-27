import { describe, expect, it, jest } from '@jest/globals';

import {
  createLazyRevenueCatPurchasesAdapter,
  createRevenueCatAndroidRuntime,
} from '../src/services/revenuecat-android-runtime.js';

const APP_USER_ID = 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function createNativeModule() {
  return {
    default: {
      configure: jest.fn(() => undefined),
      logIn: jest.fn(async () => ({ customerInfo: { ignored: true } })),
      logOut: jest.fn(async () => ({ customerInfo: { ignored: true } })),
      getOfferings: jest.fn(async () => ({ current: null, all: {} })),
    },
  };
}

describe('RevenueCat Android native runtime', () => {
  it('does not load the native SDK while RevenueCat Android is disabled', async () => {
    const loadModule = jest.fn(async () => createNativeModule());
    const client = {
      getRevenueCatAndroidIdentity: jest.fn(async () => ({ appUserId: APP_USER_ID })),
    };
    const session = createRevenueCatAndroidRuntime({
      client,
      loadModule,
      getConfiguration: () => ({ enabled: false }),
    });

    await expect(session.syncAuthenticatedUser()).resolves.toEqual({ status: 'disabled' });

    expect(loadModule).not.toHaveBeenCalled();
    expect(client.getRevenueCatAndroidIdentity).not.toHaveBeenCalled();
  });

  it('loads the native SDK once when authenticated Android billing is enabled', async () => {
    const moduleValue = createNativeModule();
    const loadModule = jest.fn(async () => moduleValue);
    const client = {
      getRevenueCatAndroidIdentity: jest.fn(async () => ({ appUserId: APP_USER_ID })),
    };
    const session = createRevenueCatAndroidRuntime({
      client,
      loadModule,
      getConfiguration: () => ({ enabled: true, apiKey: 'goog_public123' }),
    });

    await expect(session.syncAuthenticatedUser()).resolves.toEqual({ status: 'configured' });
    await expect(session.syncAuthenticatedUser()).resolves.toEqual({ status: 'ready' });

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(moduleValue.default.configure).toHaveBeenCalledWith({
      apiKey: 'goog_public123',
      appUserID: APP_USER_ID,
    });
    expect(moduleValue.default.configure).toHaveBeenCalledTimes(1);
  });

  it('loads the normalized catalog through the same identified runtime', async () => {
    const moduleValue = createNativeModule();
    moduleValue.default.getOfferings.mockResolvedValueOnce({
      current: {
        monthly: {
          packageType: 'MONTHLY',
          product: { priceString: 'SEK 49.00' },
        },
        annual: {
          packageType: 'ANNUAL',
          product: { priceString: 'SEK 399.00' },
        },
      },
      all: {},
    });
    const loadModule = jest.fn(async () => moduleValue);
    const client = {
      getRevenueCatAndroidIdentity: jest.fn(async () => ({ appUserId: APP_USER_ID })),
    };
    const runtime = createRevenueCatAndroidRuntime({
      client,
      loadModule,
      getConfiguration: () => ({ enabled: true, apiKey: 'goog_public123' }),
    });

    await expect(runtime.loadOfferingCatalog()).resolves.toEqual([
      { period: 'monthly', price: 'SEK 49.00' },
      { period: 'yearly', price: 'SEK 399.00' },
    ]);

    expect(moduleValue.default.configure).toHaveBeenCalledTimes(1);
    expect(moduleValue.default.getOfferings).toHaveBeenCalledTimes(1);
    expect(loadModule).toHaveBeenCalledTimes(1);
  });

  it('does not load the native SDK when catalog access is disabled', async () => {
    const loadModule = jest.fn(async () => createNativeModule());
    const client = {
      getRevenueCatAndroidIdentity: jest.fn(async () => ({ appUserId: APP_USER_ID })),
    };
    const runtime = createRevenueCatAndroidRuntime({
      client,
      loadModule,
      getConfiguration: () => ({ enabled: false }),
    });

    await expect(runtime.loadOfferingCatalog()).resolves.toEqual([]);

    expect(loadModule).not.toHaveBeenCalled();
    expect(client.getRevenueCatAndroidIdentity).not.toHaveBeenCalled();
  });

  it('allows a clean native module import retry after startup failure', async () => {
    const moduleValue = createNativeModule();
    const loadModule = jest
      .fn()
      .mockRejectedValueOnce(new Error('native module startup failed'))
      .mockResolvedValueOnce(moduleValue);
    const adapter = createLazyRevenueCatPurchasesAdapter({ loadModule });

    await expect(
      adapter.configure({
        apiKey: 'goog_public123',
        appUserID: APP_USER_ID,
      }),
    ).rejects.toThrow('native module startup failed');

    await expect(
      adapter.configure({
        apiKey: 'goog_public123',
        appUserID: APP_USER_ID,
      }),
    ).resolves.toBeUndefined();

    expect(loadModule).toHaveBeenCalledTimes(2);
    expect(moduleValue.default.configure).toHaveBeenCalledTimes(1);
  });

  it('shares one lazy native adapter across configure, login and logout', async () => {
    const moduleValue = createNativeModule();
    const loadModule = jest.fn(async () => moduleValue);
    const adapter = createLazyRevenueCatPurchasesAdapter({ loadModule });

    await adapter.configure({ apiKey: 'goog_public123', appUserID: APP_USER_ID });
    await adapter.logIn('av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    await adapter.logOut();
    await adapter.getOfferings();

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(moduleValue.default.logIn).toHaveBeenCalledTimes(1);
    expect(moduleValue.default.logOut).toHaveBeenCalledTimes(1);
    expect(moduleValue.default.getOfferings).toHaveBeenCalledTimes(1);
  });
});
