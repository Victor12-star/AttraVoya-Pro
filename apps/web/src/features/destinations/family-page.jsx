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
  Users,
} from 'lucide-react';
import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { buildDestinationHref } from './destination-route.js';
import { getFamilyPageCopy } from './family-page-copy.js';
import styles from './family-page.module.css';

const SEARCH_RADIUS_METERS = 10_000;
const SEARCH_LIMIT = 12;
const AGE_BANDS = Object.freeze(['0–3', '4–8', '9–12', '13–17']);
const FAMILY_CATEGORIES = Object.freeze([
  { id: 'playgrounds', categoryGroup: PLACE_CATEGORY_GROUPS.PLAYGROUNDS },
  { id: 'parks', categoryGroup: PLACE_CATEGORY_GROUPS.PARKS },
  { id: 'attractions', categoryGroup: PLACE_CATEGORY_GROUPS.ATTRACTIONS },
]);

/**
 * @typedef {object} FamilyDestination
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

/** @typedef {{status: 'idle'|'loading'|'success'|'empty'|'error', data: any}} FamilyState */

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
function normalizeFamilyPlace(place, index) {
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
function normalizeFamilyPlaces(rows) {
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const places = [];
  rows.forEach((place, index) => {
    const normalized = normalizeFamilyPlace(place, index);
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

/**
 * @param {FamilyDestination} destination
 * @param {string} locale
 * @returns {Promise<FamilyState>}
 */
async function requestFamilyPlaces(destination, locale) {
  const sections = await Promise.all(
    FAMILY_CATEGORIES.map(async ({ id, categoryGroup }) => {
      try {
        const response = /** @type {any} */ (
          await apiClient.getNearbyPlaces({
            categoryGroup,
            latitude: destination.latitude,
            longitude: destination.longitude,
            radiusMeters: SEARCH_RADIUS_METERS,
            limit: SEARCH_LIMIT,
            language: locale,
          })
        );
        const places = response?.places ?? null;
        const results = normalizeFamilyPlaces(places?.results);
        return {
          id,
          status: results.length > 0 ? 'success' : 'empty',
          provider: textValue(places?.provider, 40),
          results,
        };
      } catch {
        return { id, status: 'error', provider: null, results: [] };
      }
    }),
  );

  const resultCount = sections.reduce((total, section) => total + section.results.length, 0);
  const allFailed = sections.every((section) => section.status === 'error');
  const provider = sections.find((section) => section.provider)?.provider ?? null;

  return {
    status: allFailed ? 'error' : resultCount > 0 ? 'success' : 'empty',
    data: { sections, resultCount, provider },
  };
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
 * @param {FamilyDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function FamilyDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getFamilyPageCopy(locale);
  const [familyState, setFamilyState] = useState(
    /** @type {FamilyState} */ ({
      status: destination ? 'loading' : 'idle',
      data: null,
    }),
  );
  const [selectedAgeBands, setSelectedAgeBands] = useState(/** @type {string[]} */ ([]));
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );

  useEffect(() => {
    if (!destination) return;
    let active = true;

    void requestFamilyPlaces(destination, locale).then((nextState) => {
      if (active) setFamilyState(nextState);
    });

    return () => {
      active = false;
    };
  }, [destination, locale]);

  function retryFamilyPlaces() {
    if (!destination) return;
    setFamilyState({ status: 'loading', data: null });
    void requestFamilyPlaces(destination, locale).then(setFamilyState);
  }

  /** @param {string} ageBand */
  function toggleAgeBand(ageBand) {
    setSelectedAgeBands((current) =>
      current.includes(ageBand)
        ? current.filter((candidate) => candidate !== ageBand)
        : AGE_BANDS.filter((candidate) => candidate === ageBand || current.includes(candidate)),
    );
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="family-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <Users size={34} aria-hidden="true" />
          <h1 id="family-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.unavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const sections = familyState.data?.sections ?? [];
  const resultCount = familyState.data?.resultCount ?? 0;
  const providerName = providerDisplayName(familyState.data?.provider);
  const backHref = buildDestinationHref(destination);

  return (
    <section className={styles.page} aria-labelledby="family-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="family-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            <span>
              <Navigation size={15} aria-hidden="true" />
              {copy.searchArea}
            </span>
            {providerName ? <span>{providerName}</span> : null}
            {familyState.status === 'success' ? (
              <span>
                <strong>{resultCount}</strong> {copy.results}
              </span>
            ) : null}
          </div>
        </header>

        <section className={styles.planner} aria-labelledby="family-age-title">
          <div>
            <h2 id="family-age-title">{copy.agePrompt}</h2>
            <p>{copy.ageNotice}</p>
          </div>
          <div className={styles.ageButtons}>
            {AGE_BANDS.map((ageBand) => {
              const selected = selectedAgeBands.includes(ageBand);
              return (
                <button
                  className={styles.ageButton}
                  type="button"
                  key={ageBand}
                  aria-pressed={selected}
                  onClick={() => toggleAgeBand(ageBand)}
                >
                  {ageBand}
                </button>
              );
            })}
          </div>
        </section>

        {familyState.status === 'loading' || familyState.status === 'idle' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={26} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {familyState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <Users size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.unavailable}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryFamilyPlaces}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {familyState.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <MapPin size={28} aria-hidden="true" />
            <span>{copy.noResults}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryFamilyPlaces}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {familyState.status === 'success' ? (
          <div className={styles.sections} aria-live="polite">
            {sections.map((section) => (
              <section className={styles.categorySection} key={section.id}>
                <div className={styles.categoryHeader}>
                  <div>
                    <span className="eyebrow">{copy.categories[section.id]}</span>
                    <h2>{copy.categories[section.id]}</h2>
                  </div>
                  {section.status === 'success' ? <strong>{section.results.length}</strong> : null}
                </div>

                {section.status === 'error' ? (
                  <p className={styles.sectionMessage}>{copy.sectionUnavailable}</p>
                ) : null}
                {section.status === 'empty' ? (
                  <p className={styles.sectionMessage}>{copy.noResults}</p>
                ) : null}
                {section.status === 'success' ? (
                  <div className={styles.grid}>
                    {section.results.map((place) => {
                      const distance = formatDistance(numberFormatter, place.distanceMeters);
                      return (
                        <article className={styles.card} key={`${section.id}:${place.key}`}>
                          <div className={styles.cardHeading}>
                            <span className={styles.cardIcon} aria-hidden="true">
                              <MapPin size={19} />
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
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
