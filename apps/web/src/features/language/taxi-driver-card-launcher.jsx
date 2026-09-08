'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { getLanguagePageCopy } from '../destinations/language-page-copy.js';
import { TaxiDriverCard } from './taxi-driver-card.jsx';
import styles from './taxi-driver-card-launcher.module.css';

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

/** @param {any} response */
function normalizeCountries(response) {
  const rows = Array.isArray(response?.countries) ? response.countries : [];
  return rows
    .map((country) => {
      const iso2 = textValue(country?.iso2, 2)?.toUpperCase();
      const name = textValue(country?.name, 160);
      return iso2 && /^[A-Z]{2}$/.test(iso2) && name ? { iso2, name } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
}

/** @param {any} response */
function normalizeDestinationLanguages(response, expectedCountryCode) {
  const phrasebook = response?.phrasebook;
  const countryCode = textValue(phrasebook?.destination?.countryCode, 2)?.toUpperCase();
  if (countryCode !== expectedCountryCode) return null;

  const languages = (
    Array.isArray(phrasebook?.destination?.languages) ? phrasebook.destination.languages : []
  )
    .map((language) => {
      const code = languageCode(language?.code);
      if (!code || language?.available !== true) return null;
      return {
        code,
        name: textValue(language?.name, 160) ?? code,
        nativeName: textValue(language?.nativeName, 160),
        direction: language?.direction === 'rtl' ? 'rtl' : 'ltr',
      };
    })
    .filter(Boolean);
  const preferredCode = languageCode(phrasebook?.destination?.preferredTargetLanguage);
  return { languages, preferredCode };
}

/**
 * @param {object} props
 * @param {string} [props.locale]
 * @param {any} props.messages
 * @param {string} [props.googleMapsBrowserKey]
 * @param {boolean} [props.safeRideGoogleEnabled]
 */
export function TaxiDriverCardLauncher({
  locale = 'en',
  messages,
  googleMapsBrowserKey = '',
  safeRideGoogleEnabled = false,
}) {
  const languageCopy = getLanguagePageCopy(locale);
  const [countriesState, setCountriesState] = useState(
    /** @type {{status:string, data:any[]}} */ ({ status: 'loading', data: [] }),
  );
  const [countryCode, setCountryCode] = useState('');
  const [languageState, setLanguageState] = useState(
    /** @type {{status:string, data:any[]}} */ ({ status: 'idle', data: [] }),
  );
  const [targetLanguage, setTargetLanguage] = useState('');

  useEffect(() => {
    let active = true;
    void apiClient
      .getCountries()
      .then((response) => {
        if (!active) return;
        const countries = normalizeCountries(response);
        setCountriesState({ status: countries.length ? 'success' : 'error', data: countries });
      })
      .catch(() => {
        if (active) setCountriesState({ status: 'error', data: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadLanguages(nextCountryCode) {
    setLanguageState({ status: 'loading', data: [] });
    setTargetLanguage('');
    try {
      const response = await apiClient.request(
        `/api/v1/phrasebook?countryCode=${encodeURIComponent(nextCountryCode)}`,
        { cache: 'force-cache' },
      );
      const normalized = normalizeDestinationLanguages(response, nextCountryCode);
      if (!normalized) {
        setLanguageState({ status: 'error', data: [] });
        return;
      }
      setLanguageState({
        status: normalized.languages.length ? 'success' : 'empty',
        data: normalized.languages,
      });
      const preferred = normalized.languages.find(
        (language) => language.code === normalized.preferredCode,
      );
      setTargetLanguage(preferred?.code ?? normalized.languages[0]?.code ?? '');
    } catch {
      setLanguageState({ status: 'error', data: [] });
    }
  }

  function handleCountryChange(event) {
    const nextCountryCode = String(event.target.value ?? '')
      .trim()
      .toUpperCase();
    if (nextCountryCode && !/^[A-Z]{2}$/.test(nextCountryCode)) return;
    setCountryCode(nextCountryCode);
    setTargetLanguage('');
    if (nextCountryCode) void loadLanguages(nextCountryCode);
    else setLanguageState({ status: 'idle', data: [] });
  }

  const targetReference = languageState.data.find((language) => language.code === targetLanguage);

  return (
    <section className={`shell ${styles.section}`} aria-label="Taxi / Driver Card">
      <div className={styles.setup}>
        <label className={styles.field}>
          <span>{messages.common.chooseCountry}</span>
          <select
            value={countryCode}
            onChange={handleCountryChange}
            disabled={countriesState.status === 'loading'}
          >
            <option value="">{messages.common.chooseCountry}</option>
            {countriesState.data.map((country) => (
              <option key={country.iso2} value={country.iso2}>
                {country.name}
              </option>
            ))}
          </select>
        </label>

        {languageState.status === 'success' ? (
          <label className={styles.field}>
            <span>{languageCopy.targetLanguage}</span>
            <select
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
            >
              {languageState.data.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                  {language.nativeName && language.nativeName !== language.name
                    ? ` · ${language.nativeName}`
                    : ''}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {countriesState.status === 'loading' || languageState.status === 'loading' ? (
        <div className={styles.feedback} role="status" aria-live="polite">
          <LoaderCircle className={styles.spin} size={20} aria-hidden="true" />
          {messages.common.loading}
        </div>
      ) : null}
      {countriesState.status === 'error' || languageState.status === 'error' ? (
        <div className={styles.feedback} role="alert">
          {languageCopy.supportUnavailable}
        </div>
      ) : null}
      {languageState.status === 'empty' ? (
        <div className={styles.feedback} role="status">
          {languageCopy.unsupported}
        </div>
      ) : null}

      {countryCode && targetReference ? (
        <TaxiDriverCard
          key={`${countryCode}:${targetReference.code}`}
          countryCode={countryCode}
          targetLanguage={targetReference.code}
          targetLanguageName={targetReference.name}
          targetDirection={targetReference.direction}
          locale={locale}
          googleMapsBrowserKey={googleMapsBrowserKey}
          safeRideGoogleEnabled={safeRideGoogleEnabled}
        />
      ) : null}
    </section>
  );
}
