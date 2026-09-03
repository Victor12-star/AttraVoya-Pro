import { LANGUAGE_REFERENCE } from './language-reference.js';
import { DEFAULT_UI_LOCALE, normalizeLocale } from './locales.js';

const LANGUAGE_BY_CODE = new Map(LANGUAGE_REFERENCE.map((language) => [language.code, language]));

export function getLanguageReference(code) {
  if (typeof code !== 'string') return null;
  const normalized = code.trim().replace('_', '-');
  return LANGUAGE_BY_CODE.get(normalized) ?? LANGUAGE_BY_CODE.get(normalized.split('-')[0]) ?? null;
}

export function getLanguageDisplayName(languageCode, locale = DEFAULT_UI_LOCALE) {
  const reference = getLanguageReference(languageCode);
  if (!reference) return languageCode;

  try {
    const displayNames = new Intl.DisplayNames([normalizeLocale(locale)], { type: 'language' });
    return displayNames.of(reference.code) ?? reference.name;
  } catch {
    return reference.name;
  }
}

export function getLanguageNativeName(languageCode) {
  return getLanguageReference(languageCode)?.nativeName ?? languageCode;
}

export function getLanguageDirection(languageCode) {
  return getLanguageReference(languageCode)?.direction ?? 'ltr';
}
