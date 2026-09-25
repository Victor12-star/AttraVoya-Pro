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

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(moduleValue.default.logIn).toHaveBeenCalledTimes(1);
    expect(moduleValue.default.logOut).toHaveBeenCalledTimes(1);
  });
});
