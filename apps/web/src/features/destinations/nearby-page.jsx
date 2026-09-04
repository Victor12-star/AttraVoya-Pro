'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, LoaderCircle, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { buildDestinationHref } from './destination-route.js';
import { getNearbyPageCopy } from './nearby-page-copy.js';
import styles from './nearby-page.module.css';

const SEARCH_RADIUS_METERS = 3_000;
const SEARCH_LIMIT = 16;
const NEARBY_CATEGORIES = Object.freeze([
  { id: 'cafes', categoryGroup: PLACE_CATEGORY_GROUPS.CAFES },
  { id: 'supermarkets', categoryGroup: PLACE_CATEGORY_GROUPS.SUPERMARKETS },
  { id: 'pharmacies', categoryGroup: PLACE_CATEGORY_GROUPS.PHARMACIES },
  { id: 'atms', categoryGroup: PLACE_CATEGORY_GROUPS.ATMS },
  { id: 'parking', categoryGroup: PLACE_CATEGORY_GROUPS.PARKING },
]);

/**
 * @typedef {object} NearbyDestination
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

/** @typedef {{status: 'idle'|'loading'|'success'|'empty'|'error', data: any}} NearbyState */

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
function normalizeNearbyPlace(place, index) {
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
function normalizeNearbyPlaces(rows) {
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const places = [];
  rows.forEach((place, index) => {
    const normalized = normalizeNearbyPlace(place, index);
    if (!normalized || seen.has(normalized.key)) return;
    seen.add(normalized.key);
    places.push(normalized);
  });

  return places.sort((left, right) => {
    if (left.distanceMeters === null && right.distanceMeters === null) return 0;
    if (left.distanceMeters === null) return 1;
    if (right.distanceMeters === null) return -1;
    return left.distanceMeters - right.distanceMeters;
  });
}

/** @param {string} selectedCategory */
function categoryGroupFor(selectedCategory) {
  return (
    NEARBY_CATEGORIES.find((category) => category.id === selectedCategory)?.categoryGroup ??
    PLACE_CATEGORY_GROUPS.CAFES
  );
}

/**
 * @param {NearbyDestination} destination
 * @param {string} locale
 * @param {string} selectedCategory
 * @returns {Promise<NearbyState>}
 */
async function requestNearbyPlaces(destination, locale, selectedCategory) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getNearbyPlaces({
        categoryGroup: categoryGroupFor(selectedCategory),
        latitude: destination.latitude,
        longitude: destination.longitude,
        radiusMeters: SEARCH_RADIUS_METERS,
        limit: SEARCH_LIMIT,
        language: locale,
      })
    );
    const places = response?.places ?? null;
    const results = normalizeNearbyPlaces(places?.results);

    return {
      status: results.length > 0 ? 'success' : 'empty',
      data: {
        provider: textValue(places?.provider, 40),
        results,
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
 * @param {NearbyDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function NearbyDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getNearbyPageCopy(locale);
  const [selectedCategory, setSelectedCategory] = useState('cafes');
  const [nearbyState, setNearbyState] = useState(
    /** @type {NearbyState} */ ({
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

    void requestNearbyPlaces(destination, locale, selectedCategory).then((nextState) => {
      if (active) setNearbyState(nextState);
    });

    return () => {
      active = false;
    };
  }, [destination, locale, selectedCategory]);

  /** @param {string} categoryId */
  function selectCategory(categoryId) {
    if (categoryId === selectedCategory) return;
    setNearbyState({ status: 'loading', data: null });
    setSelectedCategory(categoryId);
  }

  function retryNearbyPlaces() {
    if (!destination) return;
    setNearbyState({ status: 'loading', data: null });
    void requestNearbyPlaces(destination, locale, selectedCategory).then(setNearbyState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="nearby-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <MapPin size={34} aria-hidden="true" />
          <h1 id="nearby-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.unavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const providerName = providerDisplayName(nearbyState.data?.provider);
  const results = nearbyState.data?.results ?? [];
  const backHref = buildDestinationHref(destination);

  return (
    <section className={styles.page} aria-labelledby="nearby-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="nearby-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            <span>
              <Navigation size={15} aria-hidden="true" />
              {copy.searchArea}
            </span>
            {providerName ? <span>{providerName}</span> : null}
            {nearbyState.status === 'success' ? (
              <span>
                <strong>{results.length}</strong> {copy.results}
              </span>
            ) : null}
          </div>
        </header>

        <section className={styles.filters} aria-labelledby="nearby-category-title">
          <h2 id="nearby-category-title">{copy.categoryLabel}</h2>
          <div className={styles.filterButtons}>
            {NEARBY_CATEGORIES.map((category) => {
              const selected = selectedCategory === category.id;
              return (
                <button
                  className={styles.filterButton}
                  type="button"
                  key={category.id}
                  aria-pressed={selected}
                  onClick={() => selectCategory(category.id)}
                >
                  {copy.categories[category.id]}
                </button>
              );
            })}
          </div>
        </section>

        {nearbyState.status === 'loading' || nearbyState.status === 'idle' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={26} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {nearbyState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <MapPin size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.unavailable}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryNearbyPlaces}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {nearbyState.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <MapPin size={28} aria-hidden="true" />
            <span>{copy.noResults}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryNearbyPlaces}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {nearbyState.status === 'success' ? (
          <div className={styles.grid} aria-live="polite">
            {results.map((place) => {
              const distance = formatDistance(numberFormatter, place.distanceMeters);
              return (
                <article className={styles.card} key={place.key}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      <MapPin size={19} />
                    </span>
                    <h2>{place.name}</h2>
                  </div>

                  {place.formattedAddress ? (
                    <p className={styles.address}>
                      <MapPin size={16} aria-hidden="true" />
                      <span>{place.formattedAddress}</span>
                    </p>
                  ) : null}

                  <div className={styles.cardFooter}>
                    {distance ? (
                      <span
                        className={styles.distance}
                        aria-label={`${copy.distance}: ${distance}`}
                      >
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
        ) : null}
      </div>
    </section>
  );
}
