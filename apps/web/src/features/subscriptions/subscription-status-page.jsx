'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Crown, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import styles from './subscription-status-page.module.css';

const PLAN_ORDER = ['PRO_MONTHLY', 'PRO_YEARLY'];
/** @type {Set<string>} */
const PLAN_KEYS = new Set(['FREE', ...PLAN_ORDER]);
/** @type {Set<string>} */
const PRO_PLAN_KEYS = new Set(PLAN_ORDER);
/** @type {Set<string>} */
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

  if (!key || !PLAN_KEYS.has(key) || !name) return null;

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
  if (tier !== 'PRO' || !status || !PRO_STATUSES.has(status) || !currentPeriodEnd) return null;

  return {
    key,
    tier,
    name,
    status,
    currentPeriodEnd,
  };
}

export function normalizeCheckoutAvailability(response) {
  if (typeof response?.available !== 'boolean' || !Array.isArray(response?.planKeys)) return null;

  if (!response.available) {
    return response.planKeys.length === 0 ? { available: false, planKeys: [] } : null;
  }

  if (
    response.planKeys.length !== 2 ||
    response.planKeys.some((key) => !PRO_PLAN_KEYS.has(key)) ||
    new Set(response.planKeys).size !== 2 ||
    !PLAN_ORDER.every((key) => response.planKeys.includes(key))
  ) {
    return null;
  }

  return { available: true, planKeys: PLAN_ORDER };
}

export function normalizeStripePlanCatalog(response) {
  if (!Array.isArray(response?.plans) || response.plans.length !== 2) return null;

  const plans = [];
  for (const plan of response.plans) {
    const planKey = textValue(plan?.planKey, 40);
    const name = textValue(plan?.name, 80);
    const currency = textValue(plan?.currency, 3);
    const interval = textValue(plan?.interval, 8);
    const unitAmount = plan?.unitAmount;

    if (
      !planKey ||
      !PRO_PLAN_KEYS.has(planKey) ||
      !name ||
      !currency ||
      !/^[a-z]{3}$/.test(currency) ||
      !Number.isSafeInteger(unitAmount) ||
      unitAmount <= 0 ||
      (interval !== 'month' && interval !== 'year')
    ) {
      return null;
    }

    const expectedInterval = planKey === 'PRO_MONTHLY' ? 'month' : 'year';
    if (interval !== expectedInterval || plans.some((item) => item.planKey === planKey)) return null;

    plans.push({ planKey, name, unitAmount, currency, interval });
  }

  if (!PLAN_ORDER.every((key) => plans.some((plan) => plan.planKey === key))) return null;
  return PLAN_ORDER.map((key) => plans.find((plan) => plan.planKey === key));
}

export function normalizeStripeCheckoutUrl(response) {
  const value = textValue(response?.checkoutUrl, 2048);
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'checkout.stripe.com' ||
      url.port ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
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

function formatPrice(plan, locale) {
  try {
    const probe = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: plan.currency.toUpperCase(),
    });
    const fractionDigits = probe.resolvedOptions().maximumFractionDigits;
    const amount = plan.unitAmount / 10 ** fractionDigits;
    return probe.format(amount);
  } catch {
    try {
      const fallback = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: plan.currency.toUpperCase(),
      });
      const fractionDigits = fallback.resolvedOptions().maximumFractionDigits;
      return fallback.format(plan.unitAmount / 10 ** fractionDigits);
    } catch {
      return '—';
    }
  }
}

function checkoutReturnState() {
  if (typeof globalThis.location?.search !== 'string') return null;
  const value = new URLSearchParams(globalThis.location.search).get('checkout');
  return value === 'success' || value === 'cancelled' ? value : null;
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
  const purchaseSequenceRef = useRef(0);
  const checkoutInFlightRef = useRef(false);
  const [state, setState] = useState(
    /** @type {{status:string, access:any|null}} */ ({ status: 'loading', access: null }),
  );
  const [purchase, setPurchase] = useState(
    /** @type {{status:string, plans:any[], selected:string|null}} */ ({
      status: 'idle',
      plans: [],
      selected: null,
    }),
  );
  const [returnState, setReturnState] = useState(null);

  const loadPurchaseOptions = useCallback(async () => {
    purchaseSequenceRef.current += 1;
    checkoutInFlightRef.current = false;
    const sequence = purchaseSequenceRef.current;
    setPurchase({ status: 'loading', plans: [], selected: null });

    try {
      const availability = normalizeCheckoutAvailability(
        await apiClient.getStripeCheckoutAvailability(),
      );
      if (sequence !== purchaseSequenceRef.current) return;
      if (!availability) {
        setPurchase({ status: 'error', plans: [], selected: null });
        return;
      }
      if (!availability.available) {
        setPurchase({ status: 'unavailable', plans: [], selected: null });
        return;
      }

      const plans = normalizeStripePlanCatalog(await apiClient.getStripePlanCatalog());
      if (sequence !== purchaseSequenceRef.current) return;
      setPurchase(
        plans
          ? { status: 'ready', plans, selected: null }
          : { status: 'error', plans: [], selected: null },
      );
    } catch {
      if (sequence !== purchaseSequenceRef.current) return;
      setPurchase({ status: 'error', plans: [], selected: null });
    }
  }, []);

  const loadAccess = useCallback(async () => {
    sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    setState({ status: 'loading', access: null });
    purchaseSequenceRef.current += 1;
    setPurchase({ status: 'idle', plans: [], selected: null });

    try {
      const response = await apiClient.getMyEntitlements();
      if (sequence !== sequenceRef.current) return;

      const access = normalizeSubscriptionAccess(response);
      if (!access) {
        setState({ status: 'error', access: null });
        return;
      }

      setState({ status: 'success', access });
      if (access.tier === 'FREE') {
        await loadPurchaseOptions();
      }
    } catch (error) {
      if (sequence !== sequenceRef.current) return;
      setState({
        status: isAuthenticationError(error) ? 'authentication-required' : 'error',
        access: null,
      });
    }
  }, [loadPurchaseOptions]);

  useEffect(() => {
    setReturnState(checkoutReturnState());
    const timer = setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      clearTimeout(timer);
      sequenceRef.current += 1;
      purchaseSequenceRef.current += 1;
      checkoutInFlightRef.current = false;
    };
  }, [loadAccess]);

  const startCheckout = useCallback(
    async (planKey) => {
      if (
        !PRO_PLAN_KEYS.has(planKey) ||
        purchase.status === 'redirecting' ||
        checkoutInFlightRef.current
      ) {
        return;
      }
      checkoutInFlightRef.current = true;
      setPurchase((current) => ({ ...current, status: 'redirecting', selected: planKey }));

      try {
        const checkoutUrl = normalizeStripeCheckoutUrl(await apiClient.createStripeCheckout(planKey));
        if (!checkoutUrl || typeof globalThis.location?.assign !== 'function') {
          throw new Error('Invalid checkout destination');
        }
        globalThis.location.assign(checkoutUrl);
      } catch {
        checkoutInFlightRef.current = false;
        setPurchase((current) => ({ ...current, status: 'checkout-error', selected: null }));
      }
    },
    [purchase.status],
  );

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

      {returnState === 'success' ? (
        <div className={styles.returnNotice} role="status">
          {copy.checkoutReturned}
        </div>
      ) : null}
      {returnState === 'cancelled' ? (
        <div className={styles.returnNotice} role="status">
          {copy.checkoutCancelled}
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
            onClick={() => void loadAccess()}
          >
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
              {isPro ? (access.status === 'TRIALING' ? copy.trialing : copy.active) : access.name}
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
        </article>
      ) : null}

      {state.status === 'success' && !isPro ? (
        <section className={styles.purchaseSection} aria-labelledby="purchase-title">
          <div>
            <span className={styles.label}>{copy.proOptionsLabel}</span>
            <h2 id="purchase-title">{copy.purchaseTitle}</h2>
            <p>{copy.purchaseIntro}</p>
          </div>

          {purchase.status === 'loading' || purchase.status === 'idle' ? (
            <div className={styles.feedback} role="status" aria-live="polite">
              <LoaderCircle className={styles.spin} size={20} aria-hidden="true" />
              {copy.loadingPlans}
            </div>
          ) : null}

          {purchase.status === 'unavailable' ? (
            <p className={styles.purchaseNote}>{copy.purchaseUnavailable}</p>
          ) : null}

          {purchase.status === 'error' ? (
            <div className={styles.feedback} role="alert">
              <span>{copy.purchaseLoadError}</span>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => void loadPurchaseOptions()}
              >
                <RefreshCw size={17} aria-hidden="true" />
                {common.retry}
              </button>
            </div>
          ) : null}

          {purchase.status === 'checkout-error' ? (
            <div className={styles.feedback} role="alert">
              <span>{copy.checkoutError}</span>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => void loadPurchaseOptions()}
              >
                <RefreshCw size={17} aria-hidden="true" />
                {common.retry}
              </button>
            </div>
          ) : null}

          {purchase.plans.length ? (
            <div className={styles.planOptions}>
              {purchase.plans.map((plan) => {
                const redirecting =
                  purchase.status === 'redirecting' && purchase.selected === plan.planKey;
                return (
                  <article className={styles.optionCard} key={plan.planKey}>
                    <div>
                      <h3>{plan.name}</h3>
                      <p className={styles.price}>
                        {formatPrice(plan, locale)}
                        <span> / {plan.interval === 'month' ? copy.month : copy.year}</span>
                      </p>
                    </div>
                    <button
                      className="button button--dark"
                      type="button"
                      disabled={purchase.status === 'redirecting'}
                      aria-label={`${copy.checkoutButton}: ${plan.name}`}
                      onClick={() => void startCheckout(plan.planKey)}
                    >
                      {redirecting ? (
                        <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
                      ) : (
                        <ExternalLink size={17} aria-hidden="true" />
                      )}
                      {redirecting ? copy.checkoutRedirecting : copy.checkoutButton}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : null}

          <p className={styles.purchaseSafety}>{copy.purchaseSafety}</p>
        </section>
      ) : null}
    </section>
  );
}
