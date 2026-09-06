'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Compass,
  FileSearch,
  LoaderCircle,
  LockKeyhole,
  MapPinned,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

import { ApiClientError } from '@attravoya/api-client';

import { apiClient } from '../../lib/api-client.js';
import styles from './candidate-evidence-section.module.css';

const EVIDENCE_CATEGORIES = new Set([
  'FLIGHTS',
  'ACCOMMODATION',
  'FOOD',
  'LOCAL_TRANSPORT',
  'ACTIVITIES',
  'CHILDREN_ACTIVITIES',
  'AIRPORT_TRANSFER',
  'TRAVEL_INSURANCE',
]);
const EVIDENCE_STATUSES = new Set([
  'NOT_COLLECTED',
  'NOT_CONFIGURED',
  'UNAVAILABLE',
  'FAILED',
  'COLLECTED',
]);
const PRICING_BASES = new Set(['LIVE', 'VERIFIED_PRICE']);
const CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH']);

/**
 * @typedef {object} PlannerBrief
 * @property {string} id
 * @property {{label?: string|null}|null|undefined} origin
 * @property {{amount?: string|null, currencyCode?: string|null}|null|undefined} budget
 */

/**
 * @typedef {object} DestinationCandidate
 * @property {string} id
 * @property {string} slug
 * @property {string} name
 * @property {string|null|undefined} regionName
 * @property {{code: string, name: string}} country
 * @property {string|null|undefined} summary
 */

/**
 * @typedef {object} CandidateSet
 * @property {string} requestId
 * @property {'FIXED_TARGET'|'PUBLISHED_CATALOG'} mode
 * @property {DestinationCandidate[]} destinations
 * @property {{budgetFit: string, rankingApplied: boolean, priceDataAvailable: boolean, availabilityDataUsed: boolean}} evaluation
 * @property {{kind: string, source: string, liveDataUsed: boolean, providerDataUsed: boolean, pricingDataUsed: boolean}} provenance
 */

/**
 * @typedef {object} RequiredEvidence
 * @property {string} category
 * @property {string} targetAmount
 * @property {string} targetBasis
 * @property {string} status
 */

/**
 * @typedef {object} CollectedEvidence
 * @property {string} category
 * @property {string} amountScope
 * @property {string} amountMin
 * @property {string} amountMax
 * @property {string} currencyCode
 * @property {string} pricingBasis
 * @property {string} confidence
 * @property {string} sourceProvider
 * @property {string} sourceExternalId
 * @property {string} sourceFetchedAt
 * @property {boolean} verifiedMarketEvidence
 */

/**
 * @typedef {object} AffordabilityEvidence
 * @property {string} requestId
 * @property {DestinationCandidate} destination
 * @property {{policyKey: string, policyVersion: number, status: string, required: RequiredEvidence[], collected: CollectedEvidence[], missingCategories: string[]}} evidence
 * @property {{budgetFit: string, rankingEligible: boolean, affordabilityConfirmed: boolean, evidenceReady: boolean}} evaluation
 * @property {{kind: string, liveDataUsed: boolean, providerDataUsed: boolean, pricingDataUsed: boolean}} provenance
 */

function isMoney(value) {
  return typeof value === 'string' && /^\d+\.\d{2}$/.test(value);
}

function isDestination(destination) {
  return Boolean(
    destination &&
    typeof destination.id === 'string' &&
    destination.id &&
    typeof destination.slug === 'string' &&
    typeof destination.name === 'string' &&
    destination.country &&
    typeof destination.country.code === 'string' &&
    typeof destination.country.name === 'string',
  );
}

export function isSafeDestinationCandidateSet(value, requestId) {
  if (!value || typeof value !== 'object' || value.requestId !== requestId) return false;
  if (!['FIXED_TARGET', 'PUBLISHED_CATALOG'].includes(value.mode)) return false;
  if (!Array.isArray(value.destinations) || !value.destinations.every(isDestination)) return false;

  const evaluation = value.evaluation;
  const provenance = value.provenance;
  return Boolean(
    evaluation &&
    evaluation.budgetFit === 'NOT_EVALUATED' &&
    evaluation.rankingApplied === false &&
    evaluation.priceDataAvailable === false &&
    evaluation.availabilityDataUsed === false &&
    provenance &&
    provenance.kind === 'PUBLISHED_CATALOG_CANDIDATE' &&
    provenance.source === 'ATTRAVOYA_PUBLISHED_DESTINATION_CATALOG' &&
    provenance.liveDataUsed === false &&
    provenance.providerDataUsed === false &&
    provenance.pricingDataUsed === false,
  );
}

function isCollectedMarketEvidence(item) {
  return Boolean(
    item &&
    EVIDENCE_CATEGORIES.has(item.category) &&
    item.amountScope === 'PLANNER_CATEGORY_TOTAL' &&
    isMoney(item.amountMin) &&
    isMoney(item.amountMax) &&
    Number(item.amountMax) >= Number(item.amountMin) &&
    /^[A-Z]{3}$/.test(item.currencyCode ?? '') &&
    PRICING_BASES.has(item.pricingBasis) &&
    CONFIDENCE.has(item.confidence) &&
    typeof item.sourceProvider === 'string' &&
    item.sourceProvider.length > 0 &&
    typeof item.sourceExternalId === 'string' &&
    item.sourceExternalId.length > 0 &&
    typeof item.sourceFetchedAt === 'string' &&
    !Number.isNaN(Date.parse(item.sourceFetchedAt)) &&
    item.verifiedMarketEvidence === true,
  );
}

export function isSafeAffordabilityEvidence(value, requestId, destinationId) {
  if (
    !value ||
    typeof value !== 'object' ||
    value.requestId !== requestId ||
    !isDestination(value.destination) ||
    value.destination.id !== destinationId
  ) {
    return false;
  }

  const evidence = value.evidence;
  if (
    !evidence ||
    evidence.policyKey !== 'attravoya-affordability-evidence-v1' ||
    evidence.policyVersion !== 1 ||
    !['INSUFFICIENT_EVIDENCE', 'COMPLETE_EVIDENCE'].includes(evidence.status) ||
    !Array.isArray(evidence.required) ||
    !Array.isArray(evidence.collected) ||
    !Array.isArray(evidence.missingCategories)
  ) {
    return false;
  }

  for (const item of evidence.required) {
    if (
      !item ||
      !EVIDENCE_CATEGORIES.has(item.category) ||
      !EVIDENCE_STATUSES.has(item.status) ||
      !isMoney(item.targetAmount) ||
      item.targetBasis !== 'PLANNING_TARGET'
    ) {
      return false;
    }
  }
  if (!evidence.collected.every(isCollectedMarketEvidence)) return false;
  if (!evidence.missingCategories.every((category) => EVIDENCE_CATEGORIES.has(category))) {
    return false;
  }

  const evaluation = value.evaluation;
  const provenance = value.provenance;
  return Boolean(
    evaluation &&
    evaluation.budgetFit === 'NOT_EVALUATED' &&
    evaluation.rankingEligible === false &&
    evaluation.affordabilityConfirmed === false &&
    typeof evaluation.evidenceReady === 'boolean' &&
    provenance &&
    provenance.kind === 'AFFORDABILITY_EVIDENCE_GATE' &&
    typeof provenance.liveDataUsed === 'boolean' &&
    typeof provenance.providerDataUsed === 'boolean' &&
    typeof provenance.pricingDataUsed === 'boolean',
  );
}

function briefLabel(request, fallback) {
  const origin = request?.origin?.label?.trim() || fallback;
  const amount = request?.budget?.amount;
  const currency = request?.budget?.currencyCode;
  return amount && currency ? `${origin} — ${amount} ${currency}` : origin;
}

function formatMoneyRange(item, locale) {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(Number(item.amountMin))}–${formatter.format(Number(item.amountMax))} ${item.currencyCode}`;
}

function formatTimestamp(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function CandidateEvidenceSection({ copy, locale, plannerCopy }) {
  const [requests, setRequests] = useState(/** @type {PlannerBrief[]} */ ([]));
  const [briefState, setBriefState] = useState('loading');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [candidateState, setCandidateState] = useState('idle');
  const [candidateSet, setCandidateSet] = useState(/** @type {CandidateSet|null} */ (null));
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [evidenceState, setEvidenceState] = useState('idle');
  const [affordabilityEvidence, setAffordabilityEvidence] = useState(
    /** @type {AffordabilityEvidence|null} */ (null),
  );
  const briefSequence = useRef(0);
  const candidateSequence = useRef(0);
  const evidenceSequence = useRef(0);

  const resetEvidence = useCallback(() => {
    evidenceSequence.current += 1;
    setSelectedDestinationId('');
    setAffordabilityEvidence(null);
    setEvidenceState('idle');
  }, []);

  const resetCandidates = useCallback(() => {
    candidateSequence.current += 1;
    setCandidateSet(null);
    setCandidateState('idle');
    resetEvidence();
  }, [resetEvidence]);

  const loadRequests = useCallback(async () => {
    const sequence = briefSequence.current + 1;
    briefSequence.current = sequence;
    setBriefState('loading');
    setSelectedRequestId('');
    resetCandidates();

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
  }, [resetCandidates]);

  const loadCandidates = useCallback(
    async (requestId) => {
      const sequence = candidateSequence.current + 1;
      candidateSequence.current = sequence;
      resetEvidence();
      setCandidateSet(null);
      setCandidateState('loading');

      try {
        const result = await apiClient.getPlannerDestinationCandidates(requestId);
        if (candidateSequence.current !== sequence) return;
        if (!isSafeDestinationCandidateSet(result?.destinationCandidates, requestId)) {
          throw new Error('Unsafe destination candidate response.');
        }
        setCandidateSet(result.destinationCandidates);
        setCandidateState('success');
      } catch (error) {
        if (candidateSequence.current !== sequence) return;
        setCandidateSet(null);
        setCandidateState(
          error instanceof ApiClientError && error.status === 401 ? 'auth' : 'error',
        );
      }
    },
    [resetEvidence],
  );

  const loadEvidence = useCallback(async (requestId, destinationId) => {
    const sequence = evidenceSequence.current + 1;
    evidenceSequence.current = sequence;
    setSelectedDestinationId(destinationId);
    setAffordabilityEvidence(null);
    setEvidenceState('loading');

    try {
      const result = await apiClient.getPlannerAffordabilityEvidence(requestId, destinationId);
      if (evidenceSequence.current !== sequence) return;
      if (!isSafeAffordabilityEvidence(result?.affordabilityEvidence, requestId, destinationId)) {
        throw new Error('Unsafe affordability evidence response.');
      }
      setAffordabilityEvidence(result.affordabilityEvidence);
      setEvidenceState('success');
    } catch (error) {
      if (evidenceSequence.current !== sequence) return;
      setAffordabilityEvidence(null);
      setEvidenceState(error instanceof ApiClientError && error.status === 401 ? 'auth' : 'error');
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
      candidateSequence.current += 1;
      evidenceSequence.current += 1;
    };
  }, []);

  function handleRequestSelection(event) {
    const requestId = event.target.value;
    setSelectedRequestId(requestId);
    if (!requestId) {
      resetCandidates();
      return;
    }
    void loadCandidates(requestId);
  }

  const selectedBrief = requests.find((request) => request.id === selectedRequestId);
  const selectedDestination = candidateSet?.destinations.find(
    (destination) => destination.id === selectedDestinationId,
  );

  return (
    <section className={styles.section} aria-labelledby="candidate-evidence-title">
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div>
              <div className={styles.eyebrow}>
                <Compass size={16} aria-hidden="true" />
                {copy.eyebrow}
              </div>
              <h2 id="candidate-evidence-title">{copy.title}</h2>
              <p>{copy.intro}</p>
            </div>
            <button
              className={styles.refreshButton}
              type="button"
              onClick={() =>
                selectedRequestId ? void loadCandidates(selectedRequestId) : void loadRequests()
              }
              disabled={briefState === 'loading' || candidateState === 'loading'}
            >
              <RefreshCw
                size={16}
                className={
                  briefState === 'loading' || candidateState === 'loading' ? styles.spin : undefined
                }
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
              <MapPinned size={24} aria-hidden="true" />
              <p>{plannerCopy.empty}</p>
            </div>
          ) : null}

          {briefState === 'success' && requests.length > 0 ? (
            <div className={styles.viewer}>
              <label className={styles.selectLabel}>
                <span>{copy.selectLabel}</span>
                <select value={selectedRequestId} onChange={handleRequestSelection}>
                  <option value="">{copy.selectPlaceholder}</option>
                  {requests.map((request) => (
                    <option key={request.id} value={request.id}>
                      {briefLabel(request, copy.savedBrief)}
                    </option>
                  ))}
                </select>
              </label>

              {candidateState === 'idle' ? (
                <div className={styles.state}>
                  <MapPinned size={24} aria-hidden="true" />
                  <p>{copy.notSelected}</p>
                </div>
              ) : null}

              {candidateState === 'loading' ? (
                <div className={styles.state} role="status" aria-live="polite">
                  <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
                  <p>{copy.loadingCandidates}</p>
                </div>
              ) : null}

              {candidateState === 'auth' ? (
                <div className={styles.state}>
                  <LockKeyhole size={24} aria-hidden="true" />
                  <p>{plannerCopy.signIn}</p>
                  <Link href="/login">{plannerCopy.signInLink}</Link>
                </div>
              ) : null}

              {candidateState === 'error' ? (
                <div className={styles.state} role="alert">
                  <p>{copy.candidatesUnavailable}</p>
                  <button type="button" onClick={() => void loadCandidates(selectedRequestId)}>
                    <RefreshCw size={15} aria-hidden="true" />
                    {plannerCopy.retry}
                  </button>
                </div>
              ) : null}

              {candidateState === 'success' &&
              candidateSet &&
              candidateSet.destinations.length === 0 ? (
                <div className={styles.state}>
                  <MapPinned size={24} aria-hidden="true" />
                  <p>{copy.emptyCandidates}</p>
                </div>
              ) : null}

              {candidateState === 'success' &&
              candidateSet &&
              candidateSet.destinations.length > 0 ? (
                <div className={styles.results}>
                  <div className={styles.context}>
                    <strong>{briefLabel(selectedBrief, copy.savedBrief)}</strong>
                    <div className={styles.contextBadges}>
                      <span>{copy.notRanked}</span>
                      <span>{copy.notAffordableYet}</span>
                    </div>
                  </div>

                  <div className={styles.candidateGrid}>
                    {candidateSet.destinations.map((destination) => (
                      <article className={styles.candidate} key={destination.id}>
                        <div className={styles.candidateTop}>
                          <span>{copy.candidateBasis}</span>
                          <MapPinned size={18} aria-hidden="true" />
                        </div>
                        <h3>{destination.name}</h3>
                        <p className={styles.location}>
                          {[destination.regionName, destination.country.name]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        {destination.summary ? <p>{destination.summary}</p> : null}
                        <div className={styles.candidateBoundary}>
                          <span>{copy.notRanked}</span>
                          <span>{copy.notAffordableYet}</span>
                        </div>
                        <button
                          type="button"
                          aria-pressed={selectedDestinationId === destination.id}
                          onClick={() => void loadEvidence(selectedRequestId, destination.id)}
                        >
                          <FileSearch size={16} aria-hidden="true" />
                          {copy.inspect}
                        </button>
                      </article>
                    ))}
                  </div>

                  {evidenceState === 'loading' ? (
                    <div className={styles.state} role="status" aria-live="polite">
                      <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
                      <p>{copy.loadingEvidence}</p>
                    </div>
                  ) : null}

                  {evidenceState === 'auth' ? (
                    <div className={styles.state}>
                      <LockKeyhole size={24} aria-hidden="true" />
                      <p>{plannerCopy.signIn}</p>
                      <Link href="/login">{plannerCopy.signInLink}</Link>
                    </div>
                  ) : null}

                  {evidenceState === 'error' ? (
                    <div className={styles.state} role="alert">
                      <p>{copy.evidenceUnavailable}</p>
                      <button
                        type="button"
                        onClick={() => void loadEvidence(selectedRequestId, selectedDestinationId)}
                      >
                        <RefreshCw size={15} aria-hidden="true" />
                        {plannerCopy.retry}
                      </button>
                    </div>
                  ) : null}

                  {evidenceState === 'success' && affordabilityEvidence ? (
                    <div className={styles.evidencePanel}>
                      <div className={styles.evidenceHeader}>
                        <div>
                          <span>{selectedDestination?.name}</span>
                          <h3>{copy.evidenceTitle}</h3>
                          <p>{copy.evidenceIntro}</p>
                        </div>
                        <div className={styles.lockedStatus}>
                          <ShieldAlert size={18} aria-hidden="true" />
                          {copy.notAffordableYet}
                        </div>
                      </div>

                      <p className={styles.evidenceSummary}>
                        {affordabilityEvidence.evidence.status === 'COMPLETE_EVIDENCE'
                          ? copy.evidenceComplete
                          : copy.evidenceIncomplete}
                      </p>

                      <div>
                        <h4>{copy.collectedEvidence}</h4>
                        {affordabilityEvidence.evidence.collected.length === 0 ? (
                          <p className={styles.muted}>{copy.noCollectedEvidence}</p>
                        ) : (
                          <ul className={styles.collectedList}>
                            {affordabilityEvidence.evidence.collected.map((item) => (
                              <li key={`${item.category}-${item.sourceExternalId}`}>
                                <div className={styles.collectedTitle}>
                                  <BadgeCheck size={18} aria-hidden="true" />
                                  <strong>{copy.categories[item.category]}</strong>
                                  <span>{copy.statuses.COLLECTED}</span>
                                </div>
                                <dl>
                                  <div>
                                    <dt>{copy.amountRange}</dt>
                                    <dd>{formatMoneyRange(item, locale)}</dd>
                                  </div>
                                  <div>
                                    <dt>{copy.provider}</dt>
                                    <dd>{item.sourceProvider}</dd>
                                  </div>
                                  <div>
                                    <dt>{copy.evidenceBasis}</dt>
                                    <dd>{item.pricingBasis}</dd>
                                  </div>
                                  <div>
                                    <dt>{copy.fetchedAt}</dt>
                                    <dd>{formatTimestamp(item.sourceFetchedAt, locale)}</dd>
                                  </div>
                                </dl>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <h4>{copy.requiredEvidence}</h4>
                        <ul className={styles.requiredList}>
                          {affordabilityEvidence.evidence.required.map((item) => (
                            <li key={item.category}>
                              <span>{copy.categories[item.category]}</span>
                              <strong>{copy.statuses[item.status]}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className={styles.provenance} role="note">
                        <ShieldAlert size={20} aria-hidden="true" />
                        <div>
                          <strong>{copy.provenanceTitle}</strong>
                          <p>{copy.provenance}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
