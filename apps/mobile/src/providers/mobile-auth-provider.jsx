import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { createMobileApiClient } from '../services/api-client.js';

const MobileAuthContext = createContext(/** @type {any} */ (null));

const registrationResponseSchema = z
  .object({
    user: z.object({
      id: z.string().trim().min(1).max(128),
      email: z.email().max(320),
      emailVerified: z.boolean(),
    }),
    verificationDelivery: z.enum(['sent', 'failed', 'not_configured']),
    message: z.string().trim().min(1).max(500),
  })
  .strict();

export function parseRegistrationResponse(value) {
  const parsed = registrationResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function safeAuthMessage(error) {
  if (error?.code === 'INVALID_CREDENTIALS' || error?.status === 401) {
    return 'The email or password is incorrect.';
  }
  if (error?.code === 'EMAIL_NOT_VERIFIED') return 'Verify your email before signing in.';
  if (error?.code === 'MOBILE_SESSION_NETWORK_ERROR' || error?.code === 'NETWORK_ERROR') {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (error?.code === 'MOBILE_SESSION_TIMEOUT' || error?.code === 'REQUEST_TIMEOUT') {
    return 'The request took too long. Please try again.';
  }
  return 'We could not sign you in. Please try again.';
}

function safeRegistrationMessage(error) {
  if (error?.status === 409 || error?.code === 'CONFLICT') {
    return 'An account with this email already exists.';
  }
  if (error?.code === 'NETWORK_ERROR') {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (error?.code === 'REQUEST_TIMEOUT') return 'The request took too long. Please try again.';
  return 'We could not create your account. Please try again.';
}

/** @param {{children: import('react').ReactNode, client?: any}} props */
export function MobileAuthProvider({ children, client: suppliedClient }) {
  const [client] = useState(() => suppliedClient ?? createMobileApiClient());
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(/** @type {any} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    client.restoreMobileSession().then(
      (accessToken) => {
        if (active) setStatus(accessToken ? 'authenticated' : 'anonymous');
      },
      (restoreError) => {
        if (!active) return;
        if (restoreError?.code === 'MOBILE_SESSION_EXPIRED') {
          setStatus('anonymous');
          return;
        }
        setError(safeAuthMessage(restoreError));
        setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [client, restoreAttempt]);

  const login = useCallback(
    async (credentials) => {
      setError(null);
      try {
        const session = await client.mobileLogin(credentials);
        setUser(session.user);
        setStatus('authenticated');
        return session.user;
      } catch (loginError) {
        const message = safeAuthMessage(loginError);
        setError(message);
        throw Object.assign(new Error(message), { code: loginError?.code });
      }
    },
    [client],
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      await client.mobileLogout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, [client]);

  const register = useCallback(
    async (details) => {
      try {
        const response = await client.register(details);
        const registration = parseRegistrationResponse(response);
        if (!registration) {
          throw Object.assign(new Error('Invalid registration response.'), {
            code: 'INVALID_API_RESPONSE',
          });
        }
        return registration;
      } catch (registrationError) {
        const message = safeRegistrationMessage(registrationError);
        throw Object.assign(new Error(message), { code: registrationError?.code });
      }
    },
    [client],
  );

  const retryRestore = useCallback(() => {
    setError(null);
    setStatus('loading');
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);
  const value = useMemo(
    () => ({ error, login, logout, register, retryRestore, status, user }),
    [error, login, logout, register, retryRestore, status, user],
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth() {
  const value = useContext(MobileAuthContext);
  if (!value) throw new Error('useMobileAuth must be used inside MobileAuthProvider.');
  return value;
}
