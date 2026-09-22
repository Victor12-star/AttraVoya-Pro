'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Crown, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import styles from './subscription-status-page.module.css';

const PLAN_KEYS = new Set(['FREE', 'PRO_MONTHLY', 'PRO_YEARLY']);
const PRO_STATUSES = new Set(['ACTIVE', 'TRIALING']);

function textValue(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function isoValue(value) {
  const date = typeof value === 'string' ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

/**
 * Strictly normalize the minimal access state needed for this page. Unknown
 * plans or malformed Pro subscription data fail closed to the recoverable UI
 * instead of being presented as valid paid access.
 */
export function normalizeSubscriptionAccess(response) {
  const access = response?.access;
  const key = textValue(access?.plan?.key, 40);
  const tier = textValue(access?.plan?.tier, 16);
  const name = textValue(access?.plan?.name, 80);

  if (!PLAN_KEYS.has(key) || !name) return null;

  if (key === 'FREE') {
    if (tier !== 'FREE' || access?.subscription !== null) return null;
    return {
      key,
      tier,
      name,
      status: null,
      currentPeriodEnd: null,
    };
  }

  const status = textValue(access?.subscription?.status, 20);
  const currentPeriodEnd = isoValue(access?.subscription?.currentPeriodEnd);
  if (tier !== 'PRO' || !PRO_STATUSES.has(status) || !currentPeriodEnd) return null;

  return {
    key,
    tier,
    name,
    status,
    currentPeriodEnd,
  };
}

function isAuthenticationError(error) {
  return error?.status === 401 || error?.code === 'AUTHENTICATION_REQUIRED';
}

function formatDate(value, locale) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
  }
}

/**
 * @param {object} props
 * @param {string} props.locale
 * @param {any} props.copy
 * @param {any} props.common
 * @param {string} props.signInLabel
 */
export function SubscriptionStatusPage({ locale = 'en', copy, common, signInLabel }) {
  const sequenceRef = useRef(0);
  const [state, setState] = useState(
    /** @type {{status:string, access:any|null}} */ ({ status: 'loading', access: null }),
  );

  const loadAccess = useCallback(async () => {
    sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    setState({ status: 'loading', access: null });

    try {
      const response = await apiClient.getMyEntitlements();
      if (sequence !== sequenceRef.current) return;

      const access = normalizeSubscriptionAccess(response);
      setState(access ? { status: 'success', access } : { status: 'error', access: null });
    } catch (error) {
      if (sequence !== sequenceRef.current) return;
      setState({
        status: isAuthenticationError(error) ? 'authentication-required' : 'error',
        access: null,
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      clearTimeout(timer);
      sequenceRef.current += 1;
    };
  }, [loadAccess]);

  const access = state.access;
  const isPro = access?.tier === 'PRO';

  return (
    <section className={`shell ${styles.page}`} aria-labelledby="subscription-title">
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <Crown size={28} />
        </span>
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1 id="subscription-title">{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
      </header>

      <aside className={styles.privacyNote}>
        <ShieldCheck size={19} aria-hidden="true" />
        <p>{copy.privacyNote}</p>
      </aside>

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
          <button className="button button--secondary" type="button" onClick={() => void loadAccess()}>
            <RefreshCw size={17} aria-hidden="true" />
            {common.retry}
          </button>
        </div>
      ) : null}

      {state.status === 'success' && access ? (
        <article className={styles.planCard}>
          <div className={styles.planHeading}>
            <div>
              <span className={styles.label}>{copy.currentPlan}</span>
              <h2>{access.name}</h2>
            </div>
            <span className={isPro ? styles.proBadge : styles.freeBadge}>
              {isPro
                ? access.status === 'TRIALING'
                  ? copy.trialing
                  : copy.active
                : access.name}
            </span>
          </div>

          <p className={styles.planDescription}>{isPro ? copy.proDetail : copy.freeDetail}</p>

          {isPro && access.currentPeriodEnd ? (
            <dl className={styles.metadata}>
              <div>
                <dt>{copy.periodEnds}</dt>
                <dd>{formatDate(access.currentPeriodEnd, locale)}</dd>
              </div>
            </dl>
          ) : null}

          {!isPro ? <p className={styles.purchaseNote}>{copy.purchaseUnavailable}</p> : null}
        </article>
      ) : null}
    </section>
  );
}
