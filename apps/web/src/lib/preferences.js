import {
  DEFAULT_UI_LOCALE,
  isKnownCountryCode,
  isKnownCurrencyCode,
  normalizeCurrencyCode,
  normalizeLocale,
} from '@attravoya/localization';

import { writeLocalePreferenceCookie } from '../i18n/locale-preference.js';

/**
 * Small browser preferences may be kept locally for fast repeat visits.
 * Do not use this module for authentication credentials, payment information,
 * passports, precise location history, or other sensitive data.
 */
const STORAGE_KEY = 'attravoya_preferences_v1';

const DEFAULT_PREFERENCES = Object.freeze({
  language: DEFAULT_UI_LOCALE,
  currency: null,
  country: null,
  theme: 'system',
});

const ALLOWED_THEMES = new Set(['light', 'dark', 'system']);

function sanitizePreferences(value = {}) {
  const language = normalizeLocale(value.language);
  const country = isKnownCountryCode(value.country) ? value.country.toUpperCase() : null;
  const normalizedCurrency = normalizeCurrencyCode(value.currency);
  const currency = isKnownCurrencyCode(normalizedCurrency) ? normalizedCurrency : null;
  const theme = ALLOWED_THEMES.has(value.theme) ? value.theme : 'system';

  return { language, country, currency, theme };
}

export function readPreferences() {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return sanitizePreferences({ ...DEFAULT_PREFERENCES, ...parsed });
  } catch {
    // Corrupt browser storage must never break the application shell.
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(update) {
  if (typeof window === 'undefined') return;

  const current = readPreferences();
  const next = sanitizePreferences({ ...current, ...update });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  // Only the locale needs a server-readable preference cookie. Recent searches
  // and other larger preference data stay out of cookies to avoid bloating every
  // HTTP request.
  if (update && Object.hasOwn(update, 'language')) {
    writeLocalePreferenceCookie(next.language);
  }
}

export function clearPreferences() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
