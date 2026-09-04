'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, MapPin, RefreshCw, Search } from 'lucide-react';

import { getCountryDisplayName } from '@attravoya/localization';

import { apiClient } from '../../lib/api-client.js';
import { rememberRecentSearch } from '../../lib/recent-searches.js';
import styles from './destination-search.module.css';

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;

/**
 * @typedef {object} DestinationResult
 * @property {string|null|undefined} externalId
 * @property {string} name
 * @property {string|null|undefined} state
 * @property {string|null|undefined} country
 * @property {string} countryCode
 * @property {number} latitude
 * @property {number} longitude
 */

/** @param {DestinationResult} result */
function destinationResultId(result) {
  return (
    result.externalId ??
    [result.name, result.countryCode, result.latitude, result.longitude].filter(Boolean).join(':')
  );
}

/**
 * @param {DestinationResult} result
 * @param {string} locale
 */
function destinationLabel(result, locale) {
  const country = result.countryCode
    ? getCountryDisplayName(result.countryCode, locale)
    : result.country;
  return [result.name, country].filter(Boolean).join(', ');
}

/**
 * Search real destination candidates through the backend provider adapter.
 * The browser never receives Geoapify credentials; it only talks to the
 * AttraVoya API and renders the normalized destination contract.
 */
export function DestinationSearch({ initialQuery = '', locale = 'en', messages }) {
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState(/** @type {DestinationResult[]} */ ([]));
  const [status, setStatus] = useState('idle');
  const [formError, setFormError] = useState(false);
  const [selectedId, setSelectedId] = useState(/** @type {string|null} */ (null));
  const requestSequence = useRef(0);
  const initialSearchStarted = useRef(false);

  const runSearch = useCallback(
    async (rawQuery) => {
      const cleanQuery = String(rawQuery ?? '').trim();
      if (cleanQuery.length < MIN_QUERY_LENGTH) {
        setFormError(true);
        setStatus('idle');
        setResults([]);
        return;
      }

      const requestId = ++requestSequence.current;
      setFormError(false);
      setSubmittedQuery(cleanQuery);
      setSelectedId(null);
      setStatus('loading');

      try {
        const response = await apiClient.searchDestinations({
          query: cleanQuery,
          language: locale,
          limit: RESULT_LIMIT,
        });

        // Ignore an older response when a newer search has already started.
        if (requestId !== requestSequence.current) return;
        setResults(
          Array.isArray(response?.destinations?.results)
            ? /** @type {DestinationResult[]} */ (response.destinations.results)
            : [],
        );
        setStatus('success');
      } catch {
        if (requestId !== requestSequence.current) return;
        setResults([]);
        setStatus('error');
      }
    },
    [locale],
  );

  useEffect(() => {
    const cleanInitialQuery = initialQuery.trim();
    if (initialSearchStarted.current || cleanInitialQuery.length < MIN_QUERY_LENGTH) return;
    initialSearchStarted.current = true;
    void runSearch(cleanInitialQuery);
  }, [initialQuery, runSearch]);

  function submit(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length >= MIN_QUERY_LENGTH) {
      rememberRecentSearch({
        type: 'DESTINATION',
        label: cleanQuery,
        criteria: { query: cleanQuery },
      });
    }
    void runSearch(cleanQuery);
  }

  /** @param {DestinationResult} result */
  function selectDestination(result) {
    const id = destinationResultId(result);
    setSelectedId(id);
    rememberRecentSearch({
      type: 'DESTINATION',
      label: destinationLabel(result, locale),
      criteria: {
        query: submittedQuery || query.trim(),
        countryCode: result.countryCode,
        destinationId: result.externalId ?? undefined,
      },
    });
  }

  return (
    <section className={styles.section} aria-labelledby="destination-search-title">
      <div className={`shell ${styles.shell}`}>
        <div className={styles.heading}>
          <span className="eyebrow">{messages.navigation.explore}</span>
          <h1 id="destination-search-title">{messages.home.exploreCta}</h1>
          <p>{messages.search.destinationQuestion}</p>
        </div>

        <div className={styles.panel}>
          <form className={styles.form} onSubmit={submit} noValidate>
            <label className={styles.field}>
              <span>{messages.search.destinationQuestion}</span>
              <div className={styles.inputWrap}>
                <Search size={20} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (formError) setFormError(false);
                  }}
                  placeholder={messages.search.destinationPlaceholder}
                  aria-invalid={formError}
                  aria-describedby={formError ? 'destination-search-error' : undefined}
                  autoComplete="off"
                />
              </div>
            </label>
            <button className="button button--accent" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? (
                <LoaderCircle className={styles.spin} size={18} aria-hidden="true" />
              ) : (
                <Search size={18} aria-hidden="true" />
              )}
              {messages.common.search}
            </button>
          </form>

          {formError ? (
            <p className="field-error" id="destination-search-error">
              {messages.search.destinationQuestion}
            </p>
          ) : null}

          <div className={styles.statusRegion} aria-live="polite">
            {status === 'loading' ? (
              <div className={styles.stateCard} role="status">
                <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
                <span>{messages.common.loading}</span>
              </div>
            ) : null}

            {status === 'error' ? (
              <div className={styles.stateCard} role="alert">
                <RefreshCw size={24} aria-hidden="true" />
                <span>{messages.common.unavailable}</span>
                <button
                  className="button button--secondary button--compact"
                  type="button"
                  onClick={() => void runSearch(submittedQuery || query)}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  {messages.common.retry}
                </button>
              </div>
            ) : null}

            {status === 'success' && results.length === 0 ? (
              <div className={styles.stateCard} role="status">
                <Search size={24} aria-hidden="true" />
                <strong>{messages.search.destinationPlaceholder}</strong>
                <span>{submittedQuery}</span>
              </div>
            ) : null}
          </div>

          {status === 'success' && results.length > 0 ? (
            <ul className={styles.results} aria-label={messages.home.exploreCta}>
              {results.map((result) => {
                const id = destinationResultId(result);
                const isSelected = selectedId === id;
                const countryName = result.countryCode
                  ? getCountryDisplayName(result.countryCode, locale)
                  : result.country;

                return (
                  <li key={id}>
                    <button
                      className={`${styles.resultButton} ${isSelected ? styles.selected : ''}`}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectDestination(result)}
                    >
                      <span className={styles.pin} aria-hidden="true">
                        <MapPin size={19} />
                      </span>
                      <span className={styles.resultCopy}>
                        <strong>{result.name}</strong>
                        <span>{[result.state, countryName].filter(Boolean).join(' · ')}</span>
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className={styles.check} size={20} aria-hidden="true" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
