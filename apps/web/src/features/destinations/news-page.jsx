'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, LoaderCircle, Newspaper, RefreshCw } from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { buildDestinationHref } from './destination-route.js';
import { getNewsPageCopy } from './news-page-copy.js';
import styles from './news-page.module.css';

/** @typedef {'idle'|'loading'|'success'|'empty'|'error'} NewsStatus */

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
function validDateTime(value) {
  const text = textValue(value);
  return text && Number.isFinite(Date.parse(text)) ? text : null;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function textArray(value) {
  if (!Array.isArray(value)) return [];
  return value.reduce((items, item) => {
    const text = textValue(item);
    if (text) items.push(text);
    return items;
  }, /** @type {string[]} */ ([]));
}

/** @param {unknown} value */
function providerDisplayName(value) {
  const provider = textValue(value)?.toLowerCase();
  if (provider === 'newsdata') return 'NewsData';
  return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : null;
}

/**
 * Reject only a definite two-letter country-code mismatch. NewsData can also
 * return country names, so longer provider country labels are left intact.
 * @param {string[]} countries
 * @param {string} destinationCountryCode
 */
function hasDefiniteCountryMismatch(countries, destinationCountryCode) {
  const countryCodes = countries
    .filter((country) => /^[A-Za-z]{2}$/.test(country))
    .map((country) => country.toUpperCase());
  return countryCodes.length > 0 && !countryCodes.includes(destinationCountryCode);
}

/**
 * @param {unknown} row
 * @param {string} destinationCountryCode
 * @param {string} resultProvider
 */
function normalizeArticle(row, destinationCountryCode, resultProvider) {
  const value = /** @type {any} */ (row);
  const title = textValue(value?.title);
  const articleProvider = textValue(value?.provider)?.toLowerCase();
  const countries = textArray(value?.countries);

  if (!title || value?.duplicate === true) return null;
  if (articleProvider && articleProvider !== resultProvider) return null;
  if (hasDefiniteCountryMismatch(countries, destinationCountryCode)) return null;

  const url = safeHttpsUrl(value?.url);
  const externalId = textValue(value?.externalId);
  const publishedAt = validDateTime(value?.publishedAt);

  return {
    key: externalId ?? url ?? `${title}-${publishedAt ?? 'undated'}`,
    title,
    description: textValue(value?.description),
    url,
    publishedAt,
    sourceName: textValue(value?.source?.name),
    category: textArray(value?.categories)[0] ?? null,
  };
}

/**
 * @param {any} destination
 * @param {string} locale
 * @returns {Promise<{status: NewsStatus, data: any}>}
 */
async function requestNews(destination, locale) {
  try {
    const response = /** @type {any} */ (
      await apiClient.getNews({
        query: destination.name,
        countryCode: destination.countryCode,
        language: locale.toLowerCase().split('-')[0],
        size: 10,
      })
    );
    const payload = response?.news;
    const provider = textValue(payload?.provider)?.toLowerCase();
    if (!provider || !Array.isArray(payload?.articles)) return { status: 'error', data: null };

    const seen = new Set();
    const articles = payload.articles
      .map((row) => normalizeArticle(row, destination.countryCode, provider))
      .filter((article) => article !== null)
      .filter((article) => {
        if (seen.has(article.key)) return false;
        seen.add(article.key);
        return true;
      })
      .sort((a, b) => {
        if (!a.publishedAt && !b.publishedAt) return 0;
        if (!a.publishedAt) return 1;
        if (!b.publishedAt) return -1;
        return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      });

    if (!articles.length) {
      return {
        status: 'empty',
        data: {
          provider,
          fetchedAt: validDateTime(payload?.fetchedAt),
          realtimeGuaranteed: payload?.realtimeGuaranteed === true,
          articles: [],
        },
      };
    }

    return {
      status: 'success',
      data: {
        provider,
        fetchedAt: validDateTime(payload?.fetchedAt),
        realtimeGuaranteed: payload?.realtimeGuaranteed === true,
        articles,
      },
    };
  } catch {
    return { status: 'error', data: null };
  }
}

function template(value, destinationName) {
  return value.replace('{destination}', destinationName);
}

export function NewsDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getNewsPageCopy(locale);
  const [state, setState] = useState(
    /** @type {{status: NewsStatus, data: any}} */ ({
      status: destination ? 'loading' : 'idle',
      data: null,
    }),
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  useEffect(() => {
    if (!destination) return;
    let active = true;
    void requestNews(destination, locale).then((nextState) => {
      if (active) setState(nextState);
    });
    return () => {
      active = false;
    };
  }, [destination, locale]);

  function retry() {
    if (!destination) return;
    setState({ status: 'loading', data: null });
    void requestNews(destination, locale).then(setState);
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="news-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <Newspaper size={34} aria-hidden="true" />
          <h1 id="news-unavailable-title">{messages.common.unavailable}</h1>
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
    <section className={styles.page} aria-labelledby="news-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={buildDestinationHref(destination)}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="news-title">{template(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.heroMeta}>
            {state.data && state.data.realtimeGuaranteed === false ? <span>{copy.delayed}</span> : null}
            {provider ? <span>{provider}</span> : null}
            {validFetchedAt ? <span>{`${copy.providerChecked}: ${dateFormatter.format(fetchedAt)}`}</span> : null}
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
            <Newspaper size={28} aria-hidden="true" />
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
          <section aria-labelledby="news-results-title">
            <div className={styles.sectionHeading}>
              <h2 id="news-results-title">{copy.results}</h2>
            </div>
            <div className={styles.grid}>
              {state.data.articles.map((article) => (
                <article className={styles.card} key={article.key}>
                  <div className={styles.cardHeading}>
                    <span className={styles.cardIcon} aria-hidden="true"><Newspaper size={20} /></span>
                    <div>
                      <span className={styles.date}>
                        {article.publishedAt
                          ? `${copy.published}: ${dateFormatter.format(new Date(article.publishedAt))}`
                          : copy.publishedUnavailable}
                      </span>
                      <h3>{article.title}</h3>
                    </div>
                  </div>

                  {article.description ? <p className={styles.description}>{article.description}</p> : null}

                  {article.sourceName ? (
                    <div className={styles.metaText}>
                      <span>{copy.source}</span>
                      <strong>{article.sourceName}</strong>
                    </div>
                  ) : null}

                  {article.category ? (
                    <div className={styles.metaText}>
                      <span>{copy.category}</span>
                      <strong>{article.category}</strong>
                    </div>
                  ) : null}

                  <div className={styles.cardFooter}>
                    {provider ? <span>{`${copy.provider}: ${provider}`}</span> : <span />}
                    {article.url ? (
                      <a href={article.url} target="_blank" rel="noreferrer">
                        {copy.readArticle}
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
