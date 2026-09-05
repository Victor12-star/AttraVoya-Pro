'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation,
  Plane,
  RefreshCw,
} from 'lucide-react';
import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { getAirportsPageCopy } from './airports-page-copy.js';
import { buildDestinationHref } from './destination-route.js';
import styles from './airports-page.module.css';

const SEARCH_RADIUS_METERS = 50_000;
const SEARCH_LIMIT = 20;

/** @typedef {{status: 'idle'|'loading'|'success'|'empty'|'error', data: any}} AirportState */

/** @param {unknown} value @param {number} maxLength */
function textValue(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

/** @param {unknown} value */
function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** @param {unknown} value */
function safeWebsite(value) {
  const candidate = textValue(value, 1000);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** @param {unknown} provider */
function providerDisplayName(provider) {
  const value = String(provider ?? '')
    .trim()
    .toLowerCase();
  if (value === 'geoapify') return 'Geoapify';
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : null;
}

/**
 * @param {any} place
 * @param {number} index
 * @param {string} destinationCountryCode
 * @param {string|null} resultProvider
 */
function normalizeAirport(place, index, destinationCountryCode, resultProvider) {
  const name = textValue(place?.name, 180);
  const provider = textValue(place?.provider, 40)?.toLowerCase() ?? resultProvider ?? 'unknown';
  const rowCountryCode = textValue(place?.countryCode, 2)?.toUpperCase() ?? null;
  const latitude = finiteNumber(place?.latitude);
  const longitude = finiteNumber(place?.longitude);

  if (
    !name ||
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (rowCountryCode && rowCountryCode !== destinationCountryCode) ||
    (resultProvider && provider !== resultProvider)
  ) {
    return null;
  }

  const externalId = textValue(place?.externalId, 240);
  const distanceMeters = finiteNumber(place?.distanceMeters);
  const fallbackKey = `${name}:${latitude.toFixed(6)}:${longitude.toFixed(6)}:${index}`;

  return {
    key: externalId ? `${provider}:${externalId}` : fallbackKey,
    provider,
    name,
    formattedAddress: textValue(place?.formattedAddress, 500),
    distanceMeters: distanceMeters !== null && distanceMeters >= 0 ? distanceMeters : null,
    website: safeWebsite(place?.website),
  };
}

/**
 * @param {unknown} rows
 * @param {string} countryCode
 * @param {string|null} provider
 */
function normalizeAirports(rows, countryCode, provider) {
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const airports = [];
  rows.forEach((place, index) => {
    const airport = normalizeAirport(place, index, countryCode, provider);
    if (!airport || seen.has(airport.key)) return;
    seen.add(airport.key);
    airports.push(airport);
  });

  return airports.sort((left, right) => {
    if (left.distanceMeters === null && right.distanceMeters === null) return 0;
    if (left.distanceMeters === null) return 1;
    if (right.distanceMeters === null) return -1;
    return left.distanceMeters - right.distanceMeters;
  });
}

/**
 * @param {any} destination
 * @param {string} locale
 * @returns {Promise<AirportState>}
 */
async function requestAirports(destination, locale) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getNearbyPlaces({
        categoryGroup: PLACE_CATEGORY_GROUPS.AIRPORTS,
        latitude: destination.latitude,
        longitude: destination.longitude,
        radiusMeters: SEARCH_RADIUS_METERS,
        limit: SEARCH_LIMIT,
        language: locale,
      })
    );
    const places = response?.places ?? null;
    const provider = textValue(places?.provider, 40)?.toLowerCase() ?? null;
    const airports = normalizeAirports(places?.results, destination.countryCode, provider);

    return {
      status: airports.length ? 'success' : 'empty',
      data: {
        provider,
        fetchedAt: textValue(places?.fetchedAt, 80),
        airports,
      },
    };
  } catch {
    return { status: 'error', data: null };
  }
}

/** @param {Intl.NumberFormat} formatter @param {number|null} meters */
function formatDistance(formatter, meters) {
  if (meters === null) return null;
  if (meters < 1000) return `${formatter.format(Math.round(meters))} m`;
  return `${formatter.format(meters / 1000)} km`;
}

/** @param {string} value @param {string} destinationName */
function destinationText(value, destinationName) {
  return value.replace('{destination}', destinationName);
}

export function AirportsDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getAirportsPageCopy(locale);
  const [state, setState] = useState(
    /** @type {AirportState} */ ({
      status: destination ? 'loading' : 'idle',
      data: null,
    }),
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  useEffect(() => {
    if (!destination) return;
    let active = true;

    void requestAirports(destination, locale).then((nextState) => {
      if (active) setState(nextState);
    });

    return () => {
      active = false;
    };
  }, [destination, locale]);

  function retry() {
    if (!destination) return;
    setState({ status: 'loading', data: null });
    void requestAirports(destination, locale).then(setState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="airports-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <Plane size={34} aria-hidden="true" />
          <h1 id="airports-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.unavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const airports = state.data?.airports ?? [];
  const providerName = providerDisplayName(state.data?.provider);
  const fetchedAt = state.data?.fetchedAt ? new Date(state.data.fetchedAt) : null;
  const validFetchedAt = fetchedAt && Number.isFinite(fetchedAt.getTime());

  return (
    <section className={styles.page} aria-labelledby="airports-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={buildDestinationHref(destination)}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="airports-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            <span>
              <Navigation size={15} aria-hidden="true" />
              50 km
            </span>
            {providerName ? <span>{providerName}</span> : null}
            {validFetchedAt ? (
              <span>{`${copy.providerChecked}: ${dateTimeFormatter.format(fetchedAt)}`}</span>
            ) : null}
          </div>
        </header>

        {state.status === 'loading' || state.status === 'idle' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={26} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <Plane size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.unavailable}</span>
            <button className="button button--secondary button--compact" type="button" onClick={retry}>
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {state.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <MapPin size={28} aria-hidden="true" />
            <span>{copy.noResults}</span>
            <button className="button button--secondary button--compact" type="button" onClick={retry}>
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <section aria-labelledby="airports-results-title">
            <h2 className={styles.resultsTitle} id="airports-results-title">
              {copy.results}
            </h2>
            <div className={styles.grid} aria-live="polite">
              {airports.map((airport) => {
                const distance = formatDistance(numberFormatter, airport.distanceMeters);
                return (
                  <article className={styles.card} key={airport.key}>
                    <div className={styles.cardHeading}>
                      <span className={styles.cardIcon} aria-hidden="true">
                        <Plane size={20} />
                      </span>
                      <h3>{airport.name}</h3>
                    </div>

                    {airport.formattedAddress ? (
                      <p className={styles.address}>
                        <MapPin size={16} aria-hidden="true" />
                        <span>{airport.formattedAddress}</span>
                      </p>
                    ) : null}

                    <div className={styles.cardFooter}>
                      {distance ? (
                        <span className={styles.distance}>
                          <Navigation size={15} aria-hidden="true" />
                          {distance}
                        </span>
                      ) : (
                        <span />
                      )}
                      {airport.website ? (
                        <a
                          className={styles.websiteLink}
                          href={airport.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {copy.website}
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <p className={styles.disclaimer}>{copy.disclaimer}</p>
      </div>
    </section>
  );
}
