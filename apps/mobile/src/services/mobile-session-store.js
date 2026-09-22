import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

export const MOBILE_SESSION_KEY = 'attravoya.mobile.session.v1';

const MAX_ACCESS_TOKEN_LENGTH = 8_192;
const MAX_REFRESH_TOKEN_LENGTH = 256;

const storedUserSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    email: z.email().max(320),
    roles: z.array(z.string().trim().min(1).max(64)).max(16),
    emailVerified: z.boolean(),
  })
  .strict();

function normalizeUser(value) {
  // Older development builds stored credentials without public identity. Keep
  // those readable so the session manager can refresh and migrate them safely.
  if (value === undefined || value === null) return null;
  const parsed = storedUserSchema.safeParse(value);
  if (!parsed.success) throw sessionStorageError();
  return Object.freeze({ ...parsed.data, roles: Object.freeze(parsed.data.roles) });
}

function sessionStorageError() {
  const error = /** @type {Error & { code: string }} */ (
    new Error('The secure mobile session could not be updated.')
  );
  error.code = 'MOBILE_SESSION_STORAGE_ERROR';
  return error;
}

function normalizeToken(value, maximumLength) {
  if (typeof value !== 'string') throw sessionStorageError();
  const token = value.trim();
  if (!token || token.length > maximumLength || /\s/.test(token)) throw sessionStorageError();
  return token;
}

function normalizeSession(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw sessionStorageError();

  const accessToken = normalizeToken(value.accessToken, MAX_ACCESS_TOKEN_LENGTH);
  const refreshToken = normalizeToken(value.refreshToken, MAX_REFRESH_TOKEN_LENGTH);
  if (refreshToken.length < 32) throw sessionStorageError();

  const refreshExpiresAt = new Date(value.refreshExpiresAt);
  if (Number.isNaN(refreshExpiresAt.getTime())) throw sessionStorageError();

  return Object.freeze({
    accessToken,
    refreshToken,
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    user: normalizeUser(value.user),
  });
}

async function overwriteUnsafeSession(secureStore) {
  try {
    await secureStore.deleteItemAsync(MOBILE_SESSION_KEY);
  } catch {
    try {
      await secureStore.setItemAsync(MOBILE_SESSION_KEY, '');
    } catch {
      // Reads already fail closed. A later session operation can retry cleanup.
    }
  }
}

/**
 * Store the complete credential pair in one encrypted value. A refresh can
 * therefore never leave a new access token paired with an old refresh token.
 */
export function createMobileSessionStore(secureStore = SecureStore) {
  let cachedSession = null;
  let hasLoaded = false;
  /** @type {Promise<unknown>} */
  let operationQueue = Promise.resolve();

  function enqueue(operation) {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.catch(() => undefined);
    return result;
  }

  async function getSession() {
    if (hasLoaded) return cachedSession;

    return enqueue(async () => {
      if (hasLoaded) return cachedSession;

      let storedValue;
      try {
        storedValue = await secureStore.getItemAsync(MOBILE_SESSION_KEY);
      } catch {
        hasLoaded = true;
        return null;
      }

      if (storedValue === null) {
        hasLoaded = true;
        return null;
      }

      try {
        cachedSession = normalizeSession(JSON.parse(storedValue));
      } catch {
        cachedSession = null;
        await overwriteUnsafeSession(secureStore);
      }
      hasLoaded = true;
      return cachedSession;
    });
  }

  async function saveSession(value) {
    const session = normalizeSession(value);

    return enqueue(async () => {
      try {
        await secureStore.setItemAsync(MOBILE_SESSION_KEY, JSON.stringify(session));
      } catch {
        cachedSession = null;
        hasLoaded = true;
        throw sessionStorageError();
      }

      cachedSession = session;
      hasLoaded = true;
      return session;
    });
  }

  async function clearSession() {
    return enqueue(async () => {
      cachedSession = null;
      hasLoaded = true;
      try {
        await secureStore.deleteItemAsync(MOBILE_SESSION_KEY);
      } catch {
        try {
          await secureStore.setItemAsync(MOBILE_SESSION_KEY, '');
        } catch {
          throw sessionStorageError();
        }
      }
    });
  }

  return Object.freeze({ clearSession, getSession, saveSession });
}

export const mobileSessionStore = createMobileSessionStore();
