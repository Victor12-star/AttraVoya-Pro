import { describe, expect, it, jest } from '@jest/globals';

import {
  MOBILE_SESSION_KEY,
  createMobileSessionStore,
} from '../src/services/mobile-session-store.js';

const session = Object.freeze({
  accessToken: 'header.payload.signature',
  refreshToken: 'r'.repeat(64),
  refreshExpiresAt: '2026-10-21T10:00:00.000Z',
});

function createSecureStore(overrides = {}) {
  return {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('mobile session store', () => {
  it('writes the complete credential pair as one encrypted value', async () => {
    const secureStore = createSecureStore();
    const store = createMobileSessionStore(secureStore);

    await expect(store.saveSession(session)).resolves.toEqual(session);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      MOBILE_SESSION_KEY,
      JSON.stringify(session),
    );
    await expect(store.getSession()).resolves.toEqual(session);
  });

  it('fails closed and removes malformed persisted sessions', async () => {
    const secureStore = createSecureStore({
      getItemAsync: jest.fn(async () => JSON.stringify({ accessToken: 'only-one-token' })),
    });
    const store = createMobileSessionStore(secureStore);

    await expect(store.getSession()).resolves.toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(MOBILE_SESSION_KEY);
  });

  it('serializes refresh saves and logout cleanup', async () => {
    let releaseSave;
    const secureStore = createSecureStore({
      setItemAsync: jest.fn(
        () =>
          new Promise((resolve) => {
            releaseSave = resolve;
          }),
      ),
    });
    const store = createMobileSessionStore(secureStore);

    const save = store.saveSession(session);
    const clear = store.clearSession();
    await Promise.resolve();
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();

    releaseSave();
    await save;
    await clear;
    await expect(store.getSession()).resolves.toBeNull();
  });

  it('rejects invalid credential envelopes before persistence', async () => {
    const secureStore = createSecureStore();
    const store = createMobileSessionStore(secureStore);

    await expect(
      store.saveSession({ ...session, refreshToken: 'too-short' }),
    ).rejects.toMatchObject({ code: 'MOBILE_SESSION_STORAGE_ERROR' });
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
