import { DEFAULT_UI_LOCALE, normalizeLocale } from '@attravoya/localization';

export const LOCALE_PREFERENCE_COOKIE = 'attravoya_locale';
export const LOCALE_PREFERENCE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Mirror only the non-sensitive locale preference into a small cookie so the
 * server can choose the correct language before React renders. Authentication
 * tokens use separate HttpOnly cookies and must never be handled here.
 */
export function writeLocalePreferenceCookie(locale) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeLocale(locale || DEFAULT_UI_LOCALE);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LOCALE_PREFERENCE_COOKIE}=${encodeURIComponent(normalized)}; Path=/; Max-Age=${LOCALE_PREFERENCE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
