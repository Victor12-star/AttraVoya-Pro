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
  Utensils,
} from 'lucide-react';
import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { buildDestinationHref } from './destination-route.js';
import { getRestaurantsPageCopy } from './restaurants-page-copy.js';
import styles from './restaurants-page.module.css';

const SEARCH_RADIUS_METERS = 5_000;
const SEARCH_LIMIT = 24;

/**
 * @typedef {object} RestaurantDestination
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

/** @typedef {{status: 'idle'|'loading'|'success'|'empty'|'error', data: any}} RestaurantState */

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
function normalizeRestaurant(place, index) {
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
function normalizeRestaurants(rows) {
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const restaurants = [];
  rows.forEach((place, index) => {
    const restaurant = normalizeRestaurant(place, index);
    if (!restaurant || seen.has(restaurant.key)) return;
    seen.add(restaurant.key);
    restaurants.push(restaurant);
  });

  return restaurants.sort((left, right) => {
    if (left.distanceMeters === null && right.distanceMeters === null) return 0;
    if (left.distanceMeters === null) return 1;
    if (right.distanceMeters === null) return -1;
    return left.distanceMeters - right.distanceMeters;
  });
}

/**
 * Fetch restaurant data through the shared backend API client. Provider credentials never enter the browser.
 * @param {RestaurantDestination} destination
 * @param {string} locale
 * @returns {Promise<RestaurantState>}
 */
async function requestRestaurants(destination, locale) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getNearbyPlaces({
        categoryGroup: PLACE_CATEGORY_GROUPS.RESTAURANTS,
        latitude: destination.latitude,
        longitude: destination.longitude,
        radiusMeters: SEARCH_RADIUS_METERS,
        limit: SEARCH_LIMIT,
        language: locale,
      })
    );
    const places = response?.places ?? null;
    const restaurants = normalizeRestaurants(places?.results);
    return {
      status: restaurants.length > 0 ? 'success' : 'empty',
      data: {
        provider: textValue(places?.provider, 40),
        fetchedAt: textValue(places?.fetchedAt, 80),
        restaurants,
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
 * @param {RestaurantDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function RestaurantsPage({ destination, locale = 'en', messages }) {
  const copy = getRestaurantsPageCopy(locale);
  const [restaurantsState, setRestaurantsState] = useState(
    /** @type {RestaurantState} */ ({
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

    void requestRestaurants(destination, locale).then((nextState) => {
      if (active) setRestaurantsState(nextState);
    });

    return () => {
      active = false;
    };
  }, [destination, locale]);

  function retryRestaurants() {
    if (!destination) return;
    setRestaurantsState({ status: 'loading', data: null });
    void requestRestaurants(destination, locale).then(setRestaurantsState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="restaurants-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <Utensils size={34} aria-hidden="true" />
          <h1 id="restaurants-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.unavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const restaurants = restaurantsState.data?.restaurants ?? [];
  const providerName = providerDisplayName(restaurantsState.data?.provider);
  const backHref = buildDestinationHref(destination);

  return (
    <section className={styles.page} aria-labelledby="restaurants-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="restaurants-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            <span>
              <Navigation size={15} aria-hidden="true" />
              {copy.searchArea}
            </span>
            {providerName ? <span>{providerName}</span> : null}
            {restaurantsState.status === 'success' ? (
              <span>
                <strong>{restaurants.length}</strong> {copy.results}
              </span>
            ) : null}
          </div>
        </header>

        {restaurantsState.status === 'loading' || restaurantsState.status === 'idle' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={26} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {restaurantsState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <Utensils size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.unavailable}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryRestaurants}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {restaurantsState.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <MapPin size={28} aria-hidden="true" />
            <span>{copy.noResults}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryRestaurants}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {restaurantsState.status === 'success' ? (
          <div className={styles.grid} aria-live="polite">
            {restaurants.map((restaurant) => {
              const distance = formatDistance(numberFormatter, restaurant.distanceMeters);
              return (
                <article className={styles.card} key={restaurant.key}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      <Utensils size={20} />
                    </span>
                    <h2>{restaurant.name}</h2>
                  </div>

                  {restaurant.formattedAddress ? (
                    <p className={styles.address}>
                      <MapPin size={16} aria-hidden="true" />
                      <span>{restaurant.formattedAddress}</span>
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
                    {restaurant.website ? (
                      <a
                        className={styles.websiteLink}
                        href={restaurant.website}
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
