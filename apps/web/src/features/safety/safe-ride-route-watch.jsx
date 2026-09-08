'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, LoaderCircle, MapPinned, Navigation, RefreshCw, ShieldCheck } from 'lucide-react';

import { createRouteWatchState, evaluateRoutePosition } from './route-deviation.js';
import { getSafeRideCopy } from './safe-ride-copy.js';
import styles from './safe-ride-route-watch.module.css';

const ETA_REFRESH_MS = 120_000;
const GEOLOCATION_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 12_000,
});

let googleMapsLoadPromise = null;

function browserWindow() {
  if (typeof window === 'undefined') return null;
  return /** @type {any} */ (window);
}

function browserNavigator() {
  if (typeof navigator === 'undefined') return null;
  return /** @type {any} */ (navigator);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePosition(position) {
  const latitude = finiteNumber(position?.coords?.latitude ?? position?.latitude);
  const longitude = finiteNumber(position?.coords?.longitude ?? position?.longitude);
  const accuracy = finiteNumber(position?.coords?.accuracy ?? position?.accuracy);
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude, accuracy: accuracy !== null && accuracy >= 0 ? accuracy : null };
}

function normalizePath(route) {
  const rows = Array.isArray(route?.path) ? route.path : [];
  return rows
    .slice(0, 10_000)
    .map((point) => {
      const latitude = finiteNumber(point?.lat ?? point?.latitude);
      const longitude = finiteNumber(point?.lng ?? point?.longitude);
      return latitude !== null && longitude !== null ? { latitude, longitude } : null;
    })
    .filter(Boolean);
}

function mapLatLng(position) {
  return { lat: position.latitude, lng: position.longitude };
}

function loadGoogleMaps(apiKey, locale) {
  const currentWindow = browserWindow();
  if (!currentWindow) return Promise.reject(new Error('Browser window unavailable.'));
  if (currentWindow.google?.maps?.importLibrary) return Promise.resolve(currentWindow.google.maps);
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const callbackName = '__attravoyaGoogleMapsReady';
    const existing = document.querySelector('script[data-attravoya-google-maps="true"]');

    currentWindow[callbackName] = () => {
      delete currentWindow[callbackName];
      if (currentWindow.google?.maps?.importLibrary) resolve(currentWindow.google.maps);
      else reject(new Error('Google Maps did not expose the expected library interface.'));
    };

    if (existing) return;

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: apiKey,
      loading: 'async',
      libraries: 'routes',
      callback: callbackName,
      v: 'weekly',
      language: locale,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.defer = true;
    script.dataset.attravoyaGoogleMaps = 'true';
    script.onerror = () => {
      delete currentWindow[callbackName];
      googleMapsLoadPromise = null;
      reject(new Error('Google Maps could not be loaded.'));
    };
    document.head.append(script);
  });

  return googleMapsLoadPromise;
}

async function computeRoute(googleMaps, origin, destination, includePath) {
  const { Route } = await googleMaps.importLibrary('routes');
  const fields = includePath
    ? ['path', 'distanceMeters', 'durationMillis', 'viewport']
    : ['distanceMeters', 'durationMillis'];
  const response = await Route.computeRoutes({
    origin: mapLatLng(origin),
    destination: mapLatLng(destination),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    fields,
  });
  const route = Array.isArray(response?.routes) ? response.routes[0] : null;
  const distanceMeters = finiteNumber(route?.distanceMeters);
  const durationMillis = finiteNumber(route?.durationMillis);
  if (!route || distanceMeters === null || durationMillis === null) return null;

  return {
    raw: route,
    distanceMeters,
    durationSeconds: durationMillis / 1000,
    path: includePath ? normalizePath(route) : [],
  };
}

function getCurrentPosition(geolocation) {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
  });
}

function formatDistance(formatter, meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters >= 1000) return `${formatter.format(meters / 1000)} km`;
  return `${formatter.format(Math.round(meters))} m`;
}

/**
 * @param {object} props
 * @param {{name:string, latitude:number, longitude:number}} props.destination
 * @param {string} [props.locale]
 * @param {string} [props.googleMapsBrowserKey]
 * @param {boolean} [props.enabled]
 */
export function SafeRideRouteWatch({
  destination,
  locale = 'en',
  googleMapsBrowserKey = '',
  enabled = false,
}) {
  const copy = getSafeRideCopy(locale);
  const configured = enabled && Boolean(googleMapsBrowserKey.trim());
  const mapNodeRef = useRef(null);
  const mapRef = useRef(/** @type {any} */ (null));
  const googleMapsRef = useRef(/** @type {any} */ (null));
  const routePolylinesRef = useRef(/** @type {any[]} */ ([]));
  const currentCircleRef = useRef(/** @type {any} */ (null));
  const destinationCircleRef = useRef(/** @type {any} */ (null));
  const watchIdRef = useRef(/** @type {number|null} */ (null));
  const etaTimerRef = useRef(/** @type {ReturnType<typeof setInterval>|null} */ (null));
  const expectedPathRef = useRef(/** @type {any[]} */ ([]));
  const latestPositionRef = useRef(/** @type {any} */ (null));
  const routeWatchRef = useRef(createRouteWatchState());
  const etaRefreshInFlightRef = useRef(false);

  const [status, setStatus] = useState(configured ? 'idle' : 'not-configured');
  const [routeMetrics, setRouteMetrics] = useState(
    /** @type {{distanceMeters:number, durationSeconds:number}|null} */ (null),
  );
  const [watchState, setWatchState] = useState(createRouteWatchState());
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );

  function clearLocationWatch() {
    const geolocation = browserNavigator()?.geolocation;
    if (watchIdRef.current !== null && geolocation?.clearWatch) {
      geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    if (etaTimerRef.current) clearInterval(etaTimerRef.current);
    etaTimerRef.current = null;
  }

  function clearMapObjects() {
    routePolylinesRef.current.forEach((polyline) => polyline?.setMap?.(null));
    routePolylinesRef.current = [];
    currentCircleRef.current?.setMap?.(null);
    destinationCircleRef.current?.setMap?.(null);
    currentCircleRef.current = null;
    destinationCircleRef.current = null;
    mapRef.current = null;
    googleMapsRef.current = null;
    expectedPathRef.current = [];
    latestPositionRef.current = null;
    routeWatchRef.current = createRouteWatchState();
  }

  function cleanupRide() {
    clearLocationWatch();
    clearMapObjects();
  }

  useEffect(() => {
    return () => {
      const geolocation = browserNavigator()?.geolocation;
      if (watchIdRef.current !== null && geolocation?.clearWatch) {
        geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
      if (etaTimerRef.current) clearInterval(etaTimerRef.current);
      etaTimerRef.current = null;
      routePolylinesRef.current.forEach((polyline) => polyline?.setMap?.(null));
      routePolylinesRef.current = [];
      currentCircleRef.current?.setMap?.(null);
      destinationCircleRef.current?.setMap?.(null);
      currentCircleRef.current = null;
      destinationCircleRef.current = null;
      mapRef.current = null;
      googleMapsRef.current = null;
      expectedPathRef.current = [];
      latestPositionRef.current = null;
      routeWatchRef.current = createRouteWatchState();
    };
  }, []);

  function renderCurrentPosition(position) {
    const googleMaps = googleMapsRef.current;
    const map = mapRef.current;
    if (!googleMaps || !map) return;
    const center = mapLatLng(position);
    const radius = Math.max(12, Math.min(position.accuracy ?? 20, 100));

    if (!currentCircleRef.current) {
      currentCircleRef.current = new googleMaps.Circle({
        map,
        center,
        radius,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillOpacity: 0.25,
      });
    } else {
      currentCircleRef.current.setCenter(center);
      currentCircleRef.current.setRadius(radius);
    }
  }

  function handlePositionUpdate(browserPosition) {
    const position = normalizePosition(browserPosition);
    if (!position || expectedPathRef.current.length < 2) return;
    latestPositionRef.current = position;
    renderCurrentPosition(position);

    const previous = routeWatchRef.current;
    const next = evaluateRoutePosition({
      position,
      accuracyMeters: position.accuracy,
      routePath: expectedPathRef.current,
      previousState: previous,
      nowMs: Date.now(),
    });
    routeWatchRef.current = next;
    setWatchState(next);

    if (next.status === 'deviated' && previous.status !== 'deviated') {
      browserNavigator()?.vibrate?.([180, 100, 180]);
    }
  }

  function handlePositionError() {
    const reset = {
      ...createRouteWatchState(),
      status: 'low-accuracy',
    };
    routeWatchRef.current = reset;
    setWatchState(reset);
  }

  async function refreshEta() {
    const googleMaps = googleMapsRef.current;
    const position = latestPositionRef.current;
    if (!googleMaps || !position || etaRefreshInFlightRef.current) return;

    etaRefreshInFlightRef.current = true;
    try {
      const route = await computeRoute(googleMaps, position, destination, false);
      if (route) {
        setRouteMetrics({
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
        });
      }
    } catch {
      // A failed ETA refresh must not stop the independent route-deviation watch.
    } finally {
      etaRefreshInFlightRef.current = false;
    }
  }

  async function replaceExpectedRoute(position) {
    const googleMaps = googleMapsRef.current;
    const map = mapRef.current;
    if (!googleMaps || !map) throw new Error('Map is not ready.');

    const route = await computeRoute(googleMaps, position, destination, true);
    if (!route || route.path.length < 2) throw new Error('No usable route was returned.');

    routePolylinesRef.current.forEach((polyline) => polyline?.setMap?.(null));
    routePolylinesRef.current = route.raw.createPolylines();
    routePolylinesRef.current.forEach((polyline) => polyline.setMap(map));
    if (route.raw.viewport) map.fitBounds(route.raw.viewport, 48);

    expectedPathRef.current = route.path;
    routeWatchRef.current = createRouteWatchState();
    setWatchState(routeWatchRef.current);
    setRouteMetrics({
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
    });
  }

  async function startRide() {
    if (!configured) {
      setStatus('not-configured');
      return;
    }

    const geolocation = browserNavigator()?.geolocation;
    if (!geolocation || !mapNodeRef.current) {
      setStatus('unavailable');
      return;
    }

    cleanupRide();
    setRouteMetrics(null);
    setWatchState(createRouteWatchState());
    setStatus('locating');

    try {
      const firstBrowserPosition = await getCurrentPosition(geolocation);
      const firstPosition = normalizePosition(firstBrowserPosition);
      if (!firstPosition) throw new Error('Invalid location.');
      latestPositionRef.current = firstPosition;
      setStatus('loading-map');

      const googleMaps = await loadGoogleMaps(googleMapsBrowserKey.trim(), locale);
      googleMapsRef.current = googleMaps;
      const { Map } = await googleMaps.importLibrary('maps');
      const map = new Map(mapNodeRef.current, {
        center: mapLatLng(firstPosition),
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      destinationCircleRef.current = new googleMaps.Circle({
        map,
        center: mapLatLng(destination),
        radius: 24,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillOpacity: 0.3,
      });
      renderCurrentPosition(firstPosition);
      await replaceExpectedRoute(firstPosition);
      handlePositionUpdate(firstBrowserPosition);

      watchIdRef.current = geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        GEOLOCATION_OPTIONS,
      );
      etaTimerRef.current = setInterval(() => void refreshEta(), ETA_REFRESH_MS);
      setStatus('active');
    } catch (error) {
      cleanupRide();
      const safeError = /** @type {any} */ (error);
      const denied = Number(safeError?.code) === 1;
      setStatus(denied ? 'denied' : 'unavailable');
    }
  }

  function stopRide() {
    cleanupRide();
    setRouteMetrics(null);
    setWatchState(createRouteWatchState());
    setStatus(configured ? 'idle' : 'not-configured');
  }

  async function resetExpectedRoute() {
    const position = latestPositionRef.current;
    if (!position) return;
    setStatus('loading-map');
    try {
      await replaceExpectedRoute(position);
      setStatus('active');
    } catch {
      setStatus('unavailable');
      clearLocationWatch();
    }
  }

  const routeStatusText =
    watchState.status === 'deviated'
      ? copy.deviated
      : watchState.status === 'checking'
        ? copy.checking
        : watchState.status === 'low-accuracy'
          ? copy.lowAccuracy
          : copy.onRoute;
  const active = status === 'active' || status === 'loading-map';

  return (
    <section className={styles.card} aria-labelledby="safe-ride-title">
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <ShieldCheck size={24} />
        </span>
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2 id="safe-ride-title">{copy.title}</h2>
          <p>{copy.intro}</p>
        </div>
      </header>

      {!configured ? <p className={styles.notice}>{copy.notConfigured}</p> : null}

      <div
        className={`${styles.map} ${active ? styles.mapVisible : ''}`}
        ref={mapNodeRef}
        aria-label={copy.google}
      />

      {status === 'locating' || status === 'loading-map' ? (
        <div className={styles.progress} role="status" aria-live="polite">
          <LoaderCircle className={styles.spin} size={20} aria-hidden="true" />
          {status === 'locating' ? copy.locating : copy.loadingMap}
        </div>
      ) : null}

      {status === 'denied' ? (
        <p className={styles.notice} role="alert">
          {copy.denied}
        </p>
      ) : null}
      {status === 'unavailable' ? (
        <p className={styles.notice} role="alert">
          {copy.unavailable}
        </p>
      ) : null}

      {status === 'active' ? (
        <div className={styles.livePanel}>
          <div className={styles.metrics}>
            <div>
              <span>{copy.eta}</span>
              <strong>
                {routeMetrics
                  ? `${numberFormatter.format(Math.max(1, Math.round(routeMetrics.durationSeconds / 60)))} ${copy.minutes}`
                  : '—'}
              </strong>
            </div>
            <div>
              <span>{copy.distance}</span>
              <strong>
                {routeMetrics ? formatDistance(numberFormatter, routeMetrics.distanceMeters) : '—'}
              </strong>
            </div>
          </div>

          <div
            className={`${styles.routeState} ${watchState.status === 'deviated' ? styles.routeAlert : ''}`}
            role={watchState.status === 'deviated' ? 'alert' : 'status'}
            aria-live={watchState.status === 'deviated' ? 'assertive' : 'polite'}
          >
            {watchState.status === 'deviated' ? (
              <AlertTriangle size={21} aria-hidden="true" />
            ) : (
              <Navigation size={21} aria-hidden="true" />
            )}
            <div>
              <strong>{copy.routeStatus}</strong>
              <p>{routeStatusText}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.actions}>
        {status === 'idle' || status === 'denied' || status === 'unavailable' ? (
          <button className="button button--accent" type="button" onClick={() => void startRide()}>
            <MapPinned size={17} aria-hidden="true" />
            {copy.start}
          </button>
        ) : null}
        {status === 'active' ? (
          <>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => void refreshEta()}
            >
              <RefreshCw size={17} aria-hidden="true" />
              {copy.refreshEta}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => void resetExpectedRoute()}
            >
              <Navigation size={17} aria-hidden="true" />
              {copy.resetRoute}
            </button>
            <button className="button button--secondary" type="button" onClick={stopRide}>
              {copy.stop}
            </button>
          </>
        ) : null}
      </div>

      <div className={styles.disclosure}>
        <p>{copy.keepOpen}</p>
        <p>{copy.privacy}</p>
        <p>{copy.advisory}</p>
      </div>
    </section>
  );
}
