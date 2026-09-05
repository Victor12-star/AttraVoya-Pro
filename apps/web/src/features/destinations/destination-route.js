const DESTINATION_CHILD_SEGMENTS = new Set([
  'airports',
  'attractions',
  'beaches',
  'currency',
  'events',
  'family',
  'hospitals',
  'language',
  'museums',
  'news',
  'restaurants',
  'safety',
  'shopping',
  'transport',
]);

/**
 * @typedef {object} DestinationSelection
 * @property {string|null|undefined} [provider]
 * @property {string|null|undefined} [externalId]
 * @property {string} name
 * @property {string|null|undefined} [state]
 * @property {string} countryCode
 * @property {number} latitude
 * @property {number} longitude
 * @property {string|null|undefined} [timeZone]
 */

/**
 * @typedef {DestinationSelection & {
 *   provider: string,
 *   externalId: string|null,
 *   state: string|null,
 *   timeZone: string|null,
 *   slug: string
 * }} ParsedDestinationSelection
 */

/** @typedef {URLSearchParams|Record<string, string|string[]|undefined>|null|undefined} DestinationSearchParams */

/** @param {unknown} value */
function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * @param {DestinationSearchParams} searchParams
 * @param {string} key
 */
function queryValue(searchParams, key) {
  if (searchParams instanceof URLSearchParams) return searchParams.get(key);
  return firstQueryValue(searchParams?.[key]);
}

/**
 * @param {unknown} value
 * @param {number} maxLength
 */
function optionalString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

/** @param {unknown} value */
function slugSegment(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/**
 * @param {unknown} value
 * @param {number} minimum
 * @param {number} maximum
 */
function finiteCoordinate(value, minimum, maximum) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

/** @param {number} value */
function routeCoordinate(value) {
  return String(Number(Number(value).toFixed(6)));
}

/** @param {DestinationSelection} destination */
function destinationSelectionParams(destination) {
  const params = new URLSearchParams();
  const provider = optionalString(destination.provider, 40);
  const externalId = optionalString(destination.externalId, 240);
  const state = optionalString(destination.state, 120);
  const timeZone = optionalString(destination.timeZone, 64);

  params.set('name', destination.name.trim());
  params.set('country', destination.countryCode.trim().toUpperCase());
  params.set('lat', routeCoordinate(destination.latitude));
  params.set('lng', routeCoordinate(destination.longitude));
  if (provider) params.set('source', provider);
  if (externalId) params.set('id', externalId);
  if (state) params.set('state', state);
  if (timeZone) params.set('tz', timeZone);
  return params;
}

/**
 * Build the stable, human-readable route segment used for a destination selection.
 * @param {{name?: unknown, countryCode?: unknown}|null|undefined} destination
 */
export function createDestinationSlug(destination) {
  const name = slugSegment(destination?.name);
  const countryCode = slugSegment(destination?.countryCode);
  return [name, countryCode].filter(Boolean).join('-') || 'destination';
}

/**
 * Turn one normalized provider result into a shareable destination URL.
 * Provider secrets are never included; only the public selection contract is carried forward.
 * @param {DestinationSelection} destination
 */
export function buildDestinationHref(destination) {
  const name = optionalString(destination?.name, 120);
  const countryCode = optionalString(destination?.countryCode, 2)?.toUpperCase();
  const latitude = finiteCoordinate(destination?.latitude, -90, 90);
  const longitude = finiteCoordinate(destination?.longitude, -180, 180);

  if (
    !name ||
    !countryCode ||
    !/^[A-Z]{2}$/.test(countryCode) ||
    latitude === null ||
    longitude === null
  ) {
    throw new TypeError('A destination route requires a valid name, country code and coordinates.');
  }

  const normalizedDestination = { ...destination, name, countryCode, latitude, longitude };
  const slug = createDestinationSlug(normalizedDestination);
  return `/destinations/${encodeURIComponent(slug)}?${destinationSelectionParams(normalizedDestination)}`;
}

/**
 * @param {DestinationSelection} destination
 * @param {string} childSegment
 */
export function buildDestinationChildHref(destination, childSegment) {
  if (!DESTINATION_CHILD_SEGMENTS.has(childSegment)) {
    throw new TypeError(`Unsupported destination child route: ${childSegment}`);
  }

  const href = buildDestinationHref(destination);
  const [pathname, query = ''] = href.split('?');
  return `${pathname}/${childSegment}${query ? `?${query}` : ''}`;
}

/**
 * @param {string} path
 * @param {DestinationSelection} destination
 */
export function buildDestinationContextHref(path, destination) {
  if (!/^\/[a-z0-9/-]+$/i.test(path)) {
    throw new TypeError('Destination context paths must be internal application paths.');
  }

  const params = destinationSelectionParams(destination);
  params.set('destination', destination.name.trim());
  return `${path}?${params}`;
}

/**
 * Validate destination state reconstructed from a shareable URL.
 * A mismatched slug or malformed coordinate is rejected instead of being rendered as provider data.
 * @param {{slug: unknown, searchParams: DestinationSearchParams}} input
 * @returns {ParsedDestinationSelection|null}
 */
export function parseDestinationSelection({ slug, searchParams }) {
  const name = optionalString(queryValue(searchParams, 'name'), 120);
  const countryCode = optionalString(queryValue(searchParams, 'country'), 2)?.toUpperCase();
  const latitude = finiteCoordinate(queryValue(searchParams, 'lat'), -90, 90);
  const longitude = finiteCoordinate(queryValue(searchParams, 'lng'), -180, 180);

  if (
    !name ||
    !countryCode ||
    !/^[A-Z]{2}$/.test(countryCode) ||
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  const destination = {
    provider: optionalString(queryValue(searchParams, 'source'), 40) ?? 'unknown',
    externalId: optionalString(queryValue(searchParams, 'id'), 240),
    name,
    state: optionalString(queryValue(searchParams, 'state'), 120),
    countryCode,
    latitude,
    longitude,
    timeZone: optionalString(queryValue(searchParams, 'tz'), 64),
  };

  const expectedSlug = createDestinationSlug(destination);
  if (String(slug ?? '') !== expectedSlug) return null;

  return { ...destination, slug: expectedSlug };
}
