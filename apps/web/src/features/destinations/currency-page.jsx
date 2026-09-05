'use client';

import { getCurrencyDisplayName, normalizeCurrencyCode } from '@attravoya/localization';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Coins,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { readPreferences, savePreferences } from '../../lib/preferences.js';
import { getCurrencyPageCopy } from './currency-page-copy.js';
import { buildDestinationHref } from './destination-route.js';
import styles from './currency-page.module.css';

/**
 * @typedef {object} CurrencyDestination
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
 * @typedef {object} CountryCurrency
 * @property {string} code
 * @property {string|null} name
 * @property {string|null} symbol
 * @property {number|null} decimalDigits
 * @property {boolean} isPrimary
 */

/**
 * @typedef {object} RateRow
 * @property {string} quote
 * @property {number} rate
 * @property {string|null} date
 */

/**
 * @typedef {object} CurrencyContext
 * @property {CountryCurrency[]} countryCurrencies
 * @property {CountryCurrency|null} targetCurrency
 * @property {string[]} supportedCurrencies
 * @property {string} defaultFrom
 * @property {string|null} provider
 * @property {Date|null} fetchedAt
 * @property {RateRow[]} rates
 */

/** @typedef {{status:'idle'|'loading'|'success'|'empty'|'unsupported'|'error', data:CurrencyContext|null}} ContextState */
/** @typedef {{status:'idle'|'loading'|'success'|'invalid'|'error', data:any}} ConversionState */

function textValue(value, maxLength = 200) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function currencyCode(value) {
  const normalized = normalizeCurrencyCode(value);
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeCountryCurrency(value) {
  const code = currencyCode(value?.code);
  if (!code) return null;
  const decimalDigits = Number(value?.decimalDigits);

  return {
    code,
    name: textValue(value?.name),
    symbol: textValue(value?.symbol, 24),
    decimalDigits:
      Number.isInteger(decimalDigits) && decimalDigits >= 0 && decimalDigits <= 6
        ? decimalDigits
        : null,
    isPrimary: value?.isPrimary === true,
  };
}

function normalizeRatesResponse(response, expectedBase) {
  const currency = response?.currency;
  const base = currencyCode(currency?.base);
  const provider = textValue(currency?.provider, 80);
  if (
    base !== expectedBase ||
    !provider ||
    currency?.approximate !== true ||
    !Array.isArray(currency?.rates)
  ) {
    return null;
  }

  const rates = currency.rates
    .map((row) => {
      const quote = currencyCode(row?.quote);
      const rate = finitePositive(row?.rate);
      if (!quote || rate === null) return null;
      return {
        quote,
        rate,
        date: textValue(row?.date, 32),
      };
    })
    .filter(Boolean);

  const supportedCurrencies = [...new Set([base, ...rates.map((row) => row.quote)])].sort();
  return {
    provider,
    fetchedAt: safeDate(currency?.fetchedAt),
    rates,
    supportedCurrencies,
  };
}

function chooseDefaultFrom(supportedCurrencies, targetCurrency) {
  const savedCurrency = currencyCode(readPreferences().currency);
  if (savedCurrency && supportedCurrencies.includes(savedCurrency)) return savedCurrency;
  if (supportedCurrencies.includes('EUR')) return 'EUR';
  return supportedCurrencies.find((code) => code !== targetCurrency) ?? targetCurrency;
}

/**
 * @param {string} countryCode
 * @returns {Promise<ContextState>}
 */
async function requestCurrencyContext(countryCode) {
  try {
    const response = await apiClient.getCountries();
    const countries = Array.isArray(response?.countries) ? response.countries : [];
    const country = countries.find(
      (candidate) =>
        String(candidate?.iso2 ?? '')
          .trim()
          .toUpperCase() === countryCode,
    );
    const countryCurrencies = (Array.isArray(country?.currencies) ? country.currencies : [])
      .map(normalizeCountryCurrency)
      .filter(Boolean)
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));

    if (countryCurrencies.length === 0) {
      return {
        status: 'empty',
        data: {
          countryCurrencies: [],
          targetCurrency: null,
          supportedCurrencies: [],
          defaultFrom: 'EUR',
          provider: null,
          fetchedAt: null,
          rates: [],
        },
      };
    }

    for (const candidate of countryCurrencies) {
      try {
        const ratesResponse = await apiClient.getCurrencyRates({ base: candidate.code });
        const normalized = normalizeRatesResponse(ratesResponse, candidate.code);
        if (!normalized) continue;

        return {
          status: 'success',
          data: {
            countryCurrencies,
            targetCurrency: candidate,
            supportedCurrencies: normalized.supportedCurrencies,
            defaultFrom: chooseDefaultFrom(normalized.supportedCurrencies, candidate.code),
            provider: normalized.provider,
            fetchedAt: normalized.fetchedAt,
            rates: normalized.rates,
          },
        };
      } catch {
        // A country can have more than one legal currency. Try another verified
        // country-reference currency before declaring provider rates unavailable.
      }
    }

    return {
      status: 'unsupported',
      data: {
        countryCurrencies,
        targetCurrency: countryCurrencies[0],
        supportedCurrencies: [],
        defaultFrom: 'EUR',
        provider: null,
        fetchedAt: null,
        rates: [],
      },
    };
  } catch {
    return { status: 'error', data: null };
  }
}

/**
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 * @returns {Promise<ConversionState>}
 */
async function requestConversion(amount, from, to) {
  try {
    const response = await apiClient.convertCurrency({ amount, from, to });
    const conversion = response?.conversion;
    const responseFrom = currencyCode(conversion?.from);
    const responseTo = currencyCode(conversion?.to);
    const rate = finitePositive(conversion?.rate);
    const convertedAmount = Number(conversion?.convertedAmount);
    const provider = textValue(conversion?.provider, 80);

    if (
      responseFrom !== from ||
      responseTo !== to ||
      conversion?.approximate !== true ||
      rate === null ||
      !Number.isFinite(convertedAmount) ||
      convertedAmount < 0 ||
      !provider
    ) {
      return { status: 'error', data: null };
    }

    return {
      status: 'success',
      data: {
        provider,
        amount,
        from,
        to,
        rate,
        convertedAmount,
        rateDate: textValue(conversion?.rateDate, 32),
        fetchedAt: safeDate(conversion?.fetchedAt),
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
  if (normalized === 'frankfurter') return 'Frankfurter';
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '—';
}

/**
 * @param {object} props
 * @param {CurrencyDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function CurrencyDestinationPage({ destination, locale = 'en', messages }) {
  const copy = getCurrencyPageCopy(locale);
  const [contextState, setContextState] = useState(
    /** @type {ContextState} */ ({
      status: destination ? 'loading' : 'idle',
      data: null,
    }),
  );
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [amount, setAmount] = useState('100');
  const [conversionState, setConversionState] = useState(
    /** @type {ConversionState} */ ({ status: 'idle', data: null }),
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  );
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }),
    [locale],
  );

  useEffect(() => {
    if (!destination) return;
    let active = true;

    void requestCurrencyContext(destination.countryCode).then((nextState) => {
      if (!active) return;
      setContextState(nextState);
      setConversionState({ status: 'idle', data: null });
      if (nextState.status === 'success' && nextState.data) {
        setFromCurrency(nextState.data.defaultFrom);
      }
    });

    return () => {
      active = false;
    };
  }, [destination]);

  function retryContext() {
    if (!destination) return;
    setContextState({ status: 'loading', data: null });
    setConversionState({ status: 'idle', data: null });
    void requestCurrencyContext(destination.countryCode).then((nextState) => {
      setContextState(nextState);
      if (nextState.status === 'success' && nextState.data) {
        setFromCurrency(nextState.data.defaultFrom);
      }
    });
  }

  function handleFromChange(event) {
    const nextCurrency = currencyCode(event.target.value);
    if (!nextCurrency) return;
    setFromCurrency(nextCurrency);
    savePreferences({ currency: nextCurrency });
    setConversionState({ status: 'idle', data: null });
  }

  function handleAmountChange(event) {
    setAmount(event.target.value);
    setConversionState({ status: 'idle', data: null });
  }

  async function convert(event) {
    event?.preventDefault?.();
    const targetCurrency = contextState.data?.targetCurrency?.code ?? null;
    const numericAmount = Number(amount);
    if (
      !targetCurrency ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      numericAmount > 100_000_000
    ) {
      setConversionState({ status: 'invalid', data: null });
      return;
    }

    setConversionState({ status: 'loading', data: null });
    setConversionState(await requestConversion(numericAmount, fromCurrency, targetCurrency));
  }

  function currencyName(code) {
    return getCurrencyDisplayName(code, locale) ?? code;
  }

  function formatMoney(value, code) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'code',
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${numberFormatter.format(value)} ${code}`;
    }
  }

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="currency-unavailable-title">
        <div className={`shell ${styles.stateShell}`}>
          <Coins size={34} aria-hidden="true" />
          <h1 id="currency-unavailable-title">{messages.common.unavailable}</h1>
          <p>{copy.ratesUnavailable}</p>
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
  const targetCurrency = context?.targetCurrency ?? null;
  const conversion = conversionState.data;

  return (
    <section className={styles.page} aria-labelledby="currency-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href={backHref}>
          <ArrowLeft size={17} aria-hidden="true" />
          {copy.back}
        </Link>

        <header className={styles.hero}>
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1 id="currency-title">{destinationText(copy.title, destination.name)}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className={styles.countryBadge}>
            <Coins size={19} aria-hidden="true" />
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
            <Coins size={28} aria-hidden="true" />
            <strong>{messages.common.unavailable}</strong>
            <span>{copy.ratesUnavailable}</span>
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
            <Coins size={28} aria-hidden="true" />
            <span>{copy.noCurrency}</span>
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

        {context && context.countryCurrencies.length > 0 ? (
          <section
            className={styles.currencyReference}
            aria-labelledby="destination-currencies-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <span className="eyebrow">{destination.countryDisplayName}</span>
                <h2 id="destination-currencies-title">{copy.destinationCurrencies}</h2>
              </div>
              {context.provider ? (
                <span className={styles.providerBadge}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {copy.provider}: {providerDisplayName(context.provider)}
                </span>
              ) : null}
            </div>

            <div className={styles.currencyList}>
              {context.countryCurrencies.map((currency) => (
                <article className={styles.currencyCard} key={currency.code}>
                  <div className={styles.currencySymbol} aria-hidden="true">
                    {currency.symbol ?? currency.code}
                  </div>
                  <div>
                    <h3>{currencyName(currency.code)}</h3>
                    <p>{currency.code}</p>
                  </div>
                  {currency.isPrimary ? (
                    <span className={styles.primary}>{copy.primary}</span>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {contextState.status === 'unsupported' ? (
          <div className={styles.feedback} role="status">
            <Coins size={28} aria-hidden="true" />
            <span>{copy.ratesUnavailable}</span>
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

        {contextState.status === 'success' && context && targetCurrency ? (
          <div className={styles.workspace}>
            <form className={styles.converter} onSubmit={convert}>
              <div className={styles.converterHeading}>
                <span className={styles.converterIcon} aria-hidden="true">
                  <ArrowRightLeft size={21} />
                </span>
                <div>
                  <h2>{copy.converterTitle}</h2>
                  <p>{copy.preferenceApplied}</p>
                </div>
              </div>

              <div className={styles.fields}>
                <label>
                  <span>{copy.amount}</span>
                  <input
                    inputMode="decimal"
                    min="0.01"
                    max="100000000"
                    step="any"
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                  />
                </label>

                <label>
                  <span>{copy.from}</span>
                  <select value={fromCurrency} onChange={handleFromChange}>
                    {context.supportedCurrencies.map((code) => (
                      <option key={code} value={code}>
                        {code} · {currencyName(code)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.targetField}>
                  <span>{copy.to}</span>
                  <strong>{targetCurrency.code}</strong>
                  <small>{currencyName(targetCurrency.code)}</small>
                </div>
              </div>

              <button
                className="button button--accent"
                type="submit"
                disabled={conversionState.status === 'loading'}
              >
                {conversionState.status === 'loading' ? (
                  <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
                ) : (
                  <ArrowRightLeft size={17} aria-hidden="true" />
                )}
                {copy.convert}
              </button>

              {conversionState.status === 'invalid' ? (
                <p className={styles.formError} role="alert">
                  {copy.invalidAmount}
                </p>
              ) : null}

              {conversionState.status === 'error' ? (
                <div className={styles.conversionError} role="alert">
                  <span>{copy.conversionUnavailable}</span>
                  <button
                    className="button button--secondary button--compact"
                    type="button"
                    onClick={convert}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    {messages.common.retry}
                  </button>
                </div>
              ) : null}

              {conversionState.status === 'success' && conversion ? (
                <div className={styles.result} aria-live="polite">
                  <span>{copy.indicative}</span>
                  <strong>{formatMoney(conversion.convertedAmount, conversion.to)}</strong>
                  <p>
                    1 {conversion.from} = {numberFormatter.format(conversion.rate)} {conversion.to}
                  </p>
                  <dl>
                    <div>
                      <dt>{copy.provider}</dt>
                      <dd>{providerDisplayName(conversion.provider)}</dd>
                    </div>
                    <div>
                      <dt>{copy.rateDate}</dt>
                      <dd>
                        {conversion.rateDate
                          ? dateFormatter.format(new Date(`${conversion.rateDate}T00:00:00Z`))
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </form>

            <aside className={styles.disclaimer}>
              <Coins size={24} aria-hidden="true" />
              <div>
                <strong>{copy.indicative}</strong>
                <p>{copy.disclaimer}</p>
                <dl>
                  <div>
                    <dt>{copy.provider}</dt>
                    <dd>{providerDisplayName(context.provider)}</dd>
                  </div>
                  <div>
                    <dt>{copy.rateDate}</dt>
                    <dd>{context.fetchedAt ? dateTimeFormatter.format(context.fetchedAt) : '—'}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}
