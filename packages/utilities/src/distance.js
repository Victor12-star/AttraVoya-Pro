/**
 * Distance utilities (environment-neutral). Uses the haversine formula
 * for great-circle distance between WGS84 coordinates.
 */

const EARTH_RADIUS_KM = 6371;

/** Convert degrees to radians. */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two points, in kilometres.
 * @param {number} lat1 Latitude of point 1.
 * @param {number} lon1 Longitude of point 1.
 * @param {number} lat2 Latitude of point 2.
 * @param {number} lon2 Longitude of point 2.
 * @returns {number} Distance in kilometres (0 on invalid input).
 */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const args = [lat1, lon1, lat2, lon2];
  if (args.some((n) => typeof n !== 'number' || Number.isNaN(n))) return 0;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}

/**
 * Convert kilometres to miles.
 * @param {number} km Distance in kilometres.
 * @returns {number} Distance in miles.
 */
export function kmToMiles(km) {
  if (typeof km !== 'number' || Number.isNaN(km)) return 0;
  return Math.round(km * 0.621371 * 100) / 100;
}

/**
 * Human-readable distance string.
 * @param {number} km Distance in kilometres.
 * @param {'km' | 'mi'} [unit] Preferred unit.
 * @returns {string} e.g. "1.5 km" or "0.9 mi".
 */
export function formatDistance(km, unit = 'km') {
  if (unit === 'mi') return `${kmToMiles(km)} mi`;
  return `${km} km`;
}
