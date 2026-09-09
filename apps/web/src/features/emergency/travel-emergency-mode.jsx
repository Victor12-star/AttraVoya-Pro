'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock3, ExternalLink, LoaderCircle, Phone, ShieldAlert } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { getTravelEmergencyCopy } from './travel-emergency-copy.js';
import styles from './travel-emergency-mode.module.css';

function textValue(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function safeHttpUrl(value) {
  const candidate = textValue(value, 1000);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Creates a tel: target only for a deliberately small telephone-safe alphabet.
 * Human-readable values that contain words or unexpected punctuation are still
 * shown, but never become executable links.
 */
export function emergencyPhoneHref(value) {
  const candidate = textValue(value, 80);
  if (!candidate || !/^[0-9+*#().\s-]+$/.test(candidate)) return null;
  const compact = candidate.replace(/[\s().-]/g, '');
  return /^\+?[0-9*#]{2,24}$/.test(compact) ? `tel:${compact}` : null;
}

/** @param {any} response */
export function normalizeEmergencyCountries(response) {
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

/** @param {any} response @param {string} expectedCountryCode */
export function normalizeEmergencyResponse(response, expectedCountryCode) {
  const emergency = response?.emergency;
  const countryCode = textValue(emergency?.countryCode, 2)?.toUpperCase();
  if (countryCode !== expectedCountryCode) return null;

  const records = (Array.isArray(emergency?.records) ? emergency.records : [])
    .map((record) => {
      const id = textValue(record?.id, 128);
      const service = textValue(record?.service, 64);
      const serviceLabel = textValue(record?.serviceLabel, 160);
      const phoneNumber = textValue(record?.phoneNumber, 80);
      const sourceName = textValue(record?.sourceName, 240);
      const sourceUrl = safeHttpUrl(record?.sourceUrl);
      const verifiedDate = record?.lastVerifiedAt ? new Date(record.lastVerifiedAt) : null;
      const lastVerifiedAt =
        verifiedDate && !Number.isNaN(verifiedDate.getTime()) ? verifiedDate.toISOString() : null;

      if (
        !id ||
        !service ||
        !serviceLabel ||
        !phoneNumber ||
        !sourceName ||
        !sourceUrl ||
        !lastVerifiedAt
      ) {
        return null;
      }

      return {
        id,
        service,
        serviceLabel,
        phoneNumber,
        callHref: emergencyPhoneHref(phoneNumber),
        sourceName,
        sourceUrl,
        lastVerifiedAt,
      };
    })
    .filter(Boolean);

  return { countryCode, records };
}

function formatVerifiedDate(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
  }
}

/**
 * Public, provider-independent emergency contact view. It intentionally uses
 * only the backend's published VERIFIED records and never guesses a fallback
 * number when the reference dataset is incomplete.
 *
 * @param {object} props
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function TravelEmergencyMode({ locale = 'en', messages }) {
  const copy = getTravelEmergencyCopy(locale);
  const requestSequenceRef = useRef(0);
  const [countriesState, setCountriesState] = useState(
    /** @type {{status:string, data:any[]}} */ ({ status: 'loading', data: [] }),
  );
  const [countryCode, setCountryCode] = useState('');
  const [emergencyState, setEmergencyState] = useState(
    /** @type {{status:string, data:any}} */ ({ status: 'idle', data: null }),
  );

  useEffect(() => {
    let active = true;
    void apiClient
      .getCountries()
      .then((response) => {
        if (!active) return;
        const countries = normalizeEmergencyCountries(response);
        setCountriesState({
          status: countries.length ? 'success' : 'error',
          data: countries,
        });
      })
      .catch(() => {
        if (active) setCountriesState({ status: 'error', data: [] });
      });
    return () => {
      active = false;
      requestSequenceRef.current += 1;
    };
  }, []);

  async function loadEmergency(nextCountryCode) {
    requestSequenceRef.current += 1;
    const requestSequence = requestSequenceRef.current;
    setEmergencyState({ status: 'loading', data: null });

    try {
      const response = await apiClient.request(
        `/api/v1/emergency?countryCode=${encodeURIComponent(nextCountryCode)}`,
        { cache: 'no-store' },
      );
      if (requestSequence !== requestSequenceRef.current) return;
      const emergency = normalizeEmergencyResponse(response, nextCountryCode);
      if (!emergency) {
        setEmergencyState({ status: 'error', data: null });
        return;
      }
      setEmergencyState({
        status: emergency.records.length ? 'success' : 'empty',
        data: emergency,
      });
    } catch {
      if (requestSequence === requestSequenceRef.current) {
        setEmergencyState({ status: 'error', data: null });
      }
    }
  }

  function handleCountryChange(event) {
    const nextCountryCode = String(event.target.value ?? '')
      .trim()
      .toUpperCase();
    if (nextCountryCode && !/^[A-Z]{2}$/.test(nextCountryCode)) return;
    setCountryCode(nextCountryCode);
    if (nextCountryCode) void loadEmergency(nextCountryCode);
    else {
      requestSequenceRef.current += 1;
      setEmergencyState({ status: 'idle', data: null });
    }
  }

  return (
    <section className={`shell ${styles.section}`} aria-labelledby="travel-emergency-title">
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <ShieldAlert size={28} />
        </span>
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2 id="travel-emergency-title">{copy.title}</h2>
          <p>{copy.intro}</p>
        </div>
      </header>

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
        <p>{copy.chooseCountryHint}</p>
      </div>

      {countriesState.status === 'loading' || emergencyState.status === 'loading' ? (
        <div className={styles.feedback} role="status" aria-live="polite">
          <LoaderCircle className={styles.spin} size={22} aria-hidden="true" />
          <span>
            {emergencyState.status === 'loading' ? copy.loading : messages.common.loading}
          </span>
        </div>
      ) : null}

      {countriesState.status === 'error' || emergencyState.status === 'error' ? (
        <div className={styles.feedback} role="alert">
          <ShieldAlert size={21} aria-hidden="true" />
          <span>{copy.error}</span>
        </div>
      ) : null}

      {emergencyState.status === 'empty' ? (
        <div className={styles.feedback} role="status">
          <ShieldAlert size={21} aria-hidden="true" />
          <span>{copy.empty}</span>
        </div>
      ) : null}

      {emergencyState.status === 'success' ? (
        <section className={styles.contacts} aria-labelledby="verified-emergency-contacts">
          <h3 id="verified-emergency-contacts">{copy.contacts}</h3>
          <div className={styles.grid}>
            {emergencyState.data.records.map((record) => (
              <article className={styles.card} key={record.id}>
                <div className={styles.cardHeading}>
                  <div>
                    <span className="eyebrow">{record.service}</span>
                    <h4>{record.serviceLabel}</h4>
                  </div>
                  <strong className={styles.phoneNumber} dir="ltr">
                    {record.phoneNumber}
                  </strong>
                </div>

                <div className={styles.actions}>
                  {record.callHref ? (
                    <a className="button button--accent" href={record.callHref}>
                      <Phone size={18} aria-hidden="true" />
                      {copy.call}
                    </a>
                  ) : (
                    <span className={styles.callUnavailable}>
                      <Phone size={17} aria-hidden="true" />
                      {copy.callUnavailable}
                    </span>
                  )}
                  <a
                    className="button button--secondary"
                    href={record.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={17} aria-hidden="true" />
                    {copy.source}
                  </a>
                </div>

                <div className={styles.verification}>
                  <Clock3 size={16} aria-hidden="true" />
                  <span>
                    {copy.lastVerified}: {formatVerifiedDate(record.lastVerifiedAt, locale)} ·{' '}
                    {record.sourceName}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <aside className={styles.disclaimer}>
        <ShieldAlert size={21} aria-hidden="true" />
        <div>
          <strong>{copy.disclaimerTitle}</strong>
          <p>{copy.disclaimer}</p>
          <p>{copy.immediateDanger}</p>
        </div>
      </aside>
    </section>
  );
}
