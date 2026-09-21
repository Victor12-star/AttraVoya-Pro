import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createMobileApiClient } from '../services/api-client.js';

const MobileAuthContext = createContext(/** @type {any} */ (null));

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

  const retryRestore = useCallback(() => {
    setError(null);
    setStatus('loading');
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);
  const value = useMemo(
    () => ({ error, login, logout, retryRestore, status, user }),
    [error, login, logout, retryRestore, status, user],
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth() {
  const value = useContext(MobileAuthContext);
  if (!value) throw new Error('useMobileAuth must be used inside MobileAuthProvider.');
  return value;
}
