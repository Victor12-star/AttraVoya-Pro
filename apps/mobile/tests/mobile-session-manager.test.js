import { describe, expect, it, jest } from '@jest/globals';

import { createMobileSessionManager } from '../src/services/mobile-session-manager.js';

const now = Date.parse('2026-09-21T12:00:00.000Z');

function accessToken(expiresAt) {
  const payload = globalThis.btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1_000) }));
  return `header.${payload}.signature`;
}

function session(overrides = {}) {
  return {
    accessToken: accessToken(now + 5_000),
    refreshToken: 'r'.repeat(64),
    refreshExpiresAt: '2026-10-21T12:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'user-1@example.test',
      roles: ['USER'],
      emailVerified: true,
    },
    ...overrides,
  };
}

function sessionResponse(value) {
  return new globalThis.Response(
    JSON.stringify({
      ...value,
      user: {
        id: 'user-1',
        email: 'user-1@example.test',
        roles: ['USER'],
        emailVerified: true,
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function createStore(initialSession) {
  let current = initialSession;
  return {
    getSession: jest.fn(async () => current),
    saveSession: jest.fn(async (value) => {
      current = value;
      return value;
    }),
    clearSession: jest.fn(async () => {
      current = null;
    }),
  };
}

describe('mobile session manager', () => {
  it('coalesces concurrent refreshes into one token rotation', async () => {
    const store = createStore(session());
    const refreshed = session({
      accessToken: accessToken(now + 15 * 60_000),
      refreshToken: 'n'.repeat(64),
    });
    const fetchImpl = jest.fn(async () => sessionResponse(refreshed));
    const manager = createMobileSessionManager({
      baseUrl: 'https://api.attravoya.example',
      fetchImpl,
      store,
      now: () => now,
    });

    const tokens = await Promise.all([
      manager.getAccessToken(),
      manager.getAccessToken(),
      manager.getAccessToken(),
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(tokens).toEqual(Array(3).fill(refreshed.accessToken));
    expect(store.saveSession).toHaveBeenCalledTimes(1);
  });

  it('does not refresh a token outside the renewal window', async () => {
    const current = session({ accessToken: accessToken(now + 5 * 60_000) });
    const store = createStore(current);
    const fetchImpl = jest.fn();
    const manager = createMobileSessionManager({
      baseUrl: 'https://api.attravoya.example',
      fetchImpl,
      store,
      now: () => now,
    });

    await expect(manager.getAccessToken()).resolves.toBe(current.accessToken);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('clears a rejected refresh session but preserves it during an offline failure', async () => {
    const expiredStore = createStore(session());
    const unauthorizedManager = createMobileSessionManager({
      baseUrl: 'https://api.attravoya.example',
      fetchImpl: async () =>
        new globalThis.Response(JSON.stringify({ error: { message: 'Expired' } }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      store: expiredStore,
      now: () => now,
    });

    await expect(unauthorizedManager.getAccessToken()).rejects.toMatchObject({
      code: 'MOBILE_SESSION_EXPIRED',
    });
    expect(expiredStore.clearSession).toHaveBeenCalledTimes(1);

    const offlineStore = createStore(session());
    const offlineManager = createMobileSessionManager({
      baseUrl: 'https://api.attravoya.example',
      fetchImpl: async () => {
        throw new TypeError('offline');
      },
      store: offlineStore,
      now: () => now,
    });

    await expect(offlineManager.getAccessToken()).rejects.toMatchObject({
      code: 'MOBILE_SESSION_NETWORK_ERROR',
    });
    expect(offlineStore.clearSession).not.toHaveBeenCalled();
  });

  it('always clears the local session when remote logout fails', async () => {
    const store = createStore(session());
    const manager = createMobileSessionManager({
      baseUrl: 'https://api.attravoya.example',
      fetchImpl: async () => {
        throw new TypeError('offline');
      },
      store,
      now: () => now,
    });

    await expect(manager.logout()).rejects.toMatchObject({ code: 'MOBILE_SESSION_NETWORK_ERROR' });
    expect(store.clearSession).toHaveBeenCalledTimes(1);
  });

  it('restores validated identity and refreshes legacy envelopes that lack it', async () => {
    const current = session({ accessToken: accessToken(now + 5 * 60_000) });
    const currentStore = createStore(current);
    const currentManager = createMobileSessionManager({
      baseUrl: 'https://api.attravoya.example',
      fetchImpl: jest.fn(),
      store: currentStore,
      now: () => now,
    });

    await expect(currentManager.restore()).resolves.toEqual(current);

    const legacy = { ...current, user: null };
    const legacyStore = createStore(legacy);
    const refreshed = session({ accessToken: accessToken(now + 15 * 60_000) });
    const fetchImpl = jest.fn(async () => sessionResponse(refreshed));
    const legacyManager = createMobileSessionManager({
      baseUrl: 'https://api.attravoya.example',
      fetchImpl,
      store: legacyStore,
      now: () => now,
    });

    await expect(legacyManager.restore()).resolves.toMatchObject({ user: refreshed.user });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
