'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CircleDollarSign,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

import { ApiClientError } from '@attravoya/api-client';

import { apiClient } from '../../lib/api-client.js';
import styles from './budget-allocation-section.module.css';

/**
 * @typedef {object} PlannerBrief
 * @property {string} id
 * @property {{label?: string|null}|null|undefined} origin
 * @property {{amount?: string|null, currencyCode?: string|null}|null|undefined} budget
 */

/**
 * @typedef {object} BudgetTarget
 * @property {string} category
 * @property {string} amount
 * @property {string} percentOfSpendable
 * @property {string} basis
 */

/**
 * @typedef {object} BudgetAllocation
 * @property {string} requestId
 * @property {string} currencyCode
 * @property {string} totalBudget
 * @property {{category: string, amount: string, percentOfTotal: string, basis: string}} safetyReserve
 * @property {string} spendableBudget
 * @property {BudgetTarget[]} targets
 * @property {{kind: string, liveDataUsed: boolean, providerDataUsed: boolean}} provenance
 */

const TARGET_CATEGORIES = new Set([
  'FLIGHTS',
  'ACCOMMODATION',
  'FOOD',
  'LOCAL_TRANSPORT',
  'ACTIVITIES',
  'CHILDREN_ACTIVITIES',
  'AIRPORT_TRANSFER',
  'TRAVEL_INSURANCE',
]);

function isMoney(value) {
  return typeof value === 'string' && /^\d+\.\d{2}$/.test(value);
}

function isBudgetAllocation(value, requestId) {
  if (!value || typeof value !== 'object') return false;
  if (value.requestId !== requestId || !/^[A-Z]{3}$/.test(value.currencyCode ?? '')) {
    return false;
  }
  if (!isMoney(value.totalBudget) || !isMoney(value.spendableBudget)) return false;

  const reserve = value.safetyReserve;
  if (
    !reserve ||
    reserve.category !== 'SAFETY_RESERVE' ||
    reserve.basis !== 'USER_INPUT_DERIVED' ||
    !isMoney(reserve.amount) ||
    !isMoney(reserve.percentOfTotal)
  ) {
    return false;
  }

  if (!Array.isArray(value.targets) || value.targets.length !== TARGET_CATEGORIES.size) {
    return false;
  }
  const categories = new Set();
  for (const target of value.targets) {
    if (
      !target ||
      !TARGET_CATEGORIES.has(target.category) ||
      target.basis !== 'PLANNING_TARGET' ||
      !isMoney(target.amount) ||
      !isMoney(target.percentOfSpendable)
    ) {
      return false;
    }
    categories.add(target.category);
  }
  if (categories.size !== TARGET_CATEGORIES.size) return false;

  const provenance = value.provenance;
  return Boolean(
    provenance &&
    provenance.kind === 'PLANNING_TARGET' &&
    provenance.liveDataUsed === false &&
    provenance.providerDataUsed === false,
  );
}

function formatNumber(value, locale) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatMoney(value, currencyCode, locale) {
  return `${formatNumber(value, locale)} ${currencyCode}`;
}

function formatPercent(value, locale) {
  return `${formatNumber(value, locale)}%`;
}

function briefLabel(request, fallback) {
  const origin = request?.origin?.label?.trim() || fallback;
  const amount = request?.budget?.amount;
  const currency = request?.budget?.currencyCode;
  return amount && currency ? `${origin} — ${amount} ${currency}` : origin;
}

export function BudgetAllocationSection({ copy, locale, plannerCopy }) {
  const [requests, setRequests] = useState(/** @type {PlannerBrief[]} */ ([]));
  const [briefState, setBriefState] = useState('loading');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [allocationState, setAllocationState] = useState('idle');
  const [allocation, setAllocation] = useState(/** @type {BudgetAllocation|null} */ (null));
  const briefSequence = useRef(0);
  const allocationSequence = useRef(0);

  const resetAllocation = useCallback(() => {
    allocationSequence.current += 1;
    setSelectedRequestId('');
    setAllocation(null);
    setAllocationState('idle');
  }, []);

  const loadRequests = useCallback(async () => {
    const sequence = briefSequence.current + 1;
    briefSequence.current = sequence;
    setBriefState('loading');
    resetAllocation();

    try {
      const result = await apiClient.listBudgetPlanRequests();
      if (briefSequence.current !== sequence) return;
      if (!Array.isArray(result?.requests)) throw new Error('Invalid planner response.');
      setRequests(result.requests);
      setBriefState('success');
    } catch (error) {
      if (briefSequence.current !== sequence) return;
      setRequests([]);
      setBriefState(error instanceof ApiClientError && error.status === 401 ? 'auth' : 'error');
    }
  }, [resetAllocation]);

  const loadAllocation = useCallback(async (requestId) => {
    const sequence = allocationSequence.current + 1;
    allocationSequence.current = sequence;
    setAllocation(null);
    setAllocationState('loading');

    try {
      const result = await apiClient.getBudgetAllocation(requestId);
      if (allocationSequence.current !== sequence) return;
      if (!isBudgetAllocation(result?.allocation, requestId)) {
        throw new Error('Invalid allocation response.');
      }
      setAllocation(result.allocation);
      setAllocationState('success');
    } catch (error) {
      if (allocationSequence.current !== sequence) return;
      setAllocation(null);
      setAllocationState(
        error instanceof ApiClientError && error.status === 401 ? 'auth' : 'error',
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    apiClient
      .listBudgetPlanRequests()
      .then((result) => {
        if (!active) return;
        if (!Array.isArray(result?.requests)) throw new Error('Invalid planner response.');
        setRequests(result.requests);
        setBriefState('success');
      })
      .catch((error) => {
        if (!active) return;
        setRequests([]);
        setBriefState(error instanceof ApiClientError && error.status === 401 ? 'auth' : 'error');
      });

    return () => {
      active = false;
      briefSequence.current += 1;
      allocationSequence.current += 1;
    };
  }, []);

  function handleSelection(event) {
    const requestId = event.target.value;
    setSelectedRequestId(requestId);
    if (!requestId) {
      allocationSequence.current += 1;
      setAllocation(null);
      setAllocationState('idle');
      return;
    }
    void loadAllocation(requestId);
  }

  const selectedBrief = requests.find((request) => request.id === selectedRequestId);

  return (
    <section className={styles.section} aria-labelledby="budget-allocation-title">
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div>
              <div className={styles.eyebrow}>
                <WalletCards size={16} aria-hidden="true" />
                {copy.eyebrow}
              </div>
              <h2 id="budget-allocation-title">{copy.title}</h2>
              <p>{copy.intro}</p>
            </div>
            <button
              className={styles.refreshButton}
              type="button"
              onClick={() => void loadRequests()}
              disabled={briefState === 'loading'}
            >
              <RefreshCw
                size={16}
                className={briefState === 'loading' ? styles.spin : undefined}
                aria-hidden="true"
              />
              {copy.refresh}
            </button>
          </div>

          {briefState === 'loading' ? (
            <div className={styles.state} role="status" aria-live="polite">
              <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
              <p>{plannerCopy.loading}</p>
            </div>
          ) : null}

          {briefState === 'auth' ? (
            <div className={styles.state}>
              <LockKeyhole size={24} aria-hidden="true" />
              <p>{plannerCopy.signIn}</p>
              <Link href="/login">{plannerCopy.signInLink}</Link>
            </div>
          ) : null}

          {briefState === 'error' ? (
            <div className={styles.state} role="alert">
              <p>{plannerCopy.unavailable}</p>
              <button type="button" onClick={() => void loadRequests()}>
                <RefreshCw size={15} aria-hidden="true" />
                {plannerCopy.retry}
              </button>
            </div>
          ) : null}

          {briefState === 'success' && requests.length === 0 ? (
            <div className={styles.state}>
              <CircleDollarSign size={24} aria-hidden="true" />
              <p>{plannerCopy.empty}</p>
            </div>
          ) : null}

          {briefState === 'success' && requests.length > 0 ? (
            <div className={styles.viewer}>
              <label className={styles.selectLabel}>
                <span>{copy.selectLabel}</span>
                <select value={selectedRequestId} onChange={handleSelection}>
                  <option value="">{copy.selectPlaceholder}</option>
                  {requests.map((request) => (
                    <option key={request.id} value={request.id}>
                      {briefLabel(request, copy.savedBrief)}
                    </option>
                  ))}
                </select>
              </label>

              {allocationState === 'idle' ? (
                <div className={styles.state}>
                  <WalletCards size={24} aria-hidden="true" />
                  <p>{copy.notSelected}</p>
                </div>
              ) : null}

              {allocationState === 'loading' ? (
                <div className={styles.state} role="status" aria-live="polite">
                  <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
                  <p>{copy.loadingAllocation}</p>
                </div>
              ) : null}

              {allocationState === 'auth' ? (
                <div className={styles.state}>
                  <LockKeyhole size={24} aria-hidden="true" />
                  <p>{plannerCopy.signIn}</p>
                  <Link href="/login">{plannerCopy.signInLink}</Link>
                </div>
              ) : null}

              {allocationState === 'error' ? (
                <div className={styles.state} role="alert">
                  <p>{copy.allocationUnavailable}</p>
                  <button type="button" onClick={() => void loadAllocation(selectedRequestId)}>
                    <RefreshCw size={15} aria-hidden="true" />
                    {plannerCopy.retry}
                  </button>
                </div>
              ) : null}

              {allocationState === 'success' && allocation ? (
                <div className={styles.results}>
                  <div className={styles.context}>
                    <strong>{briefLabel(selectedBrief, copy.savedBrief)}</strong>
                    <span>{copy.planningTarget}</span>
                  </div>

                  <div className={styles.summaryGrid}>
                    <div className={styles.metric}>
                      <span>{copy.totalBudget}</span>
                      <strong>
                        {formatMoney(allocation.totalBudget, allocation.currencyCode, locale)}
                      </strong>
                    </div>
                    <div className={styles.metric}>
                      <span>{copy.safetyReserve}</span>
                      <strong>
                        {formatMoney(
                          allocation.safetyReserve.amount,
                          allocation.currencyCode,
                          locale,
                        )}
                      </strong>
                      <small>
                        {formatPercent(allocation.safetyReserve.percentOfTotal, locale)}
                      </small>
                    </div>
                    <div className={styles.metric}>
                      <span>{copy.spendableBudget}</span>
                      <strong>
                        {formatMoney(allocation.spendableBudget, allocation.currencyCode, locale)}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.targetsHeader}>
                    <h3>{copy.categoryTargets}</h3>
                    <span>{copy.percentOfSpendable}</span>
                  </div>
                  <ul className={styles.targetList}>
                    {allocation.targets.map((target) => (
                      <li className={styles.target} key={target.category}>
                        <div>
                          <strong>{copy.categories[target.category]}</strong>
                          <span>{formatPercent(target.percentOfSpendable, locale)}</span>
                        </div>
                        <b>{formatMoney(target.amount, allocation.currencyCode, locale)}</b>
                      </li>
                    ))}
                  </ul>

                  <div className={styles.provenance} role="note">
                    <ShieldCheck size={20} aria-hidden="true" />
                    <div>
                      <strong>{copy.planningTarget}</strong>
                      <p>{copy.provenance}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
