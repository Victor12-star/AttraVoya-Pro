const EARTH_RADIUS_METERS = 6_371_000;

/** @typedef {'idle'|'unavailable'|'low-accuracy'|'on-route'|'checking'|'deviated'} RouteWatchStatus */
/**
 * @typedef {object} RouteWatchState
 * @property {string} status
 * @property {number|null} offRouteSince
 * @property {number} offRouteSamples
 * @property {number|null} distanceFromRouteMeters
 */

export const SAFE_RIDE_DEFAULTS = Object.freeze({
  corridorMeters: 120,
  poorAccuracyMeters: 100,
  sustainMs: 20_000,
  minimumOffRouteSamples: 3,
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function validPoint(value) {
  const latitude = finiteNumber(value?.latitude ?? value?.lat);
  const longitude = finiteNumber(value?.longitude ?? value?.lng);
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
  return { latitude, longitude };
}

export function distanceBetweenMeters(left, right) {
  const a = validPoint(left);
  const b = validPoint(right);
  if (!a || !b) return null;

  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function pointToSegmentMeters(point, start, end) {
  const referenceLatitude = toRadians(point.latitude);
  const project = (candidate) => ({
    x:
      EARTH_RADIUS_METERS *
      toRadians(candidate.longitude - point.longitude) *
      Math.cos(referenceLatitude),
    y: EARTH_RADIUS_METERS * toRadians(candidate.latitude - point.latitude),
  });

  const a = project(start);
  const b = project(end);
  const segmentX = b.x - a.x;
  const segmentY = b.y - a.y;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;
  if (segmentLengthSquared === 0) return Math.hypot(a.x, a.y);

  const projection = Math.max(
    0,
    Math.min(1, -(a.x * segmentX + a.y * segmentY) / segmentLengthSquared),
  );
  return Math.hypot(a.x + projection * segmentX, a.y + projection * segmentY);
}

export function distanceFromRouteMeters(position, routePath) {
  const point = validPoint(position);
  const path = (Array.isArray(routePath) ? routePath : []).map(validPoint).filter(Boolean);
  if (!point || path.length === 0) return null;
  if (path.length === 1) return distanceBetweenMeters(point, path[0]);

  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 1; index < path.length; index += 1) {
    minimum = Math.min(minimum, pointToSegmentMeters(point, path[index - 1], path[index]));
  }
  return Number.isFinite(minimum) ? minimum : null;
}

/**
 * Create a fresh route-watch state. The state shape is intentionally shared
 * by React refs and state as monitoring moves through several runtime statuses.
 * @param {RouteWatchStatus} [status]
 * @returns {Readonly<RouteWatchState>}
 */
export function createRouteWatchState(status = 'idle') {
  return Object.freeze({
    status,
    offRouteSince: null,
    offRouteSamples: 0,
    distanceFromRouteMeters: null,
  });
}

/** @returns {RouteWatchState} */
export function evaluateRoutePosition({
  position,
  accuracyMeters,
  routePath,
  previousState = createRouteWatchState(),
  nowMs = Date.now(),
  options = {},
}) {
  const configuration = { ...SAFE_RIDE_DEFAULTS, ...options };
  const accuracy = finiteNumber(accuracyMeters);
  const distance = distanceFromRouteMeters(position, routePath);

  if (distance === null) {
    return {
      status: 'unavailable',
      offRouteSince: null,
      offRouteSamples: 0,
      distanceFromRouteMeters: null,
    };
  }

  if (accuracy === null || accuracy < 0 || accuracy > configuration.poorAccuracyMeters) {
    return {
      status: 'low-accuracy',
      offRouteSince: null,
      offRouteSamples: 0,
      distanceFromRouteMeters: distance,
    };
  }

  const effectiveCorridor = configuration.corridorMeters + accuracy;
  if (distance <= effectiveCorridor) {
    return {
      status: 'on-route',
      offRouteSince: null,
      offRouteSamples: 0,
      distanceFromRouteMeters: distance,
    };
  }

  const offRouteSince = previousState.offRouteSince ?? nowMs;
  const offRouteSamples = Number(previousState.offRouteSamples ?? 0) + 1;
  const sustained = nowMs - offRouteSince >= configuration.sustainMs;
  const enoughSamples = offRouteSamples >= configuration.minimumOffRouteSamples;

  return {
    status: sustained && enoughSamples ? 'deviated' : 'checking',
    offRouteSince,
    offRouteSamples,
    distanceFromRouteMeters: distance,
  };
}
