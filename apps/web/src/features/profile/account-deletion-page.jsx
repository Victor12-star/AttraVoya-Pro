'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { passwordSchema } from '@attravoya/validation';

import { apiClient } from '../../lib/api-client.js';
import styles from './account-deletion-page.module.css';

export function validateDeletionConfirmation(password, confirmation) {
  if (confirmation !== 'DELETE') return null;
  const parsed = passwordSchema.safeParse(password);
  return parsed.success ? parsed.data : null;
}

function safeDeletionError(error) {
  if (error?.status === 401 || error?.code === 'INVALID_CREDENTIALS') {
    return 'The password is incorrect. Check it and try again.';
  }
  if (error?.status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  if (error?.code === 'NETWORK_ERROR') {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (error?.code === 'REQUEST_TIMEOUT') return 'The request took too long. Please try again.';
  return 'We could not delete your account. Your account is unchanged. Please try again.';
}

export function AccountDeletionPage() {
  const requestSequenceRef = useRef(0);
  const actionLockRef = useRef(false);
  const [access, setAccess] = useState('checking');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const checkAccess = useCallback(async () => {
    requestSequenceRef.current += 1;
    const sequence = requestSequenceRef.current;
    setAccess('checking');
    setError('');
    try {
      await apiClient.listAuthSessions();
      if (sequence === requestSequenceRef.current) setAccess('authenticated');
    } catch (accessError) {
      if (sequence !== requestSequenceRef.current) return;
      setAccess(accessError?.status === 401 ? 'anonymous' : 'error');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void checkAccess(), 0);
    return () => {
      clearTimeout(timer);
      requestSequenceRef.current += 1;
    };
  }, [checkAccess]);

  async function submit(event) {
    event.preventDefault();
    if (actionLockRef.current) return;

    const confirmedPassword = validateDeletionConfirmation(password, confirmation);
    if (!confirmedPassword) {
      setError('Enter your current password and type DELETE exactly to confirm.');
      return;
    }

    actionLockRef.current = true;
    setPending(true);
    setError('');
    try {
      await apiClient.deleteCurrentAccount(confirmedPassword);
      setPassword('');
      setConfirmation('');
      setAccess('deleted');
    } catch (deletionError) {
      if (deletionError?.status === 401 && deletionError?.code !== 'INVALID_CREDENTIALS') {
        setAccess('anonymous');
      }
      setError(safeDeletionError(deletionError));
    } finally {
      actionLockRef.current = false;
      setPending(false);
    }
  }

  return (
    <section className={`shell ${styles.page}`} aria-labelledby="account-deletion-title">
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <Trash2 size={27} />
        </span>
        <div>
          <span className="eyebrow">Privacy and account control</span>
          <h1 id="account-deletion-title">Delete your AttraVoya Pro account</h1>
          <p>
            This page lets AttraVoya Pro users permanently delete their account and associated
            personal data from the web, even if they originally registered in the mobile app.
          </p>
        </div>
      </header>

      <div className={styles.warning}>
        <AlertTriangle size={21} aria-hidden="true" />
        <div>
          <h2>What deletion removes</h2>
          <p>
            Your trips, travel plans, favourites, recent searches, subscription records, profile,
            roles, verification tokens, password reset tokens, and active sessions are removed. The
            account cannot be recovered after deletion.
          </p>
        </div>
      </div>

      {access === 'checking' ? (
        <div className={styles.state} role="status" aria-live="polite">
          <LoaderCircle className={styles.spin} size={21} aria-hidden="true" />
          Checking your secure session…
        </div>
      ) : null}

      {access === 'error' ? (
        <div className={styles.state} role="alert">
          <span>We could not check your session. Your account is unchanged.</span>
          <button className="button button--secondary" type="button" onClick={checkAccess}>
            <RefreshCw size={17} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : null}

      {access === 'anonymous' ? (
        <div className={styles.state} role="status">
          <ShieldCheck size={21} aria-hidden="true" />
          <div>
            <h2>Sign in securely to continue</h2>
            <p>Authentication is required so nobody else can delete your account.</p>
          </div>
          <Link className="button button--dark" href="/login?next=%2Fdelete-account">
            Sign in to delete account
          </Link>
        </div>
      ) : null}

      {access === 'authenticated' ? (
        <form className={styles.form} onSubmit={submit}>
          <h2>Confirm permanent deletion</h2>
          <p>Enter your current password and type DELETE exactly. This action cannot be undone.</p>
          <label>
            <span>Current password</span>
            <input
              autoComplete="current-password"
              disabled={pending}
              maxLength={128}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label>
            <span>Type DELETE to confirm</span>
            <input
              autoCapitalize="characters"
              autoComplete="off"
              disabled={pending}
              maxLength={6}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              spellCheck="false"
              type="text"
              value={confirmation}
            />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <button className={styles.deleteButton} disabled={pending} type="submit">
            <Trash2 size={18} aria-hidden="true" />
            {pending ? 'Deleting account…' : 'Permanently delete account'}
          </button>
        </form>
      ) : null}

      {access === 'deleted' ? (
        <div className={styles.success} role="status" aria-live="polite">
          <ShieldCheck size={25} aria-hidden="true" />
          <div>
            <h2>Your account has been deleted</h2>
            <p>Your private account data and active sessions were removed successfully.</p>
            <Link className="text-link" href="/">
              Return to AttraVoya Pro
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
