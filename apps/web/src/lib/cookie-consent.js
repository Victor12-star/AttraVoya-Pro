const CONSENT_STORAGE_KEY = 'attravoya_consent_v1';
export const COOKIE_CONSENT_VERSION = 1;

const DEFAULT_CONSENT = Object.freeze({
  version: COOKIE_CONSENT_VERSION,
  essential: true,
  preferences: false,
  analytics: false,
  decidedAt: null,
});

function normalizeConsent(value = {}) {
  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    preferences: value.preferences === true,
    analytics: value.analytics === true,
    decidedAt: typeof value.decidedAt === 'string' ? value.decidedAt : null,
  };
}

export function readCookieConsent() {
  if (typeof window === 'undefined') return { ...DEFAULT_CONSENT };

  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}');
    if (parsed.version !== COOKIE_CONSENT_VERSION) return { ...DEFAULT_CONSENT };
    return normalizeConsent(parsed);
  } catch {
    return { ...DEFAULT_CONSENT };
  }
}

export function saveCookieConsent(update) {
  if (typeof window === 'undefined') return { ...DEFAULT_CONSENT };
  const next = normalizeConsent({
    ...readCookieConsent(),
    ...update,
    decidedAt: new Date().toISOString(),
  });
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function acceptAllOptionalCookies() {
  return saveCookieConsent({ preferences: true, analytics: true });
}

export function rejectNonEssentialCookies() {
  return saveCookieConsent({ preferences: false, analytics: false });
}

export function isPreferenceStorageAllowed() {
  return readCookieConsent().preferences;
}

export function isAnalyticsAllowed() {
  return readCookieConsent().analytics;
}
