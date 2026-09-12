'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clock3,
  LoaderCircle,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import styles from './session-security-page.module.css';

function textValue(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function isoValue(value) {
  const date = typeof value === 'string' ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/**
 * Convert the already-stored sign-in user-agent into a deliberately coarse,
 * human-readable label. This is presentation only: no new fingerprint or
 * tracking identifier is created or persisted.
 */
export function sessionDeviceLabel(userAgent, fallbackLabel = 'Browser session') {
  const value = textValue(userAgent, 1024);
  if (!value) return fallbackLabel;

  let browser = fallbackLabel;
  if (/Edg\//i.test(value)) browser = 'Microsoft Edge';
  else if (/OPR\//i.test(value)) browser = 'Opera';
  else if (/(?:Chrome|CriOS)\//i.test(value)) browser = 'Chrome';
  else if (/(?:Firefox|FxiOS)\//i.test(value)) browser = 'Firefox';
  else if (/Safari\//i.test(value) && /Version\//i.test(value)) browser = 'Safari';

  let platform = null;
  if (/(?:iPhone|iPad|iPod)/i.test(value)) platform = 'iOS';
  else if (/Android/i.test(value)) platform = 'Android';
  else if (/Windows/i.test(value)) platform = 'Windows';
  else if (/(?:Macintosh|Mac OS X)/i.test(value)) platform = 'macOS';
  else if (/Linux/i.test(value)) platform = 'Linux';

  return platform ? `${browser} · ${platform}` : browser;
}

/** @param {any} response @param {any} copy */
export function normalizeSessionResponse(response, copy) {
  const sessions = Array.isArray(response?.sessions) ? response.sessions : [];
  return sessions
    .map((session) => {
      const id = textValue(session?.id, 128);
      const createdAt = isoValue(session?.createdAt);
      const lastUsedAt = isoValue(session?.lastUsedAt);
      const expiresAt = isoValue(session?.expiresAt);
      if (!id || !createdAt || !lastUsedAt || !expiresAt) return null;

      return {
        id,
        deviceLabel: sessionDeviceLabel(session?.userAgent, copy.browserSession),
        createdAt,
        lastUsedAt,
        expiresAt,
      };
    })
    .filter(Boolean);
}

function formatDateTime(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}

function isAuthenticationError(error) {
  return error?.status === 401 || error?.code === 'AUTHENTICATION_REQUIRED';
}

/**
 * Account-session management for the browser. The server remains authoritative:
 * the UI never claims a revoke succeeded until the owner-scoped endpoint returns.
 *
 * @param {object} props
 * @param {string} props.locale
 * @param {any} props.copy
 * @param {any} props.common
 * @param {string} props.signInLabel
 */
export function SessionSecurityPage({ locale = 'en', copy, common, signInLabel }) {
  const router = useRouter();
  const requestSequenceRef = useRef(0);
  const actionLockRef = useRef(false);
  const [state, setState] = useState(
    /** @type {{status:string, sessions:any[]}} */ ({ status: 'loading', sessions: [] }),
  );
  const [action, setAction] = useState(
    /** @type {{kind:string, sessionId:string|null}} */ ({ kind: 'idle', sessionId: null }),
  );
  const [feedback, setFeedback] = useState(/** @type {{kind:string, text:string}|null} */ (null));
  const [confirmAll, setConfirmAll] = useState(false);

  const loadSessions = useCallback(async () => {
    requestSequenceRef.current += 1;
    const sequence = requestSequenceRef.current;
    setState({ status: 'loading', sessions: [] });
    setFeedback(null);

    try {
      const response = await apiClient.listAuthSessions();
      if (sequence !== requestSequenceRef.current) return;
      setState({
        status: 'success',
        sessions: normalizeSessionResponse(response, copy),
      });
    } catch (error) {
      if (sequence !== requestSequenceRef.current) return;
      setState({
        status: isAuthenticationError(error) ? 'authentication-required' : 'error',
        sessions: [],
      });
    }
  }, [copy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSessions();
    }, 0);

    return () => {
      clearTimeout(timer);
      requestSequenceRef.current += 1;
    };
  }, [loadSessions]);

  async function revokeSession(sessionId) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setConfirmAll(false);
    setFeedback(null);
    setAction({ kind: 'session', sessionId });

    try {
      await apiClient.revokeAuthSession(sessionId);
      setState((current) => ({
        ...current,
        sessions: current.sessions.filter((session) => session.id !== sessionId),
      }));
      setFeedback({ kind: 'success', text: copy.revokeSuccess });
    } catch {
      setFeedback({ kind: 'error', text: copy.revokeFailed });
    } finally {
      actionLockRef.current = false;
      setAction({ kind: 'idle', sessionId: null });
    }
  }

  async function revokeAllSessions() {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setFeedback(null);
    setAction({ kind: 'all', sessionId: null });

    try {
      await apiClient.revokeAllAuthSessions();
      router.replace('/login');
      router.refresh();
    } catch {
      actionLockRef.current = false;
      setAction({ kind: 'idle', sessionId: null });
      setFeedback({ kind: 'error', text: copy.allFailed });
    }
  }

  const busy = action.kind !== 'idle';

  return (
    <section className={`shell ${styles.page}`} aria-labelledby="session-security-title">
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <ShieldCheck size={28} />
        </span>
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1 id="session-security-title">{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
      </header>

      <aside className={styles.privacyNote}>
        <ShieldCheck size={19} aria-hidden="true" />
        <p>{copy.metadataNote}</p>
      </aside>

      {feedback ? (
        <div
          className={`${styles.feedback} ${feedback.kind === 'error' ? styles.feedbackError : ''}`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback.text}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className={styles.feedback} role="status" aria-live="polite">
          <LoaderCircle className={styles.spin} size={21} aria-hidden="true" />
          {common.loading}
        </div>
      ) : null}

      {state.status === 'authentication-required' ? (
        <div className={styles.feedback} role="status">
          <span>{copy.signInPrompt}</span>
          <Link className="button button--dark" href="/login">
            {signInLabel}
          </Link>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className={styles.feedback} role="alert">
          <span>{copy.loadError}</span>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void loadSessions()}
          >
            <RefreshCw size={17} aria-hidden="true" />
            {common.retry}
          </button>
        </div>
      ) : null}

      {state.status === 'success' && state.sessions.length === 0 ? (
        <div className={styles.feedback} role="status">
          {copy.empty}
        </div>
      ) : null}

      {state.status === 'success' && state.sessions.length > 0 ? (
        <>
          <div className={styles.sessionGrid} role="list">
            {state.sessions.map((session) => (
              <article className={styles.sessionCard} role="listitem" key={session.id}>
                <div className={styles.sessionHeading}>
                  <span className={styles.deviceIcon} aria-hidden="true">
                    <MonitorSmartphone size={22} />
                  </span>
                  <h2>{session.deviceLabel}</h2>
                </div>

                <dl className={styles.metadata}>
                  <div>
                    <dt>{copy.created}</dt>
                    <dd>{formatDateTime(session.createdAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.lastUsed}</dt>
                    <dd>{formatDateTime(session.lastUsedAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.expires}</dt>
                    <dd>{formatDateTime(session.expiresAt, locale)}</dd>
                  </div>
                </dl>

                <button
                  className="button button--secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void revokeSession(session.id)}
                  aria-label={`${copy.revoke}: ${session.deviceLabel}`}
                >
                  {action.kind === 'session' && action.sessionId === session.id ? (
                    <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
                  ) : (
                    <LogOut size={17} aria-hidden="true" />
                  )}
                  {action.kind === 'session' && action.sessionId === session.id
                    ? copy.revoking
                    : copy.revoke}
                </button>
              </article>
            ))}
          </div>

          <p className={styles.revokeHint}>
            <Clock3 size={17} aria-hidden="true" />
            {copy.revokeHint}
          </p>

          <section className={styles.signOutAll} aria-labelledby="sign-out-everywhere-title">
            <div>
              <h2 id="sign-out-everywhere-title">{copy.signOutAll}</h2>
              <p>{copy.signOutAllHint}</p>
            </div>

            {!confirmAll ? (
              <button
                className="button button--dark"
                type="button"
                disabled={busy}
                onClick={() => setConfirmAll(true)}
              >
                <LogOut size={17} aria-hidden="true" />
                {copy.signOutAll}
              </button>
            ) : (
              <div className={styles.confirmation} role="group" aria-label={copy.signOutAll}>
                <p role="alert">{copy.confirmAll}</p>
                <div className={styles.confirmationActions}>
                  <button
                    className="button button--dark"
                    type="button"
                    disabled={busy}
                    onClick={() => void revokeAllSessions()}
                  >
                    {action.kind === 'all' ? (
                      <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
                    ) : (
                      <LogOut size={17} aria-hidden="true" />
                    )}
                    {action.kind === 'all' ? copy.signingOut : copy.confirmAllAction}
                  </button>
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmAll(false)}
                  >
                    {common.cancel}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
