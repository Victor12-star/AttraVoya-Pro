export const DEFAULT_UI_LOCALE = 'en';

// UI locales are intentionally separate from the list of languages spoken in
// a country. A traveller in Sweden, for example, may still prefer English.
export const UI_LOCALES = Object.freeze([
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', direction: 'ltr' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', direction: 'ltr' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
]);

const UI_LOCALE_MAP = new Map(UI_LOCALES.map((locale) => [locale.code, locale]));
const FALLBACK_UI_LOCALE = UI_LOCALE_MAP.get(DEFAULT_UI_LOCALE) ?? UI_LOCALES[0];

export function normalizeLocale(value) {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_UI_LOCALE;
  const normalized = value.trim().replace('_', '-').toLowerCase();
  const baseLanguage = normalized.split('-')[0] ?? DEFAULT_UI_LOCALE;
  return UI_LOCALE_MAP.has(normalized)
    ? normalized
    : UI_LOCALE_MAP.has(baseLanguage)
      ? baseLanguage
      : DEFAULT_UI_LOCALE;
}

export function isSupportedUiLocale(value) {
  return UI_LOCALE_MAP.has(normalizeLocale(value)) && normalizeLocale(value) === String(value).trim().replace('_', '-').toLowerCase().split('-')[0];
}

export function getUiLocale(value) {
  return UI_LOCALE_MAP.get(normalizeLocale(value)) ?? FALLBACK_UI_LOCALE;
}

export function getTextDirection(locale) {
  return getUiLocale(locale)?.direction ?? 'ltr';
}
