import { createDestinationSlug, parseDestinationSelection } from './destination-route.js';

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
 * Reconstruct a destination carried into a top-level feature route such as
 * /accommodation or /nearby. The shared destination parser still validates the
 * country and coordinates; the redundant destination label is rejected when it
 * disagrees with the normalized name.
 * @param {DestinationSearchParams} searchParams
 */
export function parseDestinationContext(searchParams) {
  const name = queryValue(searchParams, 'name');
  const countryCode = queryValue(searchParams, 'country');
  const slug = createDestinationSlug({ name, countryCode });
  const destination = parseDestinationSelection({ slug, searchParams });
  if (!destination) return null;

  const contextLabel = queryValue(searchParams, 'destination');
  if (
    typeof contextLabel === 'string' &&
    contextLabel.trim() &&
    contextLabel.trim() !== destination.name
  ) {
    return null;
  }

  return destination;
}
