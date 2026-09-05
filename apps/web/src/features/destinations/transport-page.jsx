'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, LoaderCircle, MapPin, RefreshCw, Route, Search } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { buildDestinationHref } from './destination-route.js';
import { getTransportPageCopy } from './transport-page-copy.js';
import styles from './transport-page.module.css';

/** @typedef {'drive'|'walk'|'bicycle'} RouteMode */
/** @typedef {'idle'|'loading'|'success'|'empty'|'error'|'invalid'} AsyncStatus */

/**
 * @typedef {object} TransportDestination
 * @property {string} name
 * @property {string} countryCode
 * @property {string} countryDisplayName
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} slug
 * @property {string|null|undefined} [provider]
 * @property {string|null|undefined} [externalId]
 * @property {string|null|undefined} [state]
 * @property {string|null|undefined} [timeZone]
 */

/**
 * @typedef {object} RoutePlace
 * @property {string|null} externalId
 * @property {string} name
 * @property {string|null} formattedAddress
 * @property {number} latitude
 * @property {number} longitude
 */

/** @param {unknown} value */
function textValue(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

/** @param {unknown} value */
function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** @param {string|null|undefined} provider */
function providerDisplayName(provider) {
  const value = String(provider ?? '')
    .trim()
    .toLowerCase();
  if (value === 'geoapify') return 'Geoapify';
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : null;
}

/**
 * @param {unknown} row
 * @param {string} countryCode
 * @returns {RoutePlace|null}
 */
function normalizePlace(row, countryCode) {
  const value = /** @type {any} */ (row);
  const latitude = finiteNumber(value?.latitude);
  const longitude = finiteNumber(value?.longitude);
  const name = textValue(value?.name);
  const rowCountryCode = textValue(value?.countryCode)?.toUpperCase();

  if (
    !name ||
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    rowCountryCode !== countryCode
  ) {
    return null;
  }

  return {
    externalId: textValue(value?.externalId),
    name,
    formattedAddress: textValue(value?.formattedAddress),
    latitude,
    longitude,
  };
}

/**
 * @param {TransportDestination} destination
 * @param {string} query
 * @param {string} locale
 * @returns {Promise<{status: AsyncStatus, places: RoutePlace[]}>}
 */
async function requestPlaces(destination, query, locale) {
  try {
    const response = /** @type {any} */ (
      await apiClient.autocompletePlaces({
        query,
        limit: 6,
        language: locale,
        countryCode: destination.countryCode,
        biasLatitude: destination.latitude,
        biasLongitude: destination.longitude,
      })
    );
    const rows = Array.isArray(response?.places?.results) ? response.places.results : [];
    const seen = new Set();
    const places = rows
      .map((row) => normalizePlace(row, destination.countryCode))
      .filter((place) => place !== null)
      .filter((place) => {
        const key =
          place.externalId ??
          `${place.name}:${place.latitude.toFixed(6)}:${place.longitude.toFixed(6)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return { status: places.length ? 'success' : 'empty', places };
  } catch {
    return { status: 'error', places: [] };
  }
}

/**
 * @param {TransportDestination} destination
 * @param {RoutePlace} place
 * @param {RouteMode} mode
 * @param {string} locale
 * @returns {Promise<{status: AsyncStatus, data: any}>}
 */
async function requestRoute(destination, place, mode, locale) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getMapRoute({
        startLatitude: destination.latitude,
        startLongitude: destination.longitude,
        endLatitude: place.latitude,
        endLongitude: place.longitude,
        mode,
        language: locale,
      })
    );
    const route = response?.route;
    const provider = textValue(route?.provider);
    const distanceMeters = finiteNumber(route?.distanceMeters);
    const durationSeconds = finiteNumber(route?.durationSeconds);

    if (
      !route ||
      !provider ||
      route.mode !== mode ||
      distanceMeters === null ||
      distanceMeters < 0 ||
      durationSeconds === null ||
      durationSeconds < 0
    ) {
      return { status: 'empty', data: null };
    }

    return {
      status: 'success',
      data: {
        provider,
        fetchedAt: textValue(route.fetchedAt),
        mode,
        distanceMeters,
        durationSeconds,
      },
    };
  } catch {
    return { status: 'error', data: null };
  }
}

function template(value, destinationName) {
  return value.replace('{destination}', destinationName);
}

/**
 * @param {Intl.NumberFormat} formatter
 * @param {number} meters
 */
function formatDistance(formatter, meters) {
  return meters >= 1000
    ? `${formatter.format(meters / 1000)} km`
    : `${formatter.format(Math.round(meters))} m`;
}

/**
 * @param {object} props
 * @param {TransportDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function TransportDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getTransportPageCopy(locale);
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState(
    /** @type {{status: AsyncStatus, places: RoutePlace[]}} */ ({ status: 'idle', places: [] }),
  );
  const [selectedPlace, setSelectedPlace] = useState(/** @type {RoutePlace|null} */ (null));
  const [mode, setMode] = useState(/** @type {RouteMode} */ ('walk'));
  const [routeState, setRouteState] = useState(
    /** @type {{status: AsyncStatus, data: any}} */ ({ status: 'idle', data: null }),
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="transport-unavailable-title">
        <div className={`shell ${styles.emptyShell}`}>
          <MapPin size={34} aria-hidden="true" />
          <h1 id="transport-unavailable-title">{messages.common.unavailable}</h1>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const routeOrigin = destination;

  async function runPlaceSearch() {
    const normalizedQuery = query.trim();
    setSelectedPlace(null);
    setRouteState({ status: 'idle', data: null });

    if (normalizedQuery.length < 2) {
      setSearchState({ status: 'invalid', places: [] });
      return;
    }

    setSearchState({ status: 'loading', places: [] });
    const nextState = await requestPlaces(routeOrigin, normalizedQuery, locale);
    setSearchState(nextState);
  }

  function handleSearch(event) {
    event.preventDefault();
    void runPlaceSearch();
  }

  function calculateRoute(place, nextMode) {
    setRouteState({ status: 'loading', data: null });
    void requestRoute(routeOrigin, place, nextMode, locale).then(setRouteState);
  }

  function selectPlace(place) {
    setSelectedPlace(place);
    calculateRoute(place, mode);
  }

  function handleModeChange(event) {
    const nextMode = /** @type {RouteMode} */ (event.target.value);
    setMode(nextMode);
    if (selectedPlace) calculateRoute(selectedPlace, nextMode);
  }

  function retryRoute() {
    if (selectedPlace) calculateRoute(selectedPlace, mode);
  }

  const route = routeState.data;
  const routeProvider = providerDisplayName(route?.provider);
  const fetchedAt = route?.fetchedAt ? new Date(route.fetchedAt) : null;
  const hasValidFetchedAt = fetchedAt && Number.isFinite(fetchedAt.getTime());
  const modeOptions = [
    { value: 'walk', label: copy.walk },
    { value: 'bicycle', label: copy.bicycle },
    { value: 'drive', label: copy.drive },
  ];

  return (
    <section className={styles.page} aria-labelledby="transport-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={buildDestinationHref(destination)}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1 id="transport-title">{template(copy.title, destination.name)}</h1>
          <p>{copy.intro}</p>
        </header>

        <div className={styles.grid}>
          <div className={styles.searchPanel}>
            <div className={styles.startCard}>
              <MapPin size={20} aria-hidden="true" />
              <div>
                <span>{copy.start}</span>
                <strong>{template(copy.centre, destination.name)}</strong>
              </div>
            </div>

            <form className={styles.searchForm} onSubmit={handleSearch}>
              <label htmlFor="transport-destination-search">{copy.destinationLabel}</label>
              <div className={styles.searchRow}>
                <input
                  id="transport-destination-search"
                  type="search"
                  value={query}
                  maxLength={200}
                  autoComplete="off"
                  placeholder={copy.searchPlaceholder}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button className="button button--accent" type="submit">
                  <Search size={17} aria-hidden="true" />
                  {copy.search}
                </button>
              </div>
            </form>

            <div className={styles.searchState} aria-live="polite">
              {searchState.status === 'loading' ? (
                <span className={styles.stateLine} role="status">
                  <LoaderCircle className={styles.spin} size={19} aria-hidden="true" />
                  {messages.common.loading}
                </span>
              ) : null}
              {searchState.status === 'invalid' ? <span>{copy.searchHint}</span> : null}
              {searchState.status === 'empty' ? <span>{copy.noPlaces}</span> : null}
              {searchState.status === 'error' ? (
                <span className={styles.retryLine}>
                  {copy.searchUnavailable}
                  <button
                    className="button button--secondary button--compact"
                    type="button"
                    onClick={() => void runPlaceSearch()}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    {messages.common.retry}
                  </button>
                </span>
              ) : null}
            </div>

            {searchState.status === 'success' ? (
              <section className={styles.results} aria-labelledby="transport-results-title">
                <h2 id="transport-results-title">{copy.searchResults}</h2>
                <div className={styles.resultList}>
                  {searchState.places.map((place) => {
                    const key =
                      place.externalId ??
                      `${place.name}:${place.latitude.toFixed(6)}:${place.longitude.toFixed(6)}`;
                    return (
                      <button
                        className={`${styles.placeButton} ${selectedPlace === place ? styles.placeButtonSelected : ''}`}
                        type="button"
                        key={key}
                        onClick={() => selectPlace(place)}
                      >
                        <MapPin size={18} aria-hidden="true" />
                        <span>
                          <strong>{place.name}</strong>
                          {place.formattedAddress ? <small>{place.formattedAddress}</small> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.routePanel} aria-labelledby="transport-route-title">
            <div className={styles.routeHeading}>
              <span className={styles.routeIcon} aria-hidden="true">
                <Route size={22} />
              </span>
              <h2 id="transport-route-title">{copy.routeTitle}</h2>
            </div>

            <label className={styles.modeField} htmlFor="transport-mode">
              <span>{copy.mode}</span>
              <select id="transport-mode" value={mode} onChange={handleModeChange}>
                {modeOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {selectedPlace ? (
              <div className={styles.selectedRoute}>
                <span>{template(copy.centre, destination.name)}</span>
                <strong aria-hidden="true">→</strong>
                <span>{selectedPlace.name}</span>
              </div>
            ) : (
              <p className={styles.routePrompt}>{copy.destinationLabel}</p>
            )}

            {routeState.status === 'loading' ? (
              <div className={styles.routeState} role="status">
                <LoaderCircle className={styles.spin} size={21} aria-hidden="true" />
                {messages.common.loading}
              </div>
            ) : null}

            {routeState.status === 'empty' ? (
              <div className={styles.routeState} role="status">
                <span>{copy.noRoute}</span>
                <button
                  className="button button--secondary button--compact"
                  type="button"
                  onClick={retryRoute}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  {messages.common.retry}
                </button>
              </div>
            ) : null}

            {routeState.status === 'error' ? (
              <div className={styles.routeState} role="status">
                <span>{copy.routeUnavailable}</span>
                <button
                  className="button button--secondary button--compact"
                  type="button"
                  onClick={retryRoute}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  {messages.common.retry}
                </button>
              </div>
            ) : null}

            {routeState.status === 'success' && route ? (
              <div className={styles.routeSummary}>
                <div>
                  <span>{copy.distance}</span>
                  <strong>{formatDistance(numberFormatter, route.distanceMeters)}</strong>
                </div>
                <div>
                  <span>{copy.duration}</span>
                  <strong>
                    {numberFormatter.format(Math.round(route.durationSeconds / 60))} {copy.minutes}
                  </strong>
                </div>
                {routeProvider ? (
                  <div>
                    <span>{copy.provider}</span>
                    <strong>{routeProvider}</strong>
                  </div>
                ) : null}
                {hasValidFetchedAt ? (
                  <div>
                    <span>{copy.providerChecked}</span>
                    <strong>{dateTimeFormatter.format(fetchedAt)}</strong>
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className={styles.disclaimer}>{copy.disclaimer}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
