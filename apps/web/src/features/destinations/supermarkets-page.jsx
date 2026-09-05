'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { buildDestinationHref } from './destination-route.js';
import { getSupermarketsPageCopy } from './supermarkets-page-copy.js';
import styles from './supermarkets-page.module.css';

const SEARCH_RADIUS_METERS = 10_000;
const SEARCH_LIMIT = 24;

/** @typedef {{status: 'idle'|'loading'|'success'|'empty'|'error', data: any}} SupermarketState */

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
 * Normalize only provider fields supported by AttraVoya's public places contract.
 * Unexpected stock, price, opening, delivery and payment claims remain deliberately ignored.
 * @param {any} place
 * @param {number} index
 * @param {string} destinationCountryCode
 * @param {string|null} resultProvider
 */
function normalizeSupermarket(place, index, destinationCountryCode, resultProvider) {
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

/** @param {unknown} rows @param {string} countryCode @param {string|null} provider */
function normalizeSupermarkets(rows, countryCode, provider) {
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const supermarkets = [];
  rows.forEach((place, index) => {
    const normalized = normalizeSupermarket(place, index, countryCode, provider);
    if (!normalized || seen.has(normalized.key)) return;
    seen.add(normalized.key);
    supermarkets.push(normalized);
  });

  return supermarkets.sort((left, right) => {
    if (left.distanceMeters === null && right.distanceMeters === null) return 0;
    if (left.distanceMeters === null) return 1;
    if (right.distanceMeters === null) return -1;
    return left.distanceMeters - right.distanceMeters;
  });
}

/** @param {any} destination @param {string} locale @returns {Promise<SupermarketState>} */
async function requestSupermarkets(destination, locale) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getNearbyPlaces({
        categoryGroup: PLACE_CATEGORY_GROUPS.SUPERMARKETS,
        latitude: destination.latitude,
        longitude: destination.longitude,
        radiusMeters: SEARCH_RADIUS_METERS,
        limit: SEARCH_LIMIT,
        language: locale,
      })
    );
    const places = response?.places ?? null;
    const provider = textValue(places?.provider, 40)?.toLowerCase() ?? null;
    const supermarkets = normalizeSupermarkets(places?.results, destination.countryCode, provider);

    return {
      status: supermarkets.length ? 'success' : 'empty',
      data: {
        provider,
        fetchedAt: textValue(places?.fetchedAt, 80),
        supermarkets,
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

export function SupermarketsDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getSupermarketsPageCopy(locale);
  const [state, setState] = useState(
    /** @type {SupermarketState} */ ({
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

    void requestSupermarkets(destination, locale).then((nextState) => {
      if (active) setState(nextState);
    });

    return () => {
      active = false;
    };
  }, [destination, locale]);

  function retry() {
    if (!destination) return;
    setState({ status: 'loading', data: null });
    void requestSupermarkets(destination, locale).then(setState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="supermarkets-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <ShoppingBag size={34} aria-hidden="true" />
          <h1 id="supermarkets-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.unavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const supermarkets = state.data?.supermarkets ?? [];
  const providerName = providerDisplayName(state.data?.provider);
  const fetchedAt = state.data?.fetchedAt ? new Date(state.data.fetchedAt) : null;
  const validFetchedAt = fetchedAt && Number.isFinite(fetchedAt.getTime());

  return (
    <section className={styles.page} aria-labelledby="supermarkets-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={buildDestinationHref(destination)}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="supermarkets-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            <span>
              <Navigation size={15} aria-hidden="true" />
              10 km
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
            <ShoppingBag size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.unavailable}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retry}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {state.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <MapPin size={28} aria-hidden="true" />
            <span>{copy.noResults}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retry}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <section aria-labelledby="supermarkets-results-title">
            <h2 className={styles.resultsTitle} id="supermarkets-results-title">
              {copy.results}
            </h2>
            <div className={styles.grid} aria-live="polite">
              {supermarkets.map((place) => {
                const distance = formatDistance(numberFormatter, place.distanceMeters);
                return (
                  <article className={styles.card} key={place.key}>
                    <div className={styles.cardHeading}>
                      <span className={styles.cardIcon} aria-hidden="true">
                        <ShoppingBag size={20} />
                      </span>
                      <h3>{place.name}</h3>
                    </div>

                    {place.formattedAddress ? (
                      <p className={styles.address}>
                        <MapPin size={16} aria-hidden="true" />
                        <span>{place.formattedAddress}</span>
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
                      {place.website ? (
                        <a
                          className={styles.websiteLink}
                          href={place.website}
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
