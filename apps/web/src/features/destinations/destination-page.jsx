'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BedDouble,
  BusFront,
  CameraOff,
  CloudRain,
  CloudSun,
  Coins,
  Compass,
  HeartHandshake,
  Languages,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  Wind,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client.js';
import { getDestinationPageCopy } from './destination-page-copy.js';
import {
  buildDestinationChildHref,
  buildDestinationContextHref,
} from './destination-route.js';
import styles from './destination-page.module.css';

/**
 * @typedef {object} DestinationPageDestination
 * @property {string|null|undefined} provider
 * @property {string|null|undefined} externalId
 * @property {string} name
 * @property {string|null|undefined} state
 * @property {string} countryCode
 * @property {string} countryDisplayName
 * @property {number} latitude
 * @property {number} longitude
 * @property {string|null|undefined} timeZone
 * @property {string} slug
 */

/** @typedef {{status: 'idle'|'loading'|'success'|'empty'|'error', data: any}} ProviderState */

/** @param {string|null|undefined} provider */
function providerDisplayName(provider) {
  const value = String(provider ?? '').trim().toLowerCase();
  if (value === 'geoapify') return 'Geoapify';
  if (value === 'openmeteo') return 'Open-Meteo';
  if (value === 'pexels') return 'Pexels';
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : null;
}

/** @param {any} photo */
function pexelsImageSource(photo) {
  const candidate =
    photo?.sources?.large2x ??
    photo?.sources?.large ??
    photo?.sources?.landscape ??
    photo?.sources?.medium;
  if (!candidate) return null;

  try {
    const url = new URL(String(candidate));
    return url.protocol === 'https:' && url.hostname === 'images.pexels.com' ? String(candidate) : null;
  } catch {
    return null;
  }
}

/** @param {unknown} value */
function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * @param {Intl.NumberFormat} numberFormatter
 * @param {unknown} value
 * @param {string} unit
 */
function measurement(numberFormatter, value, unit) {
  const number = finiteNumber(value);
  return number === null ? '—' : `${numberFormatter.format(number)} ${unit}`;
}

/** @param {{href: string, icon: any, label: string}} props */
function FeatureLink({ href, icon: Icon, label }) {
  return (
    <Link className={styles.featureLink} href={href}>
      <span className={styles.featureIcon} aria-hidden="true">
        <Icon size={21} />
      </span>
      <strong>{label}</strong>
      <Navigation className={styles.featureArrow} size={17} aria-hidden="true" />
    </Link>
  );
}

/**
 * @param {object} props
 * @param {DestinationPageDestination|null} props.destination
 * @param {string} [props.locale]
 * @param {any} props.messages
 */
export function DestinationPage({ destination, locale = 'en', messages }) {
  const copy = getDestinationPageCopy(locale);
  const [weatherState, setWeatherState] = useState(
    /** @type {ProviderState} */ ({ status: 'idle', data: null }),
  );
  const [imageState, setImageState] = useState(
    /** @type {ProviderState} */ ({ status: 'idle', data: null }),
  );

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const coordinateFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }),
    [locale],
  );

  const loadWeather = useCallback(async () => {
    if (!destination) return;
    setWeatherState({ status: 'loading', data: null });

    try {
      const response = /** @type {any} */ (
        await apiClient.getWeather({
          latitude: destination.latitude,
          longitude: destination.longitude,
          forecastDays: 4,
          timezone: destination.timeZone ?? 'auto',
        })
      );
      const weather = response?.weather ?? null;
      const temperature = finiteNumber(weather?.current?.temperatureC);
      setWeatherState({
        status: weather && temperature !== null ? 'success' : 'empty',
        data: weather,
      });
    } catch {
      setWeatherState({ status: 'error', data: null });
    }
  }, [destination]);

  const loadImage = useCallback(async () => {
    if (!destination) return;
    setImageState({ status: 'loading', data: null });

    try {
      const response = /** @type {any} */ (
        await apiClient.searchImages({
          query: [destination.name, destination.countryDisplayName].filter(Boolean).join(' '),
          orientation: 'landscape',
          perPage: 1,
        })
      );
      const images = response?.images ?? null;
      const photo = images?.photos?.[0] ?? null;
      const source = pexelsImageSource(photo);
      setImageState({
        status: photo && source ? 'success' : 'empty',
        data: photo && source ? { images, photo, source } : null,
      });
    } catch {
      setImageState({ status: 'error', data: null });
    }
  }, [destination]);

  useEffect(() => {
    if (!destination) return;
    void loadWeather();
    void loadImage();
  }, [destination, loadImage, loadWeather]);

  if (!destination) {
    return (
      <section className={styles.page} aria-labelledby="destination-unavailable-title">
        <div className={`shell ${styles.emptyShell}`}>
          <MapPin size={34} aria-hidden="true" />
          <h1 id="destination-unavailable-title">{messages.common.unavailable}</h1>
          <p>{messages.search.destinationQuestion}</p>
          <Link className="button button--accent" href="/destinations">
            <ArrowLeft size={17} aria-hidden="true" />
            {messages.home.exploreCta}
          </Link>
        </div>
      </section>
    );
  }

  const sourceName = providerDisplayName(destination.provider);
  const weather = weatherState.data;
  const currentWeather = weather?.current;
  const imageData = imageState.data;
  const featureLinks = [
    {
      href: buildDestinationContextHref('/accommodation', destination),
      icon: BedDouble,
      label: messages.navigation.stays,
    },
    {
      href: buildDestinationChildHref(destination, 'attractions'),
      icon: Sparkles,
      label: messages.navigation.thingsToDo,
    },
    {
      href: buildDestinationContextHref('/nearby', destination),
      icon: Compass,
      label: messages.navigation.nearby,
    },
    {
      href: buildDestinationChildHref(destination, 'family'),
      icon: HeartHandshake,
      label: copy.family,
    },
    {
      href: buildDestinationChildHref(destination, 'currency'),
      icon: Coins,
      label: messages.common.chooseCurrency,
    },
    {
      href: buildDestinationChildHref(destination, 'language'),
      icon: Languages,
      label: messages.common.chooseLanguage,
    },
    {
      href: buildDestinationContextHref('/transport', destination),
      icon: BusFront,
      label: copy.transport,
    },
    {
      href: buildDestinationChildHref(destination, 'safety'),
      icon: ShieldCheck,
      label: messages.safety.title,
    },
  ];

  return (
    <section className={styles.page} aria-labelledby="destination-title">
      <div className={`shell ${styles.shell}`}>
        <Link className={styles.backLink} href="/destinations">
          <ArrowLeft size={17} aria-hidden="true" />
          {messages.home.exploreCta}
        </Link>

        <div className={styles.heroGrid}>
          <div className={styles.imagePanel}>
            {imageState.status === 'success' && imageData ? (
              <>
                <Image
                  className={styles.heroImage}
                  src={imageData.source}
                  alt={imageData.photo.alt ?? `${destination.name}, ${destination.countryDisplayName}`}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 58vw"
                />
                <div className={styles.imageShade} aria-hidden="true" />
                <div className={styles.attribution}>
                  {imageData.photo.photographer?.profileUrl && imageData.photo.photographer?.name ? (
                    <a
                      href={imageData.photo.photographer.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {imageData.photo.photographer.name}
                    </a>
                  ) : null}
                  {imageData.images.attribution?.providerUrl ? (
                    <a href={imageData.images.attribution.providerUrl} target="_blank" rel="noreferrer">
                      Pexels
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <div className={styles.imageState} aria-live="polite">
                {imageState.status === 'loading' || imageState.status === 'idle' ? (
                  <LoaderCircle className={styles.spin} size={28} aria-hidden="true" />
                ) : (
                  <CameraOff size={30} aria-hidden="true" />
                )}
                <span>
                  {imageState.status === 'loading' || imageState.status === 'idle'
                    ? messages.common.loading
                    : messages.common.unavailable}
                </span>
                {imageState.status === 'error' || imageState.status === 'empty' ? (
                  <button
                    className="button button--secondary button--compact"
                    type="button"
                    onClick={() => void loadImage()}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    {messages.common.retry}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className={styles.destinationCard}>
            <span className="eyebrow">{messages.navigation.explore}</span>
            <h1 id="destination-title">{destination.name}</h1>
            <p className={styles.locationLine}>
              <MapPin size={18} aria-hidden="true" />
              {[destination.state, destination.countryDisplayName].filter(Boolean).join(' · ')}
            </p>
            <div className={styles.metaRow}>
              <span>
                {coordinateFormatter.format(destination.latitude)}, {' '}
                {coordinateFormatter.format(destination.longitude)}
              </span>
              {sourceName ? <span>{sourceName}</span> : null}
              {destination.externalId ? <span>{destination.externalId}</span> : null}
            </div>
          </div>
        </div>

        <section
          className={styles.weatherCard}
          aria-labelledby="destination-weather-title"
          aria-live="polite"
        >
          <div className={styles.weatherHeading}>
            <span className={styles.weatherIcon} aria-hidden="true">
              <CloudSun size={24} />
            </span>
            <div>
              <h2 id="destination-weather-title">{copy.currentWeather}</h2>
              {weather?.provider ? <span>{providerDisplayName(weather.provider)}</span> : null}
            </div>
          </div>

          {weatherState.status === 'loading' || weatherState.status === 'idle' ? (
            <div className={styles.weatherState} role="status">
              <LoaderCircle className={styles.spin} size={23} aria-hidden="true" />
              {messages.common.loading}
            </div>
          ) : null}

          {weatherState.status === 'error' || weatherState.status === 'empty' ? (
            <div className={styles.weatherState} role="status">
              <CloudSun size={23} aria-hidden="true" />
              <span>{messages.common.unavailable}</span>
              <button
                className="button button--secondary button--compact"
                type="button"
                onClick={() => void loadWeather()}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {messages.common.retry}
              </button>
            </div>
          ) : null}

          {weatherState.status === 'success' && currentWeather ? (
            <div className={styles.weatherGrid}>
              <div className={styles.temperatureBlock}>
                <strong>{measurement(numberFormatter, currentWeather.temperatureC, '°C')}</strong>
                <span>
                  <ThermometerSun size={16} aria-hidden="true" />
                  {copy.feelsLike} {measurement(numberFormatter, currentWeather.feelsLikeC, '°C')}
                </span>
              </div>
              <div className={styles.weatherMetric}>
                <Wind size={19} aria-hidden="true" />
                <span>{copy.wind}</span>
                <strong>{measurement(numberFormatter, currentWeather.windSpeedKmh, 'km/h')}</strong>
              </div>
              <div className={styles.weatherMetric}>
                <CloudRain size={19} aria-hidden="true" />
                <span>{copy.precipitation}</span>
                <strong>{measurement(numberFormatter, currentWeather.precipitationMm, 'mm')}</strong>
              </div>
            </div>
          ) : null}
        </section>

        <nav className={styles.featureGrid} aria-label={destination.name}>
          {featureLinks.map((feature) => (
            <FeatureLink key={feature.href} {...feature} />
          ))}
        </nav>
      </div>
    </section>
  );
}
