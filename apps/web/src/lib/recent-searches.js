import { isPreferenceStorageAllowed } from './cookie-consent.js';

const STORAGE_KEY = 'attravoya_recent_searches_v1';
const MAX_RECENT_SEARCHES = 8;
const ALLOWED_TYPES = new Set(['DESTINATION', 'FLIGHT', 'ACCOMMODATION', 'BUDGET_TRIP']);

const CRITERIA_KEYS = Object.freeze({
  DESTINATION: ['query', 'countryCode', 'destinationId'],
  FLIGHT: ['origin', 'destination', 'departureDate', 'returnDate', 'travellers', 'cabinClass'],
  ACCOMMODATION: [
    'destinationId',
    'checkIn',
    'checkOut',
    'guests',
    'stayTypes',
    'maxTotalPrice',
    'currencyCode',
  ],
  BUDGET_TRIP: [
    'originLabel',
    'totalBudget',
    'currencyCode',
    'minNights',
    'maxNights',
    'adultCount',
    'childAges',
    'interests',
    'comfortLevel',
  ],
});

function safeParse(value) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizeCriteria(type, criteria) {
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) return {};
  const allowedKeys = CRITERIA_KEYS[type] ?? [];
  return Object.fromEntries(
    allowedKeys.filter((key) => Object.hasOwn(criteria, key)).map((key) => [key, criteria[key]]),
  );
}

/**
 * Guest recent searches are stored only after preference storage is accepted.
 * The criteria are allowlisted by search type so a future caller cannot
 * accidentally persist email addresses, raw coordinates, auth data or other
 * unrelated fields simply by putting them in an arbitrary object.
 */
export function getRecentSearches() {
  if (typeof window === 'undefined' || !isPreferenceStorageAllowed()) return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function rememberRecentSearch(search) {
  if (typeof window === 'undefined' || !isPreferenceStorageAllowed()) return [];
  if (!ALLOWED_TYPES.has(search?.type)) return getRecentSearches();

  const normalized = {
    id: search.id ?? crypto.randomUUID(),
    type: search.type,
    label: String(search.label ?? '')
      .trim()
      .slice(0, 200),
    criteria: sanitizeCriteria(search.type, search.criteria),
    lastUsedAt: new Date().toISOString(),
  };

  if (!normalized.label) return getRecentSearches();

  const current = getRecentSearches().filter((item) => {
    return !(item.type === normalized.type && item.label === normalized.label);
  });
  const next = [normalized, ...current].slice(0, MAX_RECENT_SEARCHES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeRecentSearch(id) {
  if (typeof window === 'undefined' || !isPreferenceStorageAllowed()) return [];
  const next = getRecentSearches().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
