'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CircleDollarSign,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Save,
  Sparkles,
  Users,
} from 'lucide-react';

import { ApiClientError } from '@attravoya/api-client';
import { ACCOMMODATION_TYPES } from '@attravoya/constants';
import { CURRENCY_CODES } from '@attravoya/localization';
import { createBudgetPlanRequestSchema } from '@attravoya/validation';

import { apiClient } from '../../lib/api-client.js';
import { readPreferences } from '../../lib/preferences.js';
import styles from './budget-planner-page.module.css';

const LODGING_TYPES = Object.values(ACCOMMODATION_TYPES).filter((type) => type !== 'OTHER');
const DEFAULT_LODGING = [
  ACCOMMODATION_TYPES.HOTEL,
  ACCOMMODATION_TYPES.GUEST_HOUSE,
  ACCOMMODATION_TYPES.HOSTEL,
  ACCOMMODATION_TYPES.SHORT_TERM_RENTAL,
];

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseChildrenAges(value) {
  const values = splitList(value);
  if (values.length === 0) return [];
  return values.map((item) => Number(item));
}

function formatDateRange(request, copy) {
  if (request?.dates?.flexible) {
    const window = [request.dates.earliestDeparture, request.dates.latestReturn].filter(Boolean);
    return window.length === 2 ? `${window[0]} – ${window[1]}` : copy.flexibleSummary;
  }
  const fixed = [request?.dates?.fixedDeparture, request?.dates?.fixedReturn].filter(Boolean);
  return fixed.length === 2 ? `${fixed[0]} – ${fixed[1]}` : copy.fixedSummary;
}

export function BudgetPlannerPage({ copy, defaultCurrency = 'SEK' }) {
  const [dateMode, setDateMode] = useState('flexible');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [lodgingTypes, setLodgingTypes] = useState(DEFAULT_LODGING);
  const [familyFriendly, setFamilyFriendly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: 'idle', message: '' });
  const [drafts, setDrafts] = useState([]);
  const [draftState, setDraftState] = useState('loading');

  useEffect(() => {
    const stored = readPreferences();
    if (stored.currency && CURRENCY_CODES.includes(stored.currency)) {
      setCurrency(stored.currency);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    setDraftState('loading');
    try {
      const response = await apiClient.listBudgetPlanRequests();
      setDrafts(Array.isArray(response?.requests) ? response.requests : []);
      setDraftState('success');
    } catch (error) {
      setDrafts([]);
      setDraftState(error instanceof ApiClientError && error.status === 401 ? 'auth' : 'error');
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const selectedLodging = useMemo(() => new Set(lodgingTypes), [lodgingTypes]);

  function toggleLodging(type) {
    setLodgingTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const raw = {
      originLabel: String(form.get('originLabel') ?? '').trim(),
      flexibleDates: dateMode === 'flexible',
      minNights: Number(form.get('minNights')),
      maxNights: Number(form.get('maxNights')),
      budgetAmount: Number(form.get('budgetAmount')),
      budgetCurrencyCode: currency,
      adults: Number(form.get('adults')),
      childrenAges: parseChildrenAges(form.get('childrenAges')),
      interests: splitList(form.get('interests')),
      comfortLevel: String(form.get('comfortLevel') ?? 'VALUE'),
      safetyReservePercent: Number(form.get('safetyReservePercent')),
      accommodation: lodgingTypes.length
        ? {
            types: lodgingTypes,
            familyFriendly,
          }
        : undefined,
    };

    if (dateMode === 'fixed') {
      raw.fixedDeparture = String(form.get('fixedDeparture') ?? '');
      raw.fixedReturn = String(form.get('fixedReturn') ?? '');
    } else {
      const earliestDeparture = String(form.get('earliestDeparture') ?? '');
      const latestReturn = String(form.get('latestReturn') ?? '');
      if (earliestDeparture) raw.earliestDeparture = earliestDeparture;
      if (latestReturn) raw.latestReturn = latestReturn;
    }

    const parsed = createBudgetPlanRequestSchema.safeParse(raw);
    if (!parsed.success) {
      setSubmitState({ type: 'error', message: copy.invalid });
      return;
    }

    setSubmitting(true);
    setSubmitState({ type: 'idle', message: '' });

    try {
      const response = await apiClient.createBudgetPlanRequest(parsed.data);
      const saved = response?.planRequest;
      if (!saved?.id) throw new Error('Missing saved planning request.');
      setDrafts((current) => [saved, ...current.filter((item) => item.id !== saved.id)].slice(0, 20));
      setDraftState('success');
      setSubmitState({ type: 'success', message: copy.saved });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setDraftState('auth');
        setSubmitState({ type: 'auth', message: copy.signIn });
      } else {
        setSubmitState({ type: 'error', message: copy.saveFailed });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <div className={`shell ${styles.shell}`}>
        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroBadge}>
            <LockKeyhole size={18} aria-hidden="true" />
            <span>{copy.openDestination}</span>
          </div>
        </header>

        <div className={styles.layout}>
          <form className={styles.formCard} onSubmit={submit} noValidate>
            <div className={styles.sectionHeading}>
              <Sparkles size={20} aria-hidden="true" />
              <div>
                <h2>{copy.openDestination}</h2>
                <p>{copy.openDestinationHint}</p>
              </div>
            </div>

            <label className={styles.fieldFull}>
              <span>{copy.origin}</span>
              <input
                name="originLabel"
                type="text"
                minLength={2}
                maxLength={160}
                placeholder={copy.originPlaceholder}
                autoComplete="address-level2"
                required
              />
            </label>

            <fieldset className={styles.fieldset}>
              <legend>{copy.dates}</legend>
              <div className={styles.segmented}>
                <label>
                  <input
                    type="radio"
                    name="dateMode"
                    value="fixed"
                    checked={dateMode === 'fixed'}
                    onChange={() => setDateMode('fixed')}
                  />
                  <span>{copy.fixed}</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="dateMode"
                    value="flexible"
                    checked={dateMode === 'flexible'}
                    onChange={() => setDateMode('flexible')}
                  />
                  <span>{copy.flexible}</span>
                </label>
              </div>

              <div className={styles.gridTwo}>
                {dateMode === 'fixed' ? (
                  <>
                    <label>
                      <span>{copy.departure}</span>
                      <input name="fixedDeparture" type="date" required />
                    </label>
                    <label>
                      <span>{copy.returnDate}</span>
                      <input name="fixedReturn" type="date" required />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      <span>{copy.earliest}</span>
                      <input name="earliestDeparture" type="date" />
                    </label>
                    <label>
                      <span>{copy.latest}</span>
                      <input name="latestReturn" type="date" />
                    </label>
                  </>
                )}
                <label>
                  <span>{copy.minNights}</span>
                  <input name="minNights" type="number" min="1" max="90" defaultValue="2" required />
                </label>
                <label>
                  <span>{copy.maxNights}</span>
                  <input name="maxNights" type="number" min="1" max="90" defaultValue="14" required />
                </label>
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>{copy.budget}</legend>
              <div className={styles.gridThree}>
                <label>
                  <span>{copy.amount}</span>
                  <input name="budgetAmount" type="number" min="1" step="0.01" required />
                </label>
                <label>
                  <span>{copy.currency}</span>
                  <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                    {CURRENCY_CODES.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{copy.reserve}</span>
                  <input
                    name="safetyReservePercent"
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    defaultValue="7.5"
                    required
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>{copy.travellers}</legend>
              <div className={styles.gridTwo}>
                <label>
                  <span>{copy.adults}</span>
                  <input name="adults" type="number" min="1" max="20" defaultValue="1" required />
                </label>
                <label>
                  <span>{copy.children}</span>
                  <input name="childrenAges" type="text" inputMode="numeric" placeholder={copy.childrenHint} />
                </label>
              </div>
            </fieldset>

            <div className={styles.gridTwo}>
              <label>
                <span>{copy.interests}</span>
                <input name="interests" type="text" placeholder={copy.interestsHint} />
              </label>
              <label>
                <span>{copy.comfort}</span>
                <select name="comfortLevel" defaultValue="VALUE">
                  {Object.entries(copy.comfortLevels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>{copy.lodging}</legend>
              <p className={styles.hint}>{copy.lodgingHint}</p>
              <div className={styles.checkGrid}>
                {LODGING_TYPES.map((type) => (
                  <label className={styles.checkOption} key={type}>
                    <input
                      type="checkbox"
                      checked={selectedLodging.has(type)}
                      onChange={() => toggleLodging(type)}
                    />
                    <span>{copy.lodgingTypes[type] ?? type.replaceAll('_', ' ')}</span>
                  </label>
                ))}
              </div>
              <label className={styles.familyOption}>
                <input
                  type="checkbox"
                  checked={familyFriendly}
                  onChange={(event) => setFamilyFriendly(event.target.checked)}
                />
                <span>{copy.familyFriendly}</span>
              </label>
            </fieldset>

            {submitState.message ? (
              <div
                className={submitState.type === 'success' ? styles.success : styles.error}
                role={submitState.type === 'success' ? 'status' : 'alert'}
              >
                <span>{submitState.message}</span>
                {submitState.type === 'auth' ? <Link href="/login">{copy.signInLink}</Link> : null}
              </div>
            ) : null}

            <button className="button button--dark" type="submit" disabled={submitting}>
              {submitting ? (
                <LoaderCircle className={styles.spin} size={18} aria-hidden="true" />
              ) : (
                <Save size={18} aria-hidden="true" />
              )}
              {submitting ? copy.saving : copy.save}
            </button>

            <p className={styles.privacy}>
              <LockKeyhole size={15} aria-hidden="true" />
              <span>{copy.privacy}</span>
            </p>
          </form>

          <aside className={styles.draftsCard} aria-labelledby="planner-drafts-title">
            <div className={styles.sectionHeading}>
              <CalendarDays size={20} aria-hidden="true" />
              <h2 id="planner-drafts-title">{copy.recent}</h2>
            </div>

            {draftState === 'loading' ? (
              <div className={styles.state} role="status">
                <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
                <span>{copy.loading}</span>
              </div>
            ) : null}

            {draftState === 'auth' ? (
              <div className={styles.state}>
                <LockKeyhole size={24} aria-hidden="true" />
                <p>{copy.signIn}</p>
                <Link className="button button--secondary button--compact" href="/login">
                  {copy.signInLink}
                </Link>
              </div>
            ) : null}

            {draftState === 'error' ? (
              <div className={styles.state} role="alert">
                <RefreshCw size={24} aria-hidden="true" />
                <p>{copy.unavailable}</p>
                <button
                  className="button button--secondary button--compact"
                  type="button"
                  onClick={() => void loadDrafts()}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  {copy.retry}
                </button>
              </div>
            ) : null}

            {draftState === 'success' && drafts.length === 0 ? (
              <div className={styles.state} role="status">
                <CircleDollarSign size={24} aria-hidden="true" />
                <p>{copy.empty}</p>
              </div>
            ) : null}

            {draftState === 'success' && drafts.length > 0 ? (
              <ul className={styles.draftList}>
                {drafts.map((request) => {
                  const travellerCount =
                    Number(request?.travellers?.adults ?? 0) +
                    (Array.isArray(request?.travellers?.childrenAges)
                      ? request.travellers.childrenAges.length
                      : 0);
                  return (
                    <li className={styles.draft} key={request.id}>
                      <div className={styles.draftTop}>
                        <strong>{request.origin?.label ?? copy.openDestination}</strong>
                        <span>{request.status}</span>
                      </div>
                      <div className={styles.draftMeta}>
                        <span><CircleDollarSign size={15} />{request.budget?.amount} {request.budget?.currencyCode}</span>
                        <span><Users size={15} />{travellerCount}</span>
                        <span><CalendarDays size={15} />{formatDateRange(request, copy)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
