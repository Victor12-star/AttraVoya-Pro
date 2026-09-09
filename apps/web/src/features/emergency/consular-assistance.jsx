'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  FileWarning,
  LocateFixed,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PLACE_CATEGORY_GROUPS } from '@attravoya/constants';

import { apiClient } from '../../lib/api-client.js';
import { getConsularAssistanceCopy } from './consular-assistance-copy.js';
import styles from './consular-assistance.module.css';

const EMBASSY_RADIUS_METERS = 50_000;
const EMBASSY_RESULT_LIMIT = 16;
const MANUAL_RESULT_LIMIT = 6;

/**
 * @typedef {object} SearchLocation
 * @property {string} name
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * @typedef {SearchLocation & {
 *   key: string,
 *   formattedAddress: string|null,
 * }} LocationPlace
 */

/**
 * @typedef {object} DiplomaticPlace
 * @property {string} key
 * @property {string} provider
 * @property {string|null} sourcePlaceId
 * @property {string} name
 * @property {string|null} address
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {number|null} distanceMeters
 * @property {string[]} categories
 * @property {'provider-place-data'} trust
 */

/** @typedef {{status:string, results:LocationPlace[]}} ManualState */
/** @typedef {{status:string, results:DiplomaticPlace[]}} EmbassyState */

function textValue(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function coordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

/** @param {any} response @returns {LocationPlace[]} */
function normalizeLocationPlaces(response) {
  const rows = Array.isArray(response?.places?.results) ? response.places.results : [];
  const results = /** @type {LocationPlace[]} */ ([]);

  rows.forEach((place, index) => {
    const latitude = coordinate(place?.latitude, -90, 90);
    const longitude = coordinate(place?.longitude, -180, 180);
    const name = textValue(place?.name, 180);
    if (latitude === null || longitude === null || !name) return;

    const formattedAddress = textValue(place?.formattedAddress, 500);
    const externalId = textValue(place?.externalId, 240);
    results.push({
      key: externalId ?? `${name}:${latitude}:${longitude}:${index}`,
      name,
      formattedAddress,
      latitude,
      longitude,
    });
  });

  return results;
}

/** @param {any} response @returns {DiplomaticPlace[]} */
export function normalizeDiplomaticPlaces(response) {
  const rows = Array.isArray(response?.places?.results) ? response.places.results : [];
  const seen = new Set();
  const results = /** @type {DiplomaticPlace[]} */ ([]);

  rows.forEach((place, index) => {
    const name = textValue(place?.name, 180);
    if (!name) return;

    const provider = textValue(place?.provider, 40)?.toLowerCase() ?? 'unknown';
    const sourcePlaceId = textValue(place?.externalId, 240);
    const latitude = coordinate(place?.latitude, -90, 90);
    const longitude = coordinate(place?.longitude, -180, 180);
    const address = textValue(place?.formattedAddress, 500);
    const distance = Number(place?.distanceMeters);
    const distanceMeters = Number.isFinite(distance) && distance >= 0 ? distance : null;
    const categories = /** @type {string[]} */ ([]);
    if (Array.isArray(place?.categories)) {
      place.categories.forEach((value) => {
        const category = textValue(value, 120);
        if (category) categories.push(category);
      });
    }
    const key = sourcePlaceId
      ? `${provider}:${sourcePlaceId}`
      : `${name}:${latitude ?? ''}:${longitude ?? ''}:${index}`;
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      key,
      provider,
      sourcePlaceId,
      name,
      address,
      latitude,
      longitude,
      distanceMeters,
      categories,
      trust: 'provider-place-data',
    });
  });

  return results.sort((left, right) => {
    if (left.distanceMeters === null && right.distanceMeters === null) return 0;
    if (left.distanceMeters === null) return 1;
    if (right.distanceMeters === null) return -1;
    return left.distanceMeters - right.distanceMeters;
  });
}

/** @param {DiplomaticPlace} place */
function navigationUrl(place) {
  if (place.latitude === null || place.longitude === null) return null;
  const query = encodeURIComponent(`${place.latitude},${place.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** @param {Intl.NumberFormat} formatter @param {number|null} meters */
function formatDistance(formatter, meters) {
  if (meters === null) return null;
  if (meters < 1000) return `${formatter.format(Math.round(meters))} m`;
  return `${formatter.format(meters / 1000)} km`;
}

/**
 * Geoapify is used only to discover diplomatic facilities. The component
 * deliberately drops provider phone, website and opening-hours fields so
 * place data can never be mistaken for verified consular instructions.
 *
 * @param {object} props
 * @param {string} [props.locale]
 * @param {Array<{iso2:string, name:string}>} [props.countries]
 */
export function ConsularAssistance({ locale = 'en', countries = [] }) {
  const copy = getConsularAssistanceCopy(locale);
  const embassySectionRef = useRef(/** @type {HTMLElement|null} */ (null));
  const embassyRequestRef = useRef(0);
  const manualRequestRef = useRef(0);
  const [passportCountryCode, setPassportCountryCode] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [manualState, setManualState] = useState(
    /** @type {ManualState} */ ({ status: 'idle', results: [] }),
  );
  const [locationMessage, setLocationMessage] = useState('');
  const [embassyState, setEmbassyState] = useState(
    /** @type {EmbassyState} */ ({ status: 'idle', results: [] }),
  );
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );

  /** @param {SearchLocation} location */
  async function loadEmbassies(location) {
    embassyRequestRef.current += 1;
    const requestId = embassyRequestRef.current;
    setLocationMessage(location.name);
    setEmbassyState({ status: 'loading', results: [] });

    try {
      const response = await apiClient.getNearbyPlaces({
        categoryGroup: PLACE_CATEGORY_GROUPS.EMBASSIES,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: EMBASSY_RADIUS_METERS,
        limit: EMBASSY_RESULT_LIMIT,
        language: locale,
      });
      if (requestId !== embassyRequestRef.current) return;
      const results = normalizeDiplomaticPlaces(response);
      setEmbassyState({ status: results.length ? 'success' : 'empty', results });
    } catch {
      if (requestId === embassyRequestRef.current) {
        setEmbassyState({ status: 'error', results: [] });
      }
    }
  }

  function useCurrentLocation() {
    setManualState({ status: 'idle', results: [] });
    if (!globalThis.navigator?.geolocation) {
      setLocationMessage(copy.permissionDenied);
      return;
    }

    setLocationMessage('');
    setEmbassyState({ status: 'locating', results: [] });
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = coordinate(position?.coords?.latitude, -90, 90);
        const longitude = coordinate(position?.coords?.longitude, -180, 180);
        if (latitude === null || longitude === null) {
          setEmbassyState({ status: 'idle', results: [] });
          setLocationMessage(copy.permissionDenied);
          return;
        }
        void loadEmbassies({ name: copy.useLocation, latitude, longitude });
      },
      () => {
        setEmbassyState({ status: 'idle', results: [] });
        setLocationMessage(copy.permissionDenied);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  /** @param {SubmitEvent|{preventDefault:()=>void}} event */
  async function searchManualLocation(event) {
    event.preventDefault();
    const query = manualQuery.trim();
    if (query.length < 2) return;

    manualRequestRef.current += 1;
    const requestId = manualRequestRef.current;
    setManualState({ status: 'loading', results: [] });
    setLocationMessage('');

    try {
      const response = await apiClient.autocompletePlaces({
        query,
        limit: MANUAL_RESULT_LIMIT,
        language: locale,
      });
      if (requestId !== manualRequestRef.current) return;
      const results = normalizeLocationPlaces(response);
      setManualState({ status: results.length ? 'success' : 'empty', results });
    } catch {
      if (requestId === manualRequestRef.current) {
        setManualState({ status: 'error', results: [] });
      }
    }
  }

  /** @param {LocationPlace} location */
  function selectManualLocation(location) {
    manualRequestRef.current += 1;
    setManualState({ status: 'idle', results: [] });
    void loadEmbassies(location);
  }

  function focusEmbassyHelp() {
    embassySectionRef.current?.focus();
    embassySectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className={styles.wrapper}>
      <section
        ref={embassySectionRef}
        className={styles.panel}
        aria-labelledby="consular-help-title"
        tabIndex={-1}
      >
        <header className={styles.heading}>
          <span className={styles.headingIcon} aria-hidden="true">
            <ShieldCheck size={24} />
          </span>
          <div>
            <h3 id="consular-help-title">{copy.title}</h3>
            <p>{copy.intro}</p>
          </div>
        </header>

        <label className={styles.field}>
          <span>{copy.passportCountry}</span>
          <select
            value={passportCountryCode}
            onChange={(event) => setPassportCountryCode(event.target.value)}
          >
            <option value="">{copy.passportCountry}</option>
            {countries.map((country) => (
              <option key={country.iso2} value={country.iso2}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.hint}>{copy.passportHint}</p>

        <div className={styles.discovery}>
          <h4>{copy.nearbyTitle}</h4>
          <p className={styles.privacy}>{copy.locationPrivacy}</p>
          <button className="button button--accent" type="button" onClick={useCurrentLocation}>
            <LocateFixed size={18} aria-hidden="true" />
            {copy.useLocation}
          </button>

          <form className={styles.manualForm} onSubmit={searchManualLocation}>
            <label className={styles.field}>
              <span>{copy.manualLabel}</span>
              <input
                type="search"
                value={manualQuery}
                onChange={(event) => setManualQuery(event.target.value)}
                placeholder={copy.manualPlaceholder}
                autoComplete="off"
              />
            </label>
            <button
              className="button button--secondary"
              type="submit"
              disabled={manualQuery.trim().length < 2 || manualState.status === 'loading'}
            >
              <Search size={17} aria-hidden="true" />
              {copy.searchPlace}
            </button>
          </form>

          {manualState.status === 'loading' ? (
            <div className={styles.feedback} role="status" aria-live="polite">
              <LoaderCircle className={styles.spin} size={20} aria-hidden="true" />
              <span>{copy.searchPlace}</span>
            </div>
          ) : null}

          {manualState.status === 'success' ? (
            <div className={styles.placeChoices} aria-live="polite">
              {manualState.results.map((place) => (
                <button
                  className={styles.placeChoice}
                  type="button"
                  key={place.key}
                  onClick={() => selectManualLocation(place)}
                >
                  <MapPin size={17} aria-hidden="true" />
                  <span>
                    <strong>{place.name}</strong>
                    {place.formattedAddress ? <small>{place.formattedAddress}</small> : null}
                  </span>
                  <span className={styles.srOnly}>{copy.choosePlace}</span>
                </button>
              ))}
            </div>
          ) : null}

          {manualState.status === 'empty' || manualState.status === 'error' ? (
            <div className={styles.feedback} role={manualState.status === 'error' ? 'alert' : 'status'}>
              <MapPin size={20} aria-hidden="true" />
              <span>{manualState.status === 'error' ? copy.error : copy.empty}</span>
            </div>
          ) : null}

          {locationMessage ? <p className={styles.locationMessage}>{locationMessage}</p> : null}
        </div>

        <aside className={styles.sourceNotice}>
          <ShieldCheck size={19} aria-hidden="true" />
          <p>{copy.sourceNotice}</p>
        </aside>

        {embassyState.status === 'locating' || embassyState.status === 'loading' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={21} aria-hidden="true" />
            <span>{copy.nearbyTitle}</span>
          </div>
        ) : null}

        {embassyState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <MapPin size={20} aria-hidden="true" />
            <span>{copy.error}</span>
          </div>
        ) : null}

        {embassyState.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <MapPin size={20} aria-hidden="true" />
            <span>{copy.empty}</span>
          </div>
        ) : null}

        {embassyState.status === 'success' ? (
          <div className={styles.results} aria-live="polite">
            {embassyState.results.map((place) => {
              const distance = formatDistance(formatter, place.distanceMeters);
              const directions = navigationUrl(place);
              return (
                <article className={styles.resultCard} key={place.key}>
                  <div>
                    <h4>{place.name}</h4>
                    {place.address ? <p>{place.address}</p> : null}
                  </div>
                  <div className={styles.resultMeta}>
                    {distance ? (
                      <span>
                        <Navigation size={15} aria-hidden="true" />
                        {copy.distance}: {distance}
                      </span>
                    ) : null}
                    <span>Geoapify</span>
                  </div>
                  {directions ? (
                    <a
                      className="button button--secondary button--compact"
                      href={directions}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                      {copy.navigation}
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className={styles.passportPanel} aria-labelledby="lost-passport-title">
        <header className={styles.heading}>
          <span className={styles.headingIcon} aria-hidden="true">
            <FileWarning size={24} />
          </span>
          <div>
            <h3 id="lost-passport-title">{copy.lostTitle}</h3>
            <p>{copy.lostIntro}</p>
          </div>
        </header>
        <ol className={styles.steps}>
          {copy.lostSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className={styles.warning}>{copy.lostDisclaimer}</p>
        <button className="button button--accent" type="button" onClick={focusEmbassyHelp}>
          <MapPin size={18} aria-hidden="true" />
          {copy.findEmbassy}
        </button>
      </section>
    </div>
  );
}
