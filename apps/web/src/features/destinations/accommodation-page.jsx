'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BedDouble,
  ExternalLink,
  Info,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { ACCOMMODATION_TYPES } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { getAccommodationPageCopy } from './accommodation-page-copy.js';
import styles from './accommodation-page.module.css';
import { buildDestinationHref } from './destination-route.js';

const SEARCH_RADIUS_METERS = 10_000;
const SEARCH_LIMIT = 24;
const FILTER_TYPES = Object.freeze([
  null,
  ACCOMMODATION_TYPES.HOTEL,
  ACCOMMODATION_TYPES.GUEST_HOUSE,
  ACCOMMODATION_TYPES.HOSTEL,
  ACCOMMODATION_TYPES.SHORT_TERM_RENTAL,
]);

/**
 * @typedef {object} AccommodationDestination
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

/** @typedef {{status: 'idle'|'loading'|'success'|'empty'|'error', data: any}} AccommodationState */

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
function normalizeAccommodationPlace(place, index) {
  const name = textValue(place?.name, 180);
  if (!name) return null;

  const provider = textValue(place?.provider, 40) ?? 'unknown';
  const externalId = textValue(place?.externalId, 240);
  const latitude = finiteNumber(place?.latitude);
  const longitude = finiteNumber(place?.longitude);
  const formattedAddress = textValue(place?.formattedAddress, 500);
  const distanceMeters = finiteNumber(place?.distanceMeters);
  const website = safeWebsite(place?.website);
  const accommodationType = textValue(place?.accommodationType, 60);
  const fallbackKey = `${name}:${latitude ?? ''}:${longitude ?? ''}:${index}`;

  return {
    key: externalId ? `${provider}:${externalId}` : fallbackKey,
    provider,
    name,
    formattedAddress,
    distanceMeters: distanceMeters !== null && distanceMeters >= 0 ? distanceMeters : null,
    website,
    accommodationType,
  };
}

/** @param {unknown} rows */
function normalizeAccommodationPlaces(rows) {
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const stays = [];
  rows.forEach((place, index) => {
    const stay = normalizeAccommodationPlace(place, index);
    if (!stay || seen.has(stay.key)) return;
    seen.add(stay.key);
    stays.push(stay);
  });

  return stays.sort((left, right) => {
    if (left.distanceMeters === null && right.distanceMeters === null) return 0;
    if (left.distanceMeters === null) return 1;
    if (right.distanceMeters === null) return -1;
    return left.distanceMeters - right.distanceMeters;
  });
}

/**
 * Fetch accommodation location data through the dedicated backend API.
 * Provider credentials and inventory assumptions never enter the browser.
 * @param {AccommodationDestination} destination
 * @param {string} locale
 * @param {string|null} accommodationType
 * @returns {Promise<AccommodationState>}
 */
async function requestAccommodation(destination, locale, accommodationType) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getNearbyAccommodation({
        latitude: destination.latitude,
        longitude: destination.longitude,
        radiusMeters: SEARCH_RADIUS_METERS,
        limit: SEARCH_LIMIT,
        language: locale,
        types: accommodationType ? [accommodationType] : [],
      })
    );
    const accommodation = response?.accommodation ?? null;
    const stays = normalizeAccommodationPlaces(accommodation?.results);
    return {
      status: stays.length > 0 ? 'success' : 'empty',
      data: {
        provider: textValue(accommodation?.provider, 40),
        fetchedAt: textValue(accommodation?.fetchedAt, 80),
        inventoryDataAvailable: accommodation?.inventoryDataAvailable === true,
        stays,
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
 * @param {AccommodationDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function AccommodationPage({ destination, locale = 'en', messages }) {
  const copy = getAccommodationPageCopy(locale);
  const [selectedType, setSelectedType] = useState(/** @type {string|null} */ (null));
  const [accommodationState, setAccommodationState] = useState(
    /** @type {AccommodationState} */ ({
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

    void requestAccommodation(destination, locale, selectedType).then((nextState) => {
      if (active) setAccommodationState(nextState);
    });

    return () => {
      active = false;
    };
  }, [destination, locale, selectedType]);

  function chooseType(nextType) {
    if (nextType === selectedType) return;
    setAccommodationState({ status: 'loading', data: null });
    setSelectedType(nextType);
  }

  function retryAccommodation() {
    if (!destination) return;
    setAccommodationState({ status: 'loading', data: null });
    void requestAccommodation(destination, locale, selectedType).then(setAccommodationState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="accommodation-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <BedDouble size={34} aria-hidden="true" />
          <h1 id="accommodation-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.unavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const stays = accommodationState.data?.stays ?? [];
  const providerName = providerDisplayName(accommodationState.data?.provider);
  const backHref = buildDestinationHref(destination);
  const inventoryDataAvailable = accommodationState.data?.inventoryDataAvailable === true;

  return (
    <section className={styles.page} aria-labelledby="accommodation-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="accommodation-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            <span>
              <Navigation size={15} aria-hidden="true" />
              {copy.searchArea}
            </span>
            {providerName ? <span>{providerName}</span> : null}
            {accommodationState.status === 'success' ? (
              <span>
                <strong>{stays.length}</strong> {copy.results}
              </span>
            ) : null}
          </div>
        </header>

        {!inventoryDataAvailable ? (
          <div className={styles.notice} role="note">
            <Info size={18} aria-hidden="true" />
            <span>{copy.dataNotice}</span>
          </div>
        ) : null}

        <div className={styles.filters}>
          <span className={styles.filterLabel}>{copy.filterLabel}</span>
          <div className={styles.filterList}>
            {FILTER_TYPES.map((type) => {
              const label = type ? copy.types[type] : copy.allTypes;
              return (
                <button
                  className={`${styles.filterButton} ${
                    selectedType === type ? styles.filterButtonActive : ''
                  }`}
                  type="button"
                  aria-pressed={selectedType === type}
                  key={type ?? 'all'}
                  onClick={() => chooseType(type)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {accommodationState.status === 'loading' || accommodationState.status === 'idle' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={26} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {accommodationState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <BedDouble size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.unavailable}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryAccommodation}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {accommodationState.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <MapPin size={28} aria-hidden="true" />
            <span>{copy.noResults}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryAccommodation}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {accommodationState.status === 'success' ? (
          <div className={styles.grid} aria-live="polite">
            {stays.map((stay) => {
              const distance = formatDistance(numberFormatter, stay.distanceMeters);
              const typeLabel = stay.accommodationType ? copy.types[stay.accommodationType] : null;
              return (
                <article className={styles.card} key={stay.key}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      <BedDouble size={20} />
                    </span>
                    <h2>{stay.name}</h2>
                  </div>

                  {typeLabel ? <span className={styles.typeBadge}>{typeLabel}</span> : null}

                  {stay.formattedAddress ? (
                    <p className={styles.address}>
                      <MapPin size={16} aria-hidden="true" />
                      <span>{stay.formattedAddress}</span>
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
                    {stay.website ? (
                      <a
                        className={styles.websiteLink}
                        href={stay.website}
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
