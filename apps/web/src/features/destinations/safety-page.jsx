'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { buildDestinationHref } from './destination-route.js';
import { getSafetyPageCopy } from './safety-page-copy.js';
import styles from './safety-page.module.css';

/**
 * @typedef {object} SafetyDestination
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

/** @typedef {{status:'idle'|'loading'|'success'|'empty'|'error', data:any}} SafetyState */

function textValue(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function safeSourceUrl(value) {
  const candidate = textValue(value, 1000);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function phoneHref(phoneNumber) {
  const normalized = phoneNumber.replace(/[\s().-]/g, '');
  return /^\+?[0-9*#]{2,20}$/.test(normalized) ? `tel:${normalized}` : null;
}

function normalizeRecord(record) {
  const id = textValue(record?.id, 128);
  const service = textValue(record?.service, 64);
  const serviceLabel = textValue(record?.serviceLabel, 160);
  const phoneNumber = textValue(record?.phoneNumber, 80);
  const sourceName = textValue(record?.sourceName, 240);
  const sourceUrl = safeSourceUrl(record?.sourceUrl);
  const lastVerifiedAt = isoDate(record?.lastVerifiedAt);

  if (!id || !service || !serviceLabel || !phoneNumber || !sourceName || !sourceUrl || !lastVerifiedAt) {
    return null;
  }

  return {
    id,
    service,
    serviceLabel,
    phoneNumber,
    phoneHref: phoneHref(phoneNumber),
    sourceName,
    sourceUrl,
    lastVerifiedAt,
  };
}

/**
 * @param {string} countryCode
 * @returns {Promise<SafetyState>}
 */
async function requestEmergency(countryCode) {
  try {
    const response = await apiClient.getEmergencyRecords({ countryCode });
    const emergency = response?.emergency;
    if (emergency?.countryCode !== countryCode || !Array.isArray(emergency?.records)) {
      return { status: 'error', data: null };
    }

    const records = emergency.records.map(normalizeRecord).filter(Boolean);
    return {
      status: records.length > 0 ? 'success' : 'empty',
      data: { records },
    };
  } catch {
    return { status: 'error', data: null };
  }
}

function destinationText(template, destinationName) {
  return template.replace('{destination}', destinationName);
}

/**
 * @param {object} props
 * @param {SafetyDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function SafetyDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getSafetyPageCopy(locale);
  const [state, setState] = useState(
    /** @type {SafetyState} */ ({ status: destination ? 'loading' : 'idle', data: null }),
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  );

  useEffect(() => {
    if (!destination) return;
    let active = true;

    void requestEmergency(destination.countryCode).then((nextState) => {
      if (active) setState(nextState);
    });

    return () => {
      active = false;
    };
  }, [destination]);

  function retry() {
    if (!destination) return;
    setState({ status: 'loading', data: null });
    void requestEmergency(destination.countryCode).then(setState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="safety-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <ShieldCheck size={34} aria-hidden="true" />
          <h1 id="safety-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.unavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const records = state.data?.records ?? [];
  const backHref = buildDestinationHref(destination);

  return (
    <section className={styles.page} aria-labelledby="safety-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="safety-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.badges} aria-label={copy.verifiedOnly}>
            <span><CheckCircle2 size={16} aria-hidden="true" />{copy.verifiedOnly}</span>
            <span>{copy.countryWide} · {destination.countryDisplayName}</span>
          </div>
        </header>

        {state.status === 'loading' || state.status === 'idle' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={27} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <ShieldCheck size={29} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.unavailable}</span>
            <button className="button button--secondary button--compact" type="button" onClick={retry}>
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {state.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <ShieldCheck size={29} aria-hidden="true" />
            <span>{copy.noRecords}</span>
            <button className="button button--secondary button--compact" type="button" onClick={retry}>
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <>
            <p className={styles.resultCount}><strong>{records.length}</strong> {copy.recordsFound}</p>
            <div className={styles.grid} aria-live="polite">
              {records.map((record) => (
                <article className={styles.card} key={record.id}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon} aria-hidden="true"><ShieldCheck size={20} /></span>
                    <div>
                      <h2>{record.serviceLabel}</h2>
                      <span className={styles.verifiedBadge}><CheckCircle2 size={14} aria-hidden="true" />{copy.verifiedOnly}</span>
                    </div>
                  </div>

                  <div className={styles.phoneRow}>
                    <Phone size={19} aria-hidden="true" />
                    <strong>{record.phoneNumber}</strong>
                    {record.phoneHref ? (
                      <a className="button button--accent button--compact" href={record.phoneHref}>{copy.call}</a>
                    ) : null}
                  </div>

                  <dl className={styles.provenance}>
                    <div>
                      <dt>{copy.source}</dt>
                      <dd>
                        <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                          {record.sourceName}<ExternalLink size={13} aria-hidden="true" />
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt>{copy.lastVerified}</dt>
                      <dd>{dateFormatter.format(record.lastVerifiedAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
