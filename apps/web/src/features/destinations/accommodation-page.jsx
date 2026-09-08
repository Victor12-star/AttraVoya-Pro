'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  Images,
  Info,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCw,
  X,
} from 'lucide-react';
import { ACCOMMODATION_TYPES } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { getAccommodationPageCopy } from './accommodation-page-copy.js';
import { getAccommodationPhotoCopy } from './accommodation-photo-copy.js';
import styles from './accommodation-page.module.css';
import { buildDestinationHref } from './destination-route.js';

const SEARCH_RADIUS_METERS = 10_000;
const SEARCH_LIMIT = 24;
const MAX_PROPERTY_PHOTOS = 24;
const PHOTO_CATEGORIES = new Set(['EXTERIOR', 'ROOM', 'BED', 'BATHROOM', 'INTERIOR', 'OTHER']);
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
function safeHttpUrl(value) {
  const candidate = textValue(value, 2000);
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

/** @param {unknown} value */
function photoCategory(value) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  return PHOTO_CATEGORIES.has(normalized) ? normalized : 'OTHER';
}

/** @param {any} photo @param {number} index */
function normalizeAccommodationPhoto(photo, index) {
  const url = safeHttpUrl(photo?.url);
  if (!url) return null;

  return {
    key: textValue(photo?.id, 240) ?? `${url}:${index}`,
    url,
    thumbnailUrl: safeHttpUrl(photo?.thumbnailUrl) ?? url,
    category: photoCategory(photo?.category),
    alt: textValue(photo?.alt, 300),
    provider: textValue(photo?.provider, 80),
    attribution: textValue(photo?.attribution, 300),
  };
}

/** @param {unknown} rows */
function normalizeAccommodationPhotos(rows) {
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const photos = [];
  rows.slice(0, MAX_PROPERTY_PHOTOS * 2).forEach((photo, index) => {
    const normalized = normalizeAccommodationPhoto(photo, index);
    if (!normalized || seen.has(normalized.url)) return;
    seen.add(normalized.url);
    photos.push(normalized);
  });

  return photos.slice(0, MAX_PROPERTY_PHOTOS);
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
  const website = safeHttpUrl(place?.website);
  const accommodationType = textValue(place?.accommodationType, 60);
  const photos = normalizeAccommodationPhotos(place?.photos);
  const fallbackKey = `${name}:${latitude ?? ''}:${longitude ?? ''}:${index}`;

  return {
    key: externalId ? `${provider}:${externalId}` : fallbackKey,
    provider,
    name,
    formattedAddress,
    distanceMeters: distanceMeters !== null && distanceMeters >= 0 ? distanceMeters : null,
    website,
    accommodationType,
    photos,
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

/** @param {string} template @param {Record<string, string|number>} values */
function interpolate(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

/**
 * @param {object} props
 * @param {AccommodationDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function AccommodationPage({ destination, locale = 'en', messages }) {
  const copy = getAccommodationPageCopy(locale);
  const photoCopy = getAccommodationPhotoCopy(locale);
  const [selectedType, setSelectedType] = useState(/** @type {string|null} */ (null));
  const [galleryStay, setGalleryStay] = useState(/** @type {any|null} */ (null));
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const galleryCloseButtonRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
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

  useEffect(() => {
    if (!galleryStay) return undefined;

    galleryCloseButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setGalleryStay(null);
        setActivePhotoIndex(0);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [galleryStay]);

  /** @param {string|null} nextType */
  function chooseType(nextType) {
    if (nextType === selectedType) return;
    setGalleryStay(null);
    setActivePhotoIndex(0);
    setAccommodationState({ status: 'loading', data: null });
    setSelectedType(nextType);
  }

  function retryAccommodation() {
    if (!destination) return;
    setGalleryStay(null);
    setActivePhotoIndex(0);
    setAccommodationState({ status: 'loading', data: null });
    void requestAccommodation(destination, locale, selectedType).then(setAccommodationState);
  }

  /** @param {any} stay */
  function openGallery(stay) {
    if (!stay?.photos?.length) return;
    setGalleryStay(stay);
    setActivePhotoIndex(0);
  }

  function closeGallery() {
    setGalleryStay(null);
    setActivePhotoIndex(0);
  }

  function previousPhoto() {
    if (!galleryStay?.photos?.length) return;
    setActivePhotoIndex((current) => (current === 0 ? galleryStay.photos.length - 1 : current - 1));
  }

  function nextPhoto() {
    if (!galleryStay?.photos?.length) return;
    setActivePhotoIndex((current) => (current + 1) % galleryStay.photos.length);
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
  const activePhoto = galleryStay?.photos?.[activePhotoIndex] ?? null;

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
              const coverPhoto = stay.photos[0] ?? null;
              const coverAlt = coverPhoto
                ? (coverPhoto.alt ??
                  `${stay.name} — ${photoCopy.categories[coverPhoto.category] ?? photoCopy.categories.OTHER}`)
                : '';

              return (
                <article className={styles.card} key={stay.key}>
                  {coverPhoto ? (
                    <button
                      className={styles.photoPreview}
                      type="button"
                      onClick={() => openGallery(stay)}
                      aria-label={`${photoCopy.viewPhotos}: ${stay.name}`}
                    >
                      {/* Remote property-media domains are provider-controlled and cannot be statically allowlisted. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPhoto.url} alt={coverAlt} loading="lazy" decoding="async" />
                      <span className={styles.photoCount}>
                        <Images size={15} aria-hidden="true" />
                        {stay.photos.length}
                      </span>
                    </button>
                  ) : (
                    <div className={styles.photoUnavailable} role="note">
                      <ImageOff size={24} aria-hidden="true" />
                      <span>{photoCopy.noPhotos}</span>
                    </div>
                  )}

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

                  {stay.photos.length > 0 ? (
                    <button
                      className={styles.galleryButton}
                      type="button"
                      onClick={() => openGallery(stay)}
                    >
                      <Images size={16} aria-hidden="true" />
                      {photoCopy.viewPhotos}
                    </button>
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

      {galleryStay && activePhoto ? (
        <div className={styles.galleryBackdrop} role="presentation">
          <section
            className={styles.galleryDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="accommodation-gallery-title"
          >
            <header className={styles.galleryHeader}>
              <div>
                <span className="eyebrow">{photoCopy.viewPhotos}</span>
                <h2 id="accommodation-gallery-title">
                  {interpolate(photoCopy.galleryTitle, { property: galleryStay.name })}
                </h2>
              </div>
              <button
                ref={galleryCloseButtonRef}
                className={styles.iconButton}
                type="button"
                onClick={closeGallery}
                aria-label={photoCopy.close}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className={styles.galleryMain}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.url}
                alt={
                  activePhoto.alt ??
                  `${galleryStay.name} — ${photoCopy.categories[activePhoto.category] ?? photoCopy.categories.OTHER}`
                }
                decoding="async"
              />
              <div className={styles.galleryMeta}>
                <span className={styles.typeBadge}>
                  {photoCopy.categories[activePhoto.category] ?? photoCopy.categories.OTHER}
                </span>
                <span>
                  {interpolate(photoCopy.count, {
                    current: activePhotoIndex + 1,
                    total: galleryStay.photos.length,
                  })}
                </span>
                {activePhoto.provider || activePhoto.attribution ? (
                  <span>
                    {photoCopy.source}: {activePhoto.attribution ?? activePhoto.provider}
                  </span>
                ) : null}
              </div>
            </div>

            {galleryStay.photos.length > 1 ? (
              <div className={styles.galleryNavigation}>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={previousPhoto}
                  aria-label={photoCopy.previous}
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <div className={styles.thumbnailList}>
                  {galleryStay.photos.map((photo, index) => (
                    <button
                      className={`${styles.thumbnailButton} ${
                        index === activePhotoIndex ? styles.thumbnailButtonActive : ''
                      }`}
                      type="button"
                      key={photo.key}
                      onClick={() => setActivePhotoIndex(index)}
                      aria-label={`${photoCopy.categories[photo.category] ?? photoCopy.categories.OTHER}: ${index + 1}`}
                      aria-pressed={index === activePhotoIndex}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.thumbnailUrl} alt="" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={nextPhoto}
                  aria-label={photoCopy.next}
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
