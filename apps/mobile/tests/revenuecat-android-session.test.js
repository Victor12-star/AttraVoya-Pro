import { describe, expect, it, jest } from '@jest/globals';

import {
  createRevenueCatAndroidSession,
  normalizeRevenueCatAndroidIdentity,
} from '../src/services/revenuecat-android-session.js';

const APP_USER_ID = 'av_rc_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const SECOND_APP_USER_ID = 'av_rc_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const CONFIGURATION = Object.freeze({
  enabled: true,
  apiKey: 'goog_public123',
});

function createDependencies({
  configuration = CONFIGURATION,
  identity = { appUserId: APP_USER_ID },
} = {}) {
  const client = {
    getRevenueCatAndroidIdentity: jest.fn(async () => identity),
  };
  const purchases = {
    configure: jest.fn(async () => undefined),
    logIn: jest.fn(async () => ({ customerInfo: { ignored: true } })),
    logOut: jest.fn(async () => ({ ignored: true })),
  };
  const getConfiguration = jest.fn(() => configuration);

  return { client, purchases, getConfiguration };
}

describe('RevenueCat Android identified-user session', () => {
  it('stays inert while the Android integration is disabled', async () => {
    const dependencies = createDependencies({
      configuration: { enabled: false },
    });
    const session = createRevenueCatAndroidSession(dependencies);

    await expect(session.syncAuthenticatedUser()).resolves.toEqual({
      status: 'disabled',
    });
    expect(dependencies.client.getRevenueCatAndroidIdentity).not.toHaveBeenCalled();
    expect(dependencies.purchases.configure).not.toHaveBeenCalled();
    expect(dependencies.purchases.logIn).not.toHaveBeenCalled();
  });

  it('configures once with the public Google Play key and server-owned App User ID', async () => {
    const dependencies = createDependencies();
    const session = createRevenueCatAndroidSession(dependencies);

    await expect(session.syncAuthenticatedUser()).resolves.toEqual({
      status: 'configured',
    });
    expect(dependencies.purchases.configure).toHaveBeenCalledWith({
      apiKey: CONFIGURATION.apiKey,
      appUserID: APP_USER_ID,
    });
    expect(dependencies.purchases.configure).toHaveBeenCalledTimes(1);
    expect(dependencies.purchases.logIn).not.toHaveBeenCalled();

    await expect(session.syncAuthenticatedUser()).resolves.toEqual({
      status: 'ready',
    });
    expect(dependencies.purchases.configure).toHaveBeenCalledTimes(1);
    expect(dependencies.purchases.logIn).not.toHaveBeenCalled();
  });

  it('coalesces concurrent initialization so configuration runs only once', async () => {
    let releaseIdentity;
    const identityGate = new Promise((resolve) => {
      releaseIdentity = resolve;
    });
    const dependencies = createDependencies();
    dependencies.client.getRevenueCatAndroidIdentity.mockImplementation(async () => {
      await identityGate;
      return { appUserId: APP_USER_ID };
    });
    const session = createRevenueCatAndroidSession(dependencies);

    const first = session.syncAuthenticatedUser();
    const second = session.syncAuthenticatedUser();
    releaseIdentity();

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'configured' },
      { status: 'configured' },
    ]);
    expect(dependencies.client.getRevenueCatAndroidIdentity).toHaveBeenCalledTimes(1);
    expect(dependencies.purchases.configure).toHaveBeenCalledTimes(1);
  });

  it('uses logIn rather than reconfiguring when the authenticated account changes', async () => {
    const dependencies = createDependencies();
    const session = createRevenueCatAndroidSession(dependencies);

    await session.syncAuthenticatedUser();
    dependencies.client.getRevenueCatAndroidIdentity.mockResolvedValueOnce({
      appUserId: SECOND_APP_USER_ID,
    });

    await expect(session.syncAuthenticatedUser()).resolves.toEqual({
      status: 'identified',
    });
    expect(dependencies.purchases.configure).toHaveBeenCalledTimes(1);
    expect(dependencies.purchases.logIn).toHaveBeenCalledWith(SECOND_APP_USER_ID);
    expect(dependencies.purchases.logIn).toHaveBeenCalledTimes(1);
  });

  it('logs out RevenueCat identity without treating SDK customer data as authorization', async () => {
    const dependencies = createDependencies();
    const session = createRevenueCatAndroidSession(dependencies);

    await session.syncAuthenticatedUser();
    await expect(session.clearAuthenticatedUser()).resolves.toEqual({
      status: 'anonymous',
    });
    expect(dependencies.purchases.logOut).toHaveBeenCalledTimes(1);

    await expect(session.clearAuthenticatedUser()).resolves.toEqual({
      status: 'anonymous',
    });
    expect(dependencies.purchases.logOut).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed identity before configuring or identifying the SDK', async () => {
    for (const identity of [
      null,
      {},
      { appUserId: '' },
      { appUserId: 'user-1' },
      { appUserId: 'av_rc_too_short' },
    ]) {
      expect(() => normalizeRevenueCatAndroidIdentity(identity)).toThrow(
        'The RevenueCat mobile identity response is invalid.',
      );
    }

    const dependencies = createDependencies({
      identity: { appUserId: 'user-1' },
    });
    const session = createRevenueCatAndroidSession(dependencies);

    await expect(session.syncAuthenticatedUser()).rejects.toMatchObject({
      code: 'INVALID_REVENUECAT_IDENTITY',
    });
    expect(dependencies.purchases.configure).not.toHaveBeenCalled();
    expect(dependencies.purchases.logIn).not.toHaveBeenCalled();
  });

  it('allows a clean retry after SDK configuration fails', async () => {
    const dependencies = createDependencies();
    dependencies.purchases.configure
      .mockRejectedValueOnce(new Error('native module unavailable'))
      .mockResolvedValueOnce(undefined);
    const session = createRevenueCatAndroidSession(dependencies);

    await expect(session.syncAuthenticatedUser()).rejects.toThrow('native module unavailable');
    await expect(session.syncAuthenticatedUser()).resolves.toEqual({
      status: 'configured',
    });
    expect(dependencies.purchases.configure).toHaveBeenCalledTimes(2);
  });
});
