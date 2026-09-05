'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ExternalLink, LoaderCircle, MapPin, RefreshCw } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { buildDestinationHref } from './destination-route.js';
import { getEventsPageCopy } from './events-page-copy.js';
import styles from './events-page.module.css';

/** @typedef {'idle'|'loading'|'success'|'empty'|'error'} EventsStatus */

/** @param {unknown} value */
function textValue(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

/** @param {unknown} value */
function safeHttpsUrl(value) {
  const text = textValue(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** @param {unknown} value */
function validLocalDate(value) {
  const text = textValue(value);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

/** @param {unknown} value */
function validLocalTime(value) {
  const text = textValue(value);
  return text && /^\d{2}:\d{2}(?::\d{2})?$/.test(text) ? text : null;
}

/** @param {unknown} value */
function validDateTime(value) {
  const text = textValue(value);
  return text && Number.isFinite(Date.parse(text)) ? text : null;
}

/** @param {string|null} timezone */
function validTimeZone(timezone) {
  if (!timezone) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return null;
  }
}

/** @param {unknown} value */
function providerDisplayName(value) {
  const provider = textValue(value)?.toLowerCase();
  if (provider === 'ticketmaster') return 'Ticketmaster';
  return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : null;
}

/**
 * @param {unknown} row
 * @param {string} destinationCountryCode
 * @param {string} resultProvider
 */
function normalizeEvent(row, destinationCountryCode, resultProvider) {
  const value = /** @type {any} */ (row);
  const externalId = textValue(value?.externalId);
  const name = textValue(value?.name);
  const eventProvider = textValue(value?.provider)?.toLowerCase();
  const venueCountryCode = textValue(value?.venue?.countryCode)?.toUpperCase();

  if (!externalId || !name) return null;
  if (eventProvider && eventProvider !== resultProvider) return null;
  if (venueCountryCode && venueCountryCode !== destinationCountryCode) return null;

  const classifications = Array.isArray(value?.classifications)
    ? value.classifications
        .map((classification) => {
          const segment = textValue(classification?.segment);
          const genre = textValue(classification?.genre);
          return [segment, genre].filter(Boolean).join(' · ') || null;
        })
        .filter(Boolean)
    : [];

  return {
    externalId,
    name,
    url: safeHttpsUrl(value?.url),
    start: {
      dateTime: validDateTime(value?.start?.dateTime),
      localDate: validLocalDate(value?.start?.localDate),
      localTime: validLocalTime(value?.start?.localTime),
      timezone: validTimeZone(textValue(value?.start?.timezone)),
      dateTbd: Boolean(value?.start?.dateTbd || value?.start?.dateTba),
      timeTba: Boolean(value?.start?.timeTba),
    },
    venue: {
      name: textValue(value?.venue?.name),
      address: textValue(value?.venue?.address),
      city: textValue(value?.venue?.city),
    },
    category: classifications[0] ?? null,
  };
}

/**
 * @param {any} destination
 * @param {string} locale
 * @returns {Promise<{status: EventsStatus, data: any}>}
 */
async function requestEvents(destination, locale) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getEvents({
        countryCode: destination.countryCode,
        latitude: destination.latitude,
        longitude: destination.longitude,
        radius: 50,
        unit: 'km',
        locale,
        size: 20,
        page: 0,
        sort: 'date,asc',
      })
    );
    const payload = response?.events;
    const provider = textValue(payload?.provider)?.toLowerCase();
    if (!provider || !Array.isArray(payload?.events)) return { status: 'error', data: null };

    const seen = new Set();
    const events = payload.events
      .map((row) => normalizeEvent(row, destination.countryCode, provider))
      .filter((event) => event !== null)
      .filter((event) => {
        if (seen.has(event.externalId)) return false;
        seen.add(event.externalId);
        return true;
      });

    if (!events.length) return { status: 'empty', data: { provider, events: [] } };
    return {
      status: 'success',
      data: { provider, fetchedAt: validDateTime(payload.fetchedAt), events },
    };
  } catch {
    return { status: 'error', data: null };
  }
}

function template(value, destinationName) {
  return value.replace('{destination}', destinationName);
}

function eventDateLabel(event, locale, copy) {
  if (event.start.dateTbd) return copy.dateTbd;
  if (event.start.localDate) {
    const date = new Date(`${event.start.localDate}T12:00:00Z`);
    const dateLabel = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(date);
    return event.start.localTime && !event.start.timeTba
      ? `${dateLabel} · ${event.start.localTime.slice(0, 5)}`
      : dateLabel;
  }
  if (event.start.dateTime) {
    const options = { dateStyle: 'medium', timeStyle: 'short' };
    if (event.start.timezone) options.timeZone = event.start.timezone;
    return new Intl.DateTimeFormat(locale, options).format(new Date(event.start.dateTime));
  }
  return copy.dateUnavailable;
}

export function EventsDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getEventsPageCopy(locale);
  const [state, setState] = useState(
    /** @type {{status: EventsStatus, data: any}} */ ({
      status: destination ? 'loading' : 'idle',
      data: null,
    }),
  );
  const checkedFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  useEffect(() => {
    if (!destination) return;
    let active = true;
    void requestEvents(destination, locale).then((nextState) => {
      if (active) setState(nextState);
    });
    return () => {
      active = false;
    };
  }, [destination, locale]);

  function retry() {
    if (!destination) return;
    setState({ status: 'loading', data: null });
    void requestEvents(destination, locale).then(setState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="events-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <CalendarDays size={34} aria-hidden="true" />
          <h1 id="events-unavailable-title">{messages.common.unavailable}</h1>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const provider = providerDisplayName(state.data?.provider);
  const fetchedAt = state.data?.fetchedAt ? new Date(state.data.fetchedAt) : null;
  const validFetchedAt = fetchedAt && Number.isFinite(fetchedAt.getTime());

  return (
    <section className={styles.page} aria-labelledby="events-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={buildDestinationHref(destination)}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="events-title">{template(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            <span>{copy.searchArea}</span>
            {provider ? <span>{provider}</span> : null}
            {validFetchedAt ? (
              <span>{`${copy.providerChecked}: ${checkedFormatter.format(fetchedAt)}`}</span>
            ) : null}
          </div>
        </header>

        {state.status === 'loading' || state.status === 'idle' ? (
          <div className={styles.feedback} role="status">
            <LoaderCircle className={styles.spin} size={28} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {state.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <CalendarDays size={28} aria-hidden="true" />
            <strong>{copy.noResults}</strong>
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className={styles.feedback} role="status">
            <strong>{copy.unavailable}</strong>
            <button className="button button--secondary button--compact" type="button" onClick={retry}>
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <section aria-labelledby="events-results-title">
            <div className={styles.sectionHeading}>
              <h2 id="events-results-title">{copy.results}</h2>
            </div>
            <div className={styles.grid}>
              {state.data.events.map((event) => (
                <article className={styles.card} key={event.externalId}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      <CalendarDays size={20} />
                    </span>
                    <div>
                      <span className={styles.date}>{eventDateLabel(event, locale, copy)}</span>
                      <h3>{event.name}</h3>
                    </div>
                  </div>

                  {event.venue.name || event.venue.address || event.venue.city ? (
                    <div className={styles.metaRow}>
                      <MapPin size={17} aria-hidden="true" />
                      <div>
                        <span>{copy.venue}</span>
                        <strong>
                          {[event.venue.name, event.venue.address, event.venue.city]
                            .filter(Boolean)
                            .join(' · ')}
                        </strong>
                      </div>
                    </div>
                  ) : null}

                  {event.category ? (
                    <div className={styles.metaText}>
                      <span>{copy.category}</span>
                      <strong>{event.category}</strong>
                    </div>
                  ) : null}

                  <div className={styles.cardFooter}>
                    {provider ? <span>{`${copy.provider}: ${provider}`}</span> : <span />}
                    {event.url ? (
                      <a href={event.url} target="_blank" rel="noreferrer">
                        {copy.details}
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <p className={styles.disclaimer}>{copy.disclaimer}</p>
      </div>
    </section>
  );
}
