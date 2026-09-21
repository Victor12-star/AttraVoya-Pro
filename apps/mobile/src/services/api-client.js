import { createApiClient } from '@attravoya/api-client';
import Constants from 'expo-constants';

import { createMobileSessionManager } from './mobile-session-manager.js';

function invalidConfiguration() {
  return new Error('The mobile API configuration is invalid.');
}

/**
 * Public API configuration still needs validation because it controls every
 * network request made by the installed application.
 */
export function normalizeApiBaseUrl(value, { allowInsecure = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) throw invalidConfiguration();

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw invalidConfiguration();
  }

  if (!['http:', 'https:'].includes(url.protocol)) throw invalidConfiguration();
  if (url.username || url.password || url.search || url.hash) throw invalidConfiguration();
  if (url.protocol === 'http:' && !allowInsecure) throw invalidConfiguration();

  return url.toString().replace(/\/$/, '');
}

export function getConfiguredApiBaseUrl(
  expoConfig = Constants.expoConfig,
  { allowInsecure = typeof __DEV__ !== 'undefined' && __DEV__ } = {},
) {
  return normalizeApiBaseUrl(expoConfig?.extra?.apiBaseUrl, { allowInsecure });
}

/**
 * Create the mobile transport without cookies. Secure token retrieval will be
 * injected here when the authentication slice owns its SecureStore lifecycle.
 */
/**
 * @param {{
 *   baseUrl?: string,
 *   fetchImpl?: typeof globalThis.fetch,
 *   getAccessToken?: () => string | null | Promise<string | null>,
 *   sessionManager?: ReturnType<typeof createMobileSessionManager>,
 *   allowInsecure?: boolean
 * }} [options]
 */
export function createMobileApiClient({
  baseUrl,
  fetchImpl,
  getAccessToken,
  sessionManager,
  allowInsecure = typeof __DEV__ !== 'undefined' && __DEV__,
} = {}) {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl ?? getConfiguredApiBaseUrl(), {
    allowInsecure,
  });

  const mobileSessionManager =
    sessionManager ??
    createMobileSessionManager({
      baseUrl: normalizedBaseUrl,
      ...(fetchImpl ? { fetchImpl } : {}),
    });

  const client = createApiClient({
    baseUrl: normalizedBaseUrl,
    credentials: 'omit',
    ...(fetchImpl ? { fetchImpl } : {}),
    getAccessToken: getAccessToken ?? mobileSessionManager.getAccessToken,
  });

  return Object.freeze({
    ...client,
    mobileLogin: mobileSessionManager.login,
    mobileLogout: mobileSessionManager.logout,
    refreshMobileSession: mobileSessionManager.refresh,
  });
}
