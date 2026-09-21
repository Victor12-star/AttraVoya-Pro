import { z } from 'zod';

import { mobileSessionStore } from './mobile-session-store.js';

const SESSION_REQUEST_TIMEOUT_MS = 12_000;
const SESSION_RESPONSE_LIMIT_BYTES = 64 * 1024;
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 30_000;

const mobileSessionResponseSchema = z
  .object({
    accessToken: z.string().trim().min(1).max(8_192),
    refreshToken: z.string().trim().min(32).max(256),
    refreshExpiresAt: z.iso.datetime(),
    user: z.object({
      id: z.string().trim().min(1).max(128),
      email: z.email().max(320),
      roles: z.array(z.string().trim().min(1).max(64)).max(16),
      emailVerified: z.boolean(),
    }),
  })
  .strict();

function mobileSessionError(message, code, cause) {
  const error = /** @type {Error & { code: string }} */ (new Error(message, { cause }));
  error.code = code;
  return error;
}

function decodeAccessTokenExpiry(accessToken) {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload || typeof globalThis.atob !== 'function') return 0;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(globalThis.atob(padded));
    return Number.isSafeInteger(decoded.exp) ? decoded.exp * 1_000 : 0;
  } catch {
    return 0;
  }
}

async function readBoundedSessionResponse(response, { allowEmpty = false } = {}) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > SESSION_RESPONSE_LIMIT_BYTES) {
    throw mobileSessionError(
      'The server returned an invalid session response.',
      'INVALID_SESSION_RESPONSE',
    );
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > SESSION_RESPONSE_LIMIT_BYTES) {
    throw mobileSessionError(
      'The server returned an invalid session response.',
      'INVALID_SESSION_RESPONSE',
    );
  }

  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (cause) {
    throw mobileSessionError(
      'The server returned an invalid session response.',
      'INVALID_SESSION_RESPONSE',
      cause,
    );
  }

  if (!response.ok) {
    const code =
      response.status === 401 ? 'MOBILE_SESSION_EXPIRED' : 'MOBILE_SESSION_REQUEST_FAILED';
    throw mobileSessionError(
      payload?.error?.message ?? 'The mobile session request could not be completed.',
      code,
    );
  }

  if (allowEmpty && response.status === 204) return null;

  const parsed = mobileSessionResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw mobileSessionError(
      'The server returned an invalid session response.',
      'INVALID_SESSION_RESPONSE',
    );
  }
  return parsed.data;
}

export function createMobileSessionManager({
  baseUrl,
  fetchImpl = globalThis.fetch,
  store = mobileSessionStore,
  now = () => Date.now(),
  timeoutMs = SESSION_REQUEST_TIMEOUT_MS,
}) {
  if (!baseUrl) throw new TypeError('A mobile session API base URL is required.');
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');

  let refreshPromise = null;

  async function requestSession(path, body, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      return await readBoundedSessionResponse(response, options);
    } catch (error) {
      if (error?.code) throw error;
      const timedOut = controller.signal.aborted;
      throw mobileSessionError(
        timedOut
          ? 'The session request timed out. Please try again.'
          : 'Unable to reach AttraVoya Pro. Check your connection and try again.',
        timedOut ? 'MOBILE_SESSION_TIMEOUT' : 'MOBILE_SESSION_NETWORK_ERROR',
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async function saveResponse(response) {
    await store.saveSession(response);
    return response;
  }

  async function login(credentials) {
    return saveResponse(await requestSession('/api/v1/auth/mobile/login', credentials));
  }

  async function performRefresh() {
    const current = await store.getSession();
    if (!current) return null;
    if (Date.parse(current.refreshExpiresAt) <= now()) {
      await store.clearSession();
      return null;
    }

    try {
      return await saveResponse(
        await requestSession('/api/v1/auth/mobile/refresh', {
          refreshToken: current.refreshToken,
        }),
      );
    } catch (error) {
      if (error?.code === 'MOBILE_SESSION_EXPIRED') await store.clearSession();
      throw error;
    }
  }

  function refresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  async function getAccessToken() {
    const session = await store.getSession();
    if (!session) return null;
    const expiresAt = decodeAccessTokenExpiry(session.accessToken);
    if (expiresAt > now() + ACCESS_TOKEN_REFRESH_WINDOW_MS) return session.accessToken;
    const refreshed = await refresh();
    return refreshed?.accessToken ?? null;
  }

  async function logout() {
    const session = await store.getSession();
    try {
      if (session) {
        await requestSession(
          '/api/v1/auth/mobile/logout',
          { refreshToken: session.refreshToken },
          { allowEmpty: true },
        );
      }
    } finally {
      await store.clearSession();
    }
  }

  return Object.freeze({ getAccessToken, login, logout, refresh });
}
