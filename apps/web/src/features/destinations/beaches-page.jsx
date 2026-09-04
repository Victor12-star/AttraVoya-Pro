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
  Waves,
} from 'lucide-react';
import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { getBeachesPageCopy } from './beaches-page-copy.js';
import styles from './beaches-page.module.css';
import { buildDestinationHref } from './destination-route.js';

const SEARCH_RADIUS_METERS = 20_000;
const SEARCH_LIMIT = 24;

/**
 * @typedef {object} BeachDestination
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

/** @typedef {{status: 'idle'|'loading'|'success'|'empty'|'error', data: any}} BeachState */

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
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
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

/** @param {any} place @param {number} index */
function normalizeBeach(place, index) {
  const name = textValue(place?.name, 180);
  if (!name) return null;

  const provider = textValue(place?.provider, 40) ?? 'unknown';
  const externalId = textValue(place?.externalId, 240);
  const latitude = finiteNumber(place?.latitude);
  const longitude = finiteNumber(place?.longitude);
  const formattedAddress = textValue(place?.formattedAddress, 500);
  const distanceMeters = finiteNumber(place?.distanceMeters);
  const website = safeWebsite(place?.website);
  const fallbackKey = `${name}:${latitude ?? ''}:${longitude ?? ''}:${index}`;

  return {
    key: externalId ? `${provider}:${externalId}` : fallbackKey,
    provider,
    name,
    formattedAddress,
    distanceMeters: distanceMeters !== null && distanceMeters >= 0 ? distanceMeters : null,
    website,
  };
}

/** @param {unknown} rows */
function normalizeBeaches(rows) {
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const beaches = [];
  rows.forEach((place, index) => {
    const beach = normalizeBeach(place, index);
    if (!beach || seen.has(beach.key)) return;
    seen.add(beach.key);
    beaches.push(beach);
  });

  return beaches.sort((left, right) => {
    if (left.distanceMeters === null && right.distanceMeters === null) return 0;
    if (left.distanceMeters === null) return 1;
    if (right.distanceMeters === null) return -1;
    return left.distanceMeters - right.distanceMeters;
  });
}

/**
 * Fetch beach data through the shared backend API client. Provider credentials never enter the browser.
 * @param {BeachDestination} destination
 * @param {string} locale
 * @returns {Promise<BeachState>}
 */
async function requestBeaches(destination, locale) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getNearbyPlaces({
        categoryGroup: PLACE_CATEGORY_GROUPS.BEACHES,
        latitude: destination.latitude,
        longitude: destination.longitude,
        radiusMeters: SEARCH_RADIUS_METERS,
        limit: SEARCH_LIMIT,
        language: locale,
      })
    );
    const places = response?.places ?? null;
    const beaches = normalizeBeaches(places?.results);
    return {
      status: beaches.length > 0 ? 'success' : 'empty',
      data: {
        provider: textValue(places?.provider, 40),
        fetchedAt: textValue(places?.fetchedAt, 80),
        beaches,
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

/** @param {string} template @param {string} destinationName */
function destinationText(template, destinationName) {
  return template.replace('{destination}', destinationName);
}

/**
 * @param {object} props
 * @param {BeachDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function BeachesPage({ destination, locale = 'en', messages }) {
  const copy = getBeachesPageCopy(locale);
  const [beachesState, setBeachesState] = useState(
    /** @type {BeachState} */ ({
      status: destination ? 'loading' : 'idle',
      data: null,
    }),
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );

  useEffect(() => {
    if (!destination) return;
    let active = true;

    void requestBeaches(destination, locale).then((nextState) => {
      if (active) setBeachesState(nextState);
    });

    return () => {
      active = false;
    };
  }, [destination, locale]);

  function retryBeaches() {
    if (!destination) return;
    setBeachesState({ status: 'loading', data: null });
    void requestBeaches(destination, locale).then(setBeachesState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="beaches-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <Waves size={34} aria-hidden="true" />
          <h1 id="beaches-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.unavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const beaches = beachesState.data?.beaches ?? [];
  const providerName = providerDisplayName(beachesState.data?.provider);
  const backHref = buildDestinationHref(destination);

  return (
    <section className={styles.page} aria-labelledby="beaches-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="beaches-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            <span>
              <Navigation size={15} aria-hidden="true" />
              {copy.searchArea}
            </span>
            {providerName ? <span>{providerName}</span> : null}
            {beachesState.status === 'success' ? (
              <span>
                <strong>{beaches.length}</strong> {copy.results}
              </span>
            ) : null}
          </div>
        </header>

        {beachesState.status === 'loading' || beachesState.status === 'idle' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={26} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {beachesState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <Waves size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.unavailable}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryBeaches}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {beachesState.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <MapPin size={28} aria-hidden="true" />
            <span>{copy.noResults}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryBeaches}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {beachesState.status === 'success' ? (
          <div className={styles.grid} aria-live="polite">
            {beaches.map((beach) => {
              const distance = formatDistance(numberFormatter, beach.distanceMeters);
              return (
                <article className={styles.card} key={beach.key}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      <Waves size={20} />
                    </span>
                    <h2>{beach.name}</h2>
                  </div>

                  {beach.formattedAddress ? (
                    <p className={styles.address}>
                      <MapPin size={16} aria-hidden="true" />
                      <span>{beach.formattedAddress}</span>
                    </p>
                  ) : null}

                  <div className={styles.cardFooter}>
                    {distance ? (
                      <span className={styles.distance} aria-label={`${copy.distance}: ${distance}`}>
                        <Navigation size={15} aria-hidden="true" />
                        {distance}
                      </span>
                    ) : (
                      <span />
                    )}
                    {beach.website ? (
                      <a
                        className={styles.websiteLink}
                        href={beach.website}
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
        ) : null}
      </div>
    </section>
  );
}
