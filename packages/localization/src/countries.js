import { COUNTRY_REFERENCE } from './country-reference.js';
import { DEFAULT_UI_LOCALE, UI_LOCALES, normalizeLocale } from './locales.js';

const COUNTRY_BY_ISO2 = new Map(COUNTRY_REFERENCE.map((country) => [country.iso2, country]));

export const COUNTRY_CODES = Object.freeze(COUNTRY_REFERENCE.map((country) => country.iso2));

export function normalizeCountryCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return COUNTRY_BY_ISO2.has(code) ? code : null;
}

export function isKnownCountryCode(value) {
  return normalizeCountryCode(value) !== null;
}

export function getCountryReference(value) {
  const code = normalizeCountryCode(value);
  return code ? (COUNTRY_BY_ISO2.get(code) ?? null) : null;
}

export function getCountryDisplayName(countryCode, locale = DEFAULT_UI_LOCALE) {
  const country = getCountryReference(countryCode);
  if (!country) return null;

  try {
    const displayNames = new Intl.DisplayNames([normalizeLocale(locale)], { type: 'region' });
    return displayNames.of(country.iso2) ?? country.name;
  } catch {
    // Intl data can vary in constrained runtimes. ISO English name is a safe
    // fallback and is preferable to breaking a country selector.
    return country.name;
  }
}

export function listCountryOptions(locale = DEFAULT_UI_LOCALE) {
  const normalizedLocale = normalizeLocale(locale);

  return COUNTRY_REFERENCE.map((country) => ({
    code: country.iso2,
    iso3: country.iso3,
    name: getCountryDisplayName(country.iso2, normalizedLocale) ?? country.name ?? country.iso2,
    currencyCodes: [...country.currencyCodes],
    languageCodes: [...country.languageCodes],
  })).sort((left, right) =>
    left.name.localeCompare(right.name, normalizedLocale, { sensitivity: 'base' }),
  );
}

export function getSuggestedLanguageCodes(countryCode) {
  const country = getCountryReference(countryCode);
  return country ? [...country.languageCodes] : [];
}

export function getSuggestedUiLocalesForCountry(countryCode) {
  const supported = new Set(UI_LOCALES.map(({ code }) => code));
  const suggestions = getSuggestedLanguageCodes(countryCode)
    .map((code) => code.split('-')[0])
    .filter((code, index, all) => supported.has(code) && all.indexOf(code) === index);

  // English remains a convenient fallback suggestion, but country selection
  // never forces it or any other language on the traveller.
  if (!suggestions.includes(DEFAULT_UI_LOCALE)) suggestions.push(DEFAULT_UI_LOCALE);
  return suggestions;
}
