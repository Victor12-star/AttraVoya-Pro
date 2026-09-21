import { describe, expect, it, jest } from '@jest/globals';

import {
  MOBILE_ACCESS_TOKEN_KEY,
  createMobileAccessTokenStore,
} from '../src/services/access-token-store.js';

function createSecureStore(overrides = {}) {
  return {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('mobile access-token store', () => {
  it('loads a valid token once and serves later reads from memory', async () => {
    const secureStore = createSecureStore({
      getItemAsync: jest.fn(async () => 'header.payload.signature'),
    });
    const store = createMobileAccessTokenStore(secureStore);

    await expect(store.getAccessToken()).resolves.toBe('header.payload.signature');
    await expect(store.getAccessToken()).resolves.toBe('header.payload.signature');
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStore.getItemAsync).toHaveBeenCalledWith(MOBILE_ACCESS_TOKEN_KEY);
  });

  it('fails closed and removes malformed stored credentials', async () => {
    const secureStore = createSecureStore({
      getItemAsync: jest.fn(async () => 'token with spaces'),
    });
    const store = createMobileAccessTokenStore(secureStore);

    await expect(store.getAccessToken()).resolves.toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(MOBILE_ACCESS_TOKEN_KEY);
  });

  it('treats unavailable secure storage as signed out', async () => {
    const secureStore = createSecureStore({
      getItemAsync: jest.fn(async () => {
        throw new Error('native keystore unavailable');
      }),
    });
    const store = createMobileAccessTokenStore(secureStore);

    await expect(store.getAccessToken()).resolves.toBeNull();
  });

  it('rejects malformed tokens before writing them', async () => {
    const secureStore = createSecureStore();
    const store = createMobileAccessTokenStore(secureStore);

    await expect(store.saveAccessToken('')).rejects.toMatchObject({
      code: 'MOBILE_TOKEN_STORAGE_ERROR',
      message: 'The secure mobile session could not be updated.',
    });
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('serializes save and logout so a delayed save cannot restore the token', async () => {
    let releaseSave;
    const secureStore = createSecureStore({
      setItemAsync: jest.fn(
        () =>
          new Promise((resolve) => {
            releaseSave = resolve;
          }),
      ),
    });
    const store = createMobileAccessTokenStore(secureStore);

    const save = store.saveAccessToken('header.payload.signature');
    const clear = store.clearAccessToken();
    await Promise.resolve();

    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
    releaseSave();
    await save;
    await clear;

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(MOBILE_ACCESS_TOKEN_KEY);
    await expect(store.getAccessToken()).resolves.toBeNull();
  });

  it('overwrites with an invalid sentinel when secure deletion fails', async () => {
    const secureStore = createSecureStore({
      deleteItemAsync: jest.fn(async () => {
        throw new Error('delete unavailable');
      }),
    });
    const store = createMobileAccessTokenStore(secureStore);

    await expect(store.clearAccessToken()).resolves.toBeUndefined();
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(MOBILE_ACCESS_TOKEN_KEY, '');
    await expect(store.getAccessToken()).resolves.toBeNull();
  });
});
