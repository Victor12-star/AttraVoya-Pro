import * as SecureStore from 'expo-secure-store';

export const MOBILE_ACCESS_TOKEN_KEY = 'attravoya.mobile.access-token.v1';

const MAX_ACCESS_TOKEN_LENGTH = 8_192;

/** @returns {Error & { code: string }} */
function storageError() {
  const error = /** @type {Error & { code: string }} */ (
    new Error('The secure mobile session could not be updated.')
  );
  error.code = 'MOBILE_TOKEN_STORAGE_ERROR';
  return error;
}

function normalizeAccessToken(value) {
  if (typeof value !== 'string') throw storageError();

  const token = value.trim();
  if (!token || token.length > MAX_ACCESS_TOKEN_LENGTH || /\s/.test(token)) {
    throw storageError();
  }

  return token;
}

/**
 * @param {{
 *   getItemAsync: (key: string) => Promise<string | null>,
 *   setItemAsync: (key: string, value: string) => Promise<void>,
 *   deleteItemAsync: (key: string) => Promise<void>
 * }} secureStore
 */
async function removeUnsafeStoredToken(secureStore) {
  try {
    await secureStore.deleteItemAsync(MOBILE_ACCESS_TOKEN_KEY);
  } catch {
    // An empty value is deliberately invalid and prevents a stale credential
    // from being accepted after restart when deletion is temporarily blocked.
    try {
      await secureStore.setItemAsync(MOBILE_ACCESS_TOKEN_KEY, '');
    } catch {
      // Reading already failed closed. Storage recovery can be retried later.
    }
  }
}

/**
 * Keep encrypted storage operations ordered so a delayed save cannot restore a
 * token after logout or overwrite a newer sign-in.
 *
 * @param {{
 *   getItemAsync: (key: string) => Promise<string | null>,
 *   setItemAsync: (key: string, value: string) => Promise<void>,
 *   deleteItemAsync: (key: string) => Promise<void>
 * }} [secureStore]
 */
export function createMobileAccessTokenStore(secureStore = SecureStore) {
  let cachedToken = null;
  let hasLoaded = false;
  /** @type {Promise<unknown>} */
  let operationQueue = Promise.resolve();

  /**
   * @template T
   * @param {() => T | Promise<T>} operation
   * @returns {Promise<T>}
   */
  function enqueue(operation) {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.catch(() => undefined);
    return result;
  }

  async function getAccessToken() {
    if (hasLoaded) return cachedToken;

    return enqueue(async () => {
      if (hasLoaded) return cachedToken;

      let storedToken;
      try {
        storedToken = await secureStore.getItemAsync(MOBILE_ACCESS_TOKEN_KEY);
      } catch {
        cachedToken = null;
        hasLoaded = true;
        return null;
      }

      if (storedToken === null) {
        cachedToken = null;
        hasLoaded = true;
        return null;
      }

      try {
        cachedToken = normalizeAccessToken(storedToken);
      } catch {
        cachedToken = null;
        await removeUnsafeStoredToken(secureStore);
      }

      hasLoaded = true;
      return cachedToken;
    });
  }

  async function saveAccessToken(value) {
    const token = normalizeAccessToken(value);

    return enqueue(async () => {
      try {
        await secureStore.setItemAsync(MOBILE_ACCESS_TOKEN_KEY, token);
      } catch {
        cachedToken = null;
        hasLoaded = true;
        throw storageError();
      }

      cachedToken = token;
      hasLoaded = true;
      return token;
    });
  }

  async function clearAccessToken() {
    return enqueue(async () => {
      cachedToken = null;
      hasLoaded = true;

      try {
        await secureStore.deleteItemAsync(MOBILE_ACCESS_TOKEN_KEY);
      } catch {
        try {
          await secureStore.setItemAsync(MOBILE_ACCESS_TOKEN_KEY, '');
        } catch {
          throw storageError();
        }
      }
    });
  }

  return Object.freeze({
    clearAccessToken,
    getAccessToken,
    saveAccessToken,
  });
}

export const mobileAccessTokenStore = createMobileAccessTokenStore();
