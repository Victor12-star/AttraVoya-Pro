'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  Landmark,
  LoaderCircle,
  Mail,
  Passport,
  Phone,
  TriangleAlert,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { emergencyPhoneHref, normalizeEmergencyCountries } from './travel-emergency-mode.jsx';
import { getConsularAssistanceCopy } from './consular-assistance-copy.js';
import styles from './consular-assistance.module.css';

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

function safeEmailHref(value) {
  const candidate = textValue(value, 254);
  if (!candidate || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return null;
  return `mailto:${candidate}`;
}

/** @param {any} response @param {string} hostCode @param {string} citizenshipCode */
export function normalizeConsularResponse(response, hostCode, citizenshipCode) {
  const consular = response?.consular;
  if (
    consular?.provider !== 'geoapify' ||
    consular?.sourceType !== 'directory' ||
    consular?.officiallyVerified !== false ||
    consular?.hostCountryCode !== hostCode ||
    consular?.citizenshipCountryCode !== citizenshipCode
  ) {
    return null;
  }

  const missions = (Array.isArray(consular?.results) ? consular.results : [])
    .map((mission) => {
      const externalId = textValue(mission?.externalId, 256);
      const name = textValue(mission?.name, 240);
      if (!externalId || !name || name === 'Unnamed place') return null;
      const phone = textValue(mission?.phone, 80);
      const email = textValue(mission?.email, 254);
      return {
        externalId,
        name,
        formattedAddress: textValue(mission?.formattedAddress, 500),
        city: textValue(mission?.city, 160),
        phone,
        callHref: emergencyPhoneHref(phone),
        email,
        emailHref: safeEmailHref(email),
        website: safeHttpUrl(mission?.website),
        openingHours: textValue(mission?.openingHours, 300),
      };
    })
    .filter(Boolean);

  return { missions };
}

/** @param {object} props @param {string} [props.locale] */
export function ConsularAssistance({ locale = 'en' }) {
  const copy = getConsularAssistanceCopy(locale);
  const requestSequenceRef = useRef(0);
  const [countriesState, setCountriesState] = useState({ status: 'loading', data: [] });
  const [hostCode, setHostCode] = useState('');
  const [citizenshipCode, setCitizenshipCode] = useState('');
  const [resultState, setResultState] = useState({ status: 'idle', data: null });

  useEffect(() => {
    let active = true;
    void apiClient
      .getCountries()
      .then((response) => {
        if (!active) return;
        const countries = normalizeEmergencyCountries(response);
        setCountriesState({ status: countries.length ? 'success' : 'error', data: countries });
      })
      .catch(() => {
        if (active) setCountriesState({ status: 'error', data: [] });
      });
    return () => {
      active = false;
      requestSequenceRef.current += 1;
    };
  }, []);

  const countryByCode = useMemo(
    () => new Map(countriesState.data.map((country) => [country.iso2, country])),
    [countriesState.data],
  );

  async function searchConsularMissions() {
    const hostCountry = countryByCode.get(hostCode);
    const citizenshipCountry = countryByCode.get(citizenshipCode);
    if (!hostCountry || !citizenshipCountry) return;

    requestSequenceRef.current += 1;
    const sequence = requestSequenceRef.current;
    setResultState({ status: 'loading', data: null });

    const query = new URLSearchParams({
      hostCountryCode: hostCountry.iso2,
      hostCountryName: hostCountry.name,
      citizenshipCountryCode: citizenshipCountry.iso2,
      citizenshipCountryName: citizenshipCountry.name,
      limit: '5',
      language: String(locale).split('-')[0] || 'en',
    });

    try {
      const response = await apiClient.request(`/api/v1/places/consular-missions?${query}`, {
        cache: 'no-store',
      });
      if (sequence !== requestSequenceRef.current) return;
      const normalized = normalizeConsularResponse(response, hostCountry.iso2, citizenshipCountry.iso2);
      if (!normalized) {
        setResultState({ status: 'error', data: null });
        return;
      }
      setResultState({
        status: normalized.missions.length ? 'success' : 'empty',
        data: normalized,
      });
    } catch {
      if (sequence === requestSequenceRef.current) {
        setResultState({ status: 'error', data: null });
      }
    }
  }

  const canSearch =
    countriesState.status === 'success' && Boolean(hostCode) && Boolean(citizenshipCode);

  return (
    <section className={`shell ${styles.section}`} aria-labelledby="consular-assistance-title">
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <Landmark size={27} />
        </span>
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2 id="consular-assistance-title">{copy.title}</h2>
          <p>{copy.intro}</p>
        </div>
      </header>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span>{copy.hostCountry}</span>
          <select value={hostCode} onChange={(event) => setHostCode(event.target.value)}>
            <option value="">{copy.hostCountry}</option>
            {countriesState.data.map((country) => (
              <option key={`host-${country.iso2}`} value={country.iso2}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{copy.citizenship}</span>
          <select
            value={citizenshipCode}
            onChange={(event) => setCitizenshipCode(event.target.value)}
          >
            <option value="">{copy.citizenship}</option>
            {countriesState.data.map((country) => (
              <option key={`citizenship-${country.iso2}`} value={country.iso2}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button button--accent"
          disabled={!canSearch || resultState.status === 'loading'}
          onClick={() => void searchConsularMissions()}
        >
          <Landmark size={18} aria-hidden="true" />
          {copy.search}
        </button>
      </div>

      {countriesState.status === 'error' || resultState.status === 'error' ? (
        <div className={styles.feedback} role="alert">
          <TriangleAlert size={20} aria-hidden="true" />
          <span>{copy.error}</span>
        </div>
      ) : null}

      {resultState.status === 'loading' ? (
        <div className={styles.feedback} role="status" aria-live="polite">
          <LoaderCircle className={styles.spin} size={21} aria-hidden="true" />
          <span>{copy.loading}</span>
        </div>
      ) : null}

      {resultState.status === 'empty' ? (
        <div className={styles.feedback} role="status">
          <TriangleAlert size={20} aria-hidden="true" />
          <span>{copy.empty}</span>
        </div>
      ) : null}

      {resultState.status === 'success' ? (
        <section className={styles.results} aria-labelledby="consular-directory-results">
          <div className={styles.resultsHeading}>
            <h3 id="consular-directory-results">{copy.results}</h3>
            <span>{copy.directoryBadge}</span>
          </div>
          <div className={styles.grid}>
            {resultState.data.missions.map((mission) => (
              <article className={styles.card} key={mission.externalId}>
                <div>
                  <h4>{mission.name}</h4>
                  <p>{mission.formattedAddress ?? mission.city ?? copy.addressUnavailable}</p>
                  {mission.openingHours ? <p className={styles.hours}>{mission.openingHours}</p> : null}
                </div>
                <div className={styles.actions}>
                  {mission.callHref ? (
                    <a className="button button--accent" href={mission.callHref}>
                      <Phone size={17} aria-hidden="true" />
                      {copy.call}
                    </a>
                  ) : mission.phone ? (
                    <span className={styles.unavailable}>
                      <Phone size={16} aria-hidden="true" />
                      {copy.callUnavailable}
                    </span>
                  ) : null}
                  {mission.emailHref ? (
                    <a className="button button--secondary" href={mission.emailHref}>
                      <Mail size={17} aria-hidden="true" />
                      {copy.email}
                    </a>
                  ) : null}
                  {mission.website ? (
                    <a
                      className="button button--secondary"
                      href={mission.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={17} aria-hidden="true" />
                      {copy.website}
                    </a>
                  ) : null}
                </div>
                {mission.phone ? <p className={styles.contactText}>{mission.phone}</p> : null}
                {mission.email ? <p className={styles.contactText}>{mission.email}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <aside className={styles.warning}>
        <TriangleAlert size={21} aria-hidden="true" />
        <p>{copy.verifyWarning}</p>
      </aside>

      <section className={styles.lostPassport} aria-labelledby="lost-passport-title">
        <div className={styles.lostHeading}>
          <Passport size={24} aria-hidden="true" />
          <div>
            <h3 id="lost-passport-title">{copy.lostTitle}</h3>
            <p>{copy.lostIntro}</p>
          </div>
        </div>
        <ol>
          {copy.lostSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </section>
  );
}
