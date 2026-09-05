'use client';

import { getLanguageDisplayName } from '@attravoya/localization';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Languages,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { getLanguagePageCopy } from './language-page-copy.js';
import { buildDestinationHref } from './destination-route.js';
import styles from './language-page.module.css';

/**
 * @typedef {object} LanguageDestination
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

/**
 * @typedef {object} CountryLanguage
 * @property {string} code
 * @property {string|null} name
 * @property {string|null} nativeName
 * @property {'ltr'|'rtl'} direction
 * @property {boolean} isOfficial
 * @property {boolean} isCommon
 * @property {number} rank
 */

/**
 * @typedef {object} LanguageContext
 * @property {CountryLanguage[]} languages
 * @property {'ready'|'unsupported'|'error'} translatorStatus
 * @property {string[]} supportedTargets
 * @property {string|null} provider
 * @property {Date|null} fetchedAt
 */

/** @typedef {{status:'idle'|'loading'|'success'|'empty'|'error', data:LanguageContext|null}} ContextState */
/** @typedef {{status:'idle'|'loading'|'success'|'invalid'|'error', data:any}} TranslationState */

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

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeCountryLanguage(value) {
  const code = languageCode(value?.code);
  if (!code) return null;
  const rank = Number(value?.rank);

  return {
    code,
    name: textValue(value?.name, 160),
    nativeName: textValue(value?.nativeName, 160),
    direction: value?.direction === 'rtl' ? 'rtl' : 'ltr',
    isOfficial: value?.isOfficial === true,
    isCommon: value?.isCommon === true,
    rank: Number.isInteger(rank) && rank >= 0 && rank <= 1000 ? rank : 1000,
  };
}

function normalizeCountryLanguages(country) {
  const rows = (Array.isArray(country?.languages) ? country.languages : [])
    .map(normalizeCountryLanguage)
    .filter(Boolean);
  const byCode = new Map();

  for (const language of rows) {
    const existing = byCode.get(language.code);
    if (!existing || language.rank < existing.rank) byCode.set(language.code, language);
  }

  return [...byCode.values()].sort(
    (left, right) =>
      left.rank - right.rank ||
      Number(right.isOfficial) - Number(left.isOfficial) ||
      Number(right.isCommon) - Number(left.isCommon) ||
      left.code.localeCompare(right.code),
  );
}

function normalizeTranslationSupport(response) {
  const translation = response?.translation;
  const provider = textValue(translation?.provider, 80);
  if (!provider || !Array.isArray(translation?.languages)) return null;

  const supportedCodes = [
    ...new Set(translation.languages.map((row) => languageCode(row?.code)).filter(Boolean)),
  ];

  return {
    provider,
    fetchedAt: safeDate(translation?.fetchedAt),
    supportedCodes,
  };
}

/**
 * @param {string} countryCode
 * @returns {Promise<ContextState>}
 */
async function requestLanguageContext(countryCode) {
  try {
    const response = await apiClient.getCountries();
    const countries = Array.isArray(response?.countries) ? response.countries : [];
    const country = countries.find(
      (candidate) =>
        String(candidate?.iso2 ?? '')
          .trim()
          .toUpperCase() === countryCode,
    );
    const languages = normalizeCountryLanguages(country);

    if (languages.length === 0) {
      return {
        status: 'empty',
        data: {
          languages: [],
          translatorStatus: 'unsupported',
          supportedTargets: [],
          provider: null,
          fetchedAt: null,
        },
      };
    }

    try {
      const supportResponse = await apiClient.getTranslationLanguages();
      const support = normalizeTranslationSupport(supportResponse);
      if (!support) {
        return {
          status: 'success',
          data: {
            languages,
            translatorStatus: 'error',
            supportedTargets: [],
            provider: null,
            fetchedAt: null,
          },
        };
      }

      const supportedTargets = languages
        .filter((language) => support.supportedCodes.includes(language.code))
        .map((language) => language.code);

      return {
        status: 'success',
        data: {
          languages,
          translatorStatus: supportedTargets.length > 0 ? 'ready' : 'unsupported',
          supportedTargets,
          provider: support.provider,
          fetchedAt: support.fetchedAt,
        },
      };
    } catch {
      return {
        status: 'success',
        data: {
          languages,
          translatorStatus: 'error',
          supportedTargets: [],
          provider: null,
          fetchedAt: null,
        },
      };
    }
  } catch {
    return { status: 'error', data: null };
  }
}

/**
 * @param {string} text
 * @param {string} target
 * @returns {Promise<TranslationState>}
 */
async function requestTranslation(text, target) {
  try {
    const response = await apiClient.translateText({ text, source: 'auto', target });
    const translation = response?.translation;
    const responseTarget = languageCode(translation?.target);
    const translatedText = textValue(translation?.translatedText, 12_000);
    const provider = textValue(translation?.provider, 80);

    if (responseTarget !== target || !translatedText || !provider) {
      return { status: 'error', data: null };
    }

    return {
      status: 'success',
      data: {
        target,
        translatedText,
        provider,
        fetchedAt: safeDate(translation?.fetchedAt),
        detectedLanguage: languageCode(translation?.detectedLanguage?.code),
      },
    };
  } catch {
    return { status: 'error', data: null };
  }
}

function destinationText(template, destinationName) {
  return template.replace('{destination}', destinationName);
}

function providerDisplayName(provider) {
  const normalized = String(provider ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'libretranslate') return 'LibreTranslate';
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '—';
}

/**
 * @param {object} props
 * @param {LanguageDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function LanguageDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getLanguagePageCopy(locale);
  const [contextState, setContextState] = useState(
    /** @type {ContextState} */ ({
      status: destination ? 'loading' : 'idle',
      data: null,
    }),
  );
  const [targetLanguage, setTargetLanguage] = useState('');
  const [phrase, setPhrase] = useState('');
  const [translationState, setTranslationState] = useState(
    /** @type {TranslationState} */ ({ status: 'idle', data: null }),
  );

  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  useEffect(() => {
    if (!destination) return;
    let active = true;

    void requestLanguageContext(destination.countryCode).then((nextState) => {
      if (!active) return;
      setContextState(nextState);
      setTranslationState({ status: 'idle', data: null });
      setTargetLanguage(nextState.data?.supportedTargets?.[0] ?? '');
    });

    return () => {
      active = false;
    };
  }, [destination]);

  function retryContext() {
    if (!destination) return;
    setContextState({ status: 'loading', data: null });
    setTranslationState({ status: 'idle', data: null });
    setTargetLanguage('');
    void requestLanguageContext(destination.countryCode).then((nextState) => {
      setContextState(nextState);
      setTargetLanguage(nextState.data?.supportedTargets?.[0] ?? '');
    });
  }

  function handleTargetChange(event) {
    const nextTarget = languageCode(event.target.value);
    if (!nextTarget || !contextState.data?.supportedTargets.includes(nextTarget)) return;
    setTargetLanguage(nextTarget);
    setTranslationState({ status: 'idle', data: null });
  }

  function handlePhraseChange(event) {
    setPhrase(event.target.value);
    setTranslationState({ status: 'idle', data: null });
  }

  async function translate(event) {
    event?.preventDefault?.();
    const normalizedPhrase = phrase.trim();
    if (
      normalizedPhrase.length < 1 ||
      normalizedPhrase.length > 3000 ||
      !targetLanguage ||
      !contextState.data?.supportedTargets.includes(targetLanguage)
    ) {
      setTranslationState({ status: 'invalid', data: null });
      return;
    }

    setTranslationState({ status: 'loading', data: null });
    setTranslationState(await requestTranslation(normalizedPhrase, targetLanguage));
  }

  function languageName(code) {
    return getLanguageDisplayName(code, locale) ?? code;
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="language-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <Languages size={34} aria-hidden="true" />
          <h1 id="language-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.referenceUnavailable}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const context = contextState.data;
  const backHref = buildDestinationHref(destination);
  const translation = translationState.data;
  const targetReference = context?.languages.find((language) => language.code === targetLanguage);

  return (
    <section className={styles.page} aria-labelledby="language-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="language-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.countryBadge}>
            <Languages size={19} aria-hidden="true" />
            <span>{destination.countryDisplayName}</span>
          </div>
        </header>

        {contextState.status === 'loading' || contextState.status === 'idle' ? (
          <div className={styles.feedback} role="status" aria-live="polite">
            <LoaderCircle className={styles.spin} size={27} aria-hidden="true" />
            <span>{messages.common.loading}</span>
          </div>
        ) : null}

        {contextState.status === 'error' ? (
          <div className={styles.feedback} role="alert">
            <Languages size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.referenceUnavailable}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryContext}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {contextState.status === 'empty' ? (
          <div className={styles.feedback} role="status">
            <Languages size={28} aria-hidden="true" />
            <span>{copy.noLanguages}</span>
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={retryContext}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {messages.common.retry}
            </button>
          </div>
        ) : null}

        {contextState.status === 'success' && context ? (
          <>
            <section className={styles.reference} aria-labelledby="destination-languages-title">
              <div className={styles.sectionHeading}>
                <div>
                  <span className="eyebrow">{destination.countryDisplayName}</span>
                  <h2 id="destination-languages-title">{copy.languagesTitle}</h2>
                </div>
              </div>

              <div className={styles.languageGrid}>
                {context.languages.map((language) => (
                  <article className={styles.languageCard} key={language.code}>
                    <div className={styles.languageIcon} aria-hidden="true">
                      {language.code.toUpperCase()}
                    </div>
                    <div className={styles.languageText}>
                      <h3>{languageName(language.code)}</h3>
                      <p dir={language.direction}>
                        {language.nativeName ?? language.name ?? language.code}
                      </p>
                    </div>
                    <div className={styles.badges}>
                      {language.isOfficial ? (
                        <span className={styles.badge}>
                          <CheckCircle2 size={14} aria-hidden="true" />
                          {copy.official}
                        </span>
                      ) : null}
                      {language.isCommon ? <span className={styles.badge}>{copy.common}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {context.translatorStatus === 'error' ? (
              <div className={styles.feedback} role="alert">
                <MessageSquareText size={28} aria-hidden="true" />
                <span>{copy.supportUnavailable}</span>
                <button
                  className="button button--secondary button--compact"
                  type="button"
                  onClick={retryContext}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  {messages.common.retry}
                </button>
              </div>
            ) : null}

            {context.translatorStatus === 'unsupported' ? (
              <div className={styles.feedback} role="status">
                <MessageSquareText size={28} aria-hidden="true" />
                <span>{copy.unsupported}</span>
              </div>
            ) : null}

            {context.translatorStatus === 'ready' ? (
              <div className={styles.workspace}>
                <form className={styles.translator} onSubmit={translate}>
                  <div className={styles.translatorHeading}>
                    <span className={styles.translatorIcon} aria-hidden="true">
                      <MessageSquareText size={22} />
                    </span>
                    <div>
                      <h2>{copy.translatorTitle}</h2>
                      <p>{copy.translatorIntro}</p>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>{copy.targetLanguage}</span>
                    <select value={targetLanguage} onChange={handleTargetChange}>
                      {context.supportedTargets.map((code) => (
                        <option key={code} value={code}>
                          {languageName(code)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>{copy.phrase}</span>
                    <textarea
                      maxLength={3000}
                      placeholder={copy.placeholder}
                      rows={5}
                      value={phrase}
                      onChange={handlePhraseChange}
                    />
                  </label>

                  <button
                    className="button button--accent"
                    type="submit"
                    disabled={translationState.status === 'loading'}
                  >
                    {translationState.status === 'loading' ? (
                      <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
                    ) : (
                      <MessageSquareText size={17} aria-hidden="true" />
                    )}
                    {copy.translate}
                  </button>

                  {translationState.status === 'invalid' ? (
                    <p className={styles.formError} role="alert">
                      {copy.invalidText}
                    </p>
                  ) : null}

                  {translationState.status === 'error' ? (
                    <div className={styles.translationError} role="alert">
                      <span>{copy.translationUnavailable}</span>
                      <button
                        className="button button--secondary button--compact"
                        type="button"
                        onClick={translate}
                      >
                        <RefreshCw size={15} aria-hidden="true" />
                        {messages.common.retry}
                      </button>
                    </div>
                  ) : null}

                  {translationState.status === 'success' && translation ? (
                    <div className={styles.result} aria-live="polite">
                      <span>{copy.machineTranslation}</span>
                      <strong dir={targetReference?.direction ?? 'ltr'}>
                        {translation.translatedText}
                      </strong>
                      <dl>
                        <div>
                          <dt>{copy.provider}</dt>
                          <dd>{providerDisplayName(translation.provider)}</dd>
                        </div>
                        {translation.detectedLanguage ? (
                          <div>
                            <dt>{copy.detectedLanguage}</dt>
                            <dd>{languageName(translation.detectedLanguage)}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  ) : null}
                </form>

                <aside className={styles.disclaimer}>
                  <MessageSquareText size={24} aria-hidden="true" />
                  <div>
                    <strong>{copy.machineTranslation}</strong>
                    <p>{copy.privacy}</p>
                    <dl>
                      <div>
                        <dt>{copy.provider}</dt>
                        <dd>{providerDisplayName(context.provider)}</dd>
                      </div>
                      <div>
                        <dt>{copy.fetchedAt}</dt>
                        <dd>
                          {context.fetchedAt ? dateTimeFormatter.format(context.fetchedAt) : '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </aside>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
