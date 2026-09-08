'use client';

import { useEffect, useRef, useState } from 'react';
import { CarFront, LoaderCircle, MapPin, Maximize2, Search, X } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { SafeRideRouteWatch } from '../safety/safe-ride-route-watch.jsx';
import { getTaxiDriverCardCopy } from './taxi-driver-card-copy.js';
import styles from './taxi-driver-card.module.css';

function textValue(value, maxLength = 3000) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function languageCode(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replaceAll('_', '-').toLowerCase();
  return normalized.length <= 10 && /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(normalized)
    ? normalized
    : null;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function browserWindow() {
  if (typeof window === 'undefined') return null;
  return /** @type {any} */ (window);
}

/**
 * @param {unknown} row
 * @param {string} countryCode
 */
function normalizePlace(row, countryCode) {
  const value = /** @type {any} */ (row);
  const name = textValue(value?.name, 200);
  const formattedAddress = textValue(value?.formattedAddress, 500);
  const rowCountryCode = textValue(value?.countryCode, 2)?.toUpperCase();
  const latitude = finiteNumber(value?.latitude);
  const longitude = finiteNumber(value?.longitude);

  if (
    !name ||
    rowCountryCode !== countryCode ||
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    externalId: textValue(value?.externalId, 300),
    name,
    formattedAddress,
    latitude,
    longitude,
  };
}

/** @param {{name:string, formattedAddress:string|null}} place */
function buildDriverInstruction(place) {
  const destination = `Please take me to ${place.name}.`;
  return place.formattedAddress
    ? `${destination} The address is ${place.formattedAddress}.`
    : destination;
}

/**
 * @param {any} response
 * @param {string} expectedTarget
 */
function normalizeTranslation(response, expectedTarget) {
  const translation = response?.translation;
  const source = languageCode(translation?.source);
  const target = languageCode(translation?.target);
  const translatedText = textValue(translation?.translatedText, 12_000);
  const provider = textValue(translation?.provider, 80);
  if (source !== 'en' || target !== expectedTarget || !translatedText || !provider) return null;
  return { translatedText, provider };
}

/**
 * @param {object} props
 * @param {string} props.countryCode
 * @param {string} props.targetLanguage
 * @param {string} props.targetLanguageName
 * @param {'ltr'|'rtl'} [props.targetDirection]
 * @param {string} [props.locale]
 * @param {string} [props.googleMapsBrowserKey]
 * @param {boolean} [props.safeRideGoogleEnabled]
 */
export function TaxiDriverCard({
  countryCode,
  targetLanguage,
  targetLanguageName,
  targetDirection = 'ltr',
  locale = 'en',
  googleMapsBrowserKey = '',
  safeRideGoogleEnabled = false,
}) {
  const copy = getTaxiDriverCardCopy(locale);
  const closeRef = useRef(/** @type {any} */ (null));
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState(
    /** @type {{status:string, places:any[]}} */ ({ status: 'idle', places: [] }),
  );
  const [selectedPlace, setSelectedPlace] = useState(/** @type {any} */ (null));
  const [cardState, setCardState] = useState(/** @type {any} */ ({ status: 'idle', data: null }));
  const [cardOpen, setCardOpen] = useState(false);

  useEffect(() => {
    if (!cardOpen) return undefined;
    const currentWindow = browserWindow();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setCardOpen(false);
    };
    currentWindow?.addEventListener?.('keydown', handleKeyDown);
    const focusTimer = currentWindow?.setTimeout?.(() => closeRef.current?.focus(), 0);
    return () => {
      currentWindow?.removeEventListener?.('keydown', handleKeyDown);
      if (focusTimer !== undefined) currentWindow?.clearTimeout?.(focusTimer);
    };
  }, [cardOpen]);

  async function runSearch() {
    const normalizedQuery = query.trim();
    setSelectedPlace(null);
    setCardState({ status: 'idle', data: null });
    setCardOpen(false);

    if (normalizedQuery.length < 2) {
      setSearchState({ status: 'invalid', places: [] });
      return;
    }

    setSearchState({ status: 'loading', places: [] });
    try {
      const response = /** @type {any} */ (
        await apiClient.autocompletePlaces({
          query: normalizedQuery,
          limit: 6,
          language: locale,
          countryCode,
        })
      );
      const rows = Array.isArray(response?.places?.results) ? response.places.results : [];
      const seen = new Set();
      const places = rows
        .map((row) => normalizePlace(row, countryCode))
        .filter((place) => place !== null)
        .filter((place) => {
          const key =
            place.externalId ??
            `${place.name}:${place.latitude.toFixed(6)}:${place.longitude.toFixed(6)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      setSearchState({ status: places.length ? 'success' : 'empty', places });
    } catch {
      setSearchState({ status: 'error', places: [] });
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    void runSearch();
  }

  function selectPlace(place) {
    setSelectedPlace(place);
    setCardState({ status: 'idle', data: null });
    setCardOpen(false);
  }

  async function createCard() {
    if (!selectedPlace) return;
    const instruction = buildDriverInstruction(selectedPlace);
    const target = languageCode(targetLanguage);
    if (!target) {
      setCardState({ status: 'error', data: null });
      return;
    }

    setCardState({ status: 'loading', data: null });
    if (target === 'en') {
      setCardState({
        status: 'success',
        data: { instruction, translatedText: instruction, provider: null },
      });
      setCardOpen(true);
      return;
    }

    try {
      const response = await apiClient.translateText({
        text: instruction,
        source: 'en',
        target,
      });
      const translation = normalizeTranslation(response, target);
      if (!translation) {
        setCardState({ status: 'error', data: null });
        return;
      }
      setCardState({
        status: 'success',
        data: {
          instruction,
          translatedText: translation.translatedText,
          provider: translation.provider,
        },
      });
      setCardOpen(true);
    } catch {
      setCardState({ status: 'error', data: null });
    }
  }

  const safeRideConfigured =
    safeRideGoogleEnabled === true &&
    Boolean(googleMapsBrowserKey.trim()) &&
    Boolean(selectedPlace);

  return (
    <section className={styles.card} aria-labelledby="taxi-driver-card-title">
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <CarFront size={24} />
        </span>
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2 id="taxi-driver-card-title">{copy.title}</h2>
          <p>{copy.intro}</p>
        </div>
      </header>

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <label htmlFor="taxi-driver-destination">{copy.searchLabel}</label>
        <div className={styles.searchRow}>
          <input
            id="taxi-driver-destination"
            type="search"
            value={query}
            maxLength={200}
            autoComplete="off"
            placeholder={copy.searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="button button--secondary" type="submit">
            {searchState.status === 'loading' ? (
              <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
            ) : (
              <Search size={17} aria-hidden="true" />
            )}
            {copy.search}
          </button>
        </div>
      </form>

      <div className={styles.status} aria-live="polite">
        {searchState.status === 'invalid' ? <span>{copy.searchHint}</span> : null}
        {searchState.status === 'empty' ? <span>{copy.noResults}</span> : null}
        {searchState.status === 'error' ? <span role="alert">{copy.searchUnavailable}</span> : null}
      </div>

      {searchState.status === 'success' ? (
        <div className={styles.results}>
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
      ) : null}

      {selectedPlace ? (
        <section className={styles.selection} aria-labelledby="taxi-selected-place">
          <div>
            <span className="eyebrow">{copy.address}</span>
            <h3 id="taxi-selected-place">{selectedPlace.name}</h3>
            {selectedPlace.formattedAddress ? <p>{selectedPlace.formattedAddress}</p> : null}
          </div>
          <button
            className="button button--accent"
            type="button"
            disabled={cardState.status === 'loading'}
            onClick={() => void createCard()}
          >
            {cardState.status === 'loading' ? (
              <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
            ) : (
              <Maximize2 size={17} aria-hidden="true" />
            )}
            {cardState.status === 'loading' ? copy.creating : copy.createCard}
          </button>
        </section>
      ) : null}

      {cardState.status === 'error' ? (
        <p className={styles.error} role="alert">
          {copy.translationUnavailable}
        </p>
      ) : null}

      {cardState.status === 'success' && cardState.data && !cardOpen ? (
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setCardOpen(true)}
        >
          <Maximize2 size={17} aria-hidden="true" />
          {copy.showCard}
        </button>
      ) : null}

      <p className={styles.sessionNote}>{copy.sessionOnly}</p>

      {safeRideConfigured ? (
        <SafeRideRouteWatch
          destination={{
            name: selectedPlace.name,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
          }}
          locale={locale}
          googleMapsBrowserKey={googleMapsBrowserKey}
          enabled={safeRideGoogleEnabled}
        />
      ) : null}

      {cardOpen && cardState.data && selectedPlace ? (
        <div className={styles.backdrop}>
          <section
            className={styles.driverCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-card-dialog-title"
          >
            <header className={styles.driverCardHeader}>
              <div>
                <span className="eyebrow">{targetLanguageName}</span>
                <h2 id="driver-card-dialog-title">{copy.title}</h2>
              </div>
              <button
                ref={closeRef}
                className={styles.closeButton}
                type="button"
                onClick={() => setCardOpen(false)}
                aria-label={copy.close}
              >
                <X size={24} aria-hidden="true" />
              </button>
            </header>

            <div className={styles.destinationBlock}>
              <MapPin size={27} aria-hidden="true" />
              <div>
                <strong>{selectedPlace.name}</strong>
                {selectedPlace.formattedAddress ? (
                  <span>{selectedPlace.formattedAddress}</span>
                ) : null}
              </div>
            </div>

            <p className={styles.translatedInstruction} dir={targetDirection}>
              {cardState.data.translatedText}
            </p>

            <div className={styles.originalInstruction}>
              <strong>{copy.original}</strong>
              <p>{cardState.data.instruction}</p>
            </div>

            <footer className={styles.driverCardFooter}>
              <span>{copy.showHint}</span>
              {cardState.data.provider ? <small>{cardState.data.provider}</small> : null}
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
