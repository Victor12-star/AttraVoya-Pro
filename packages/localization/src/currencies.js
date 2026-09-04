import { COUNTRY_REFERENCE } from './country-reference.js';
import { DEFAULT_UI_LOCALE, normalizeLocale } from './locales.js';

export const CURRENCY_CODES = Object.freeze(
  [...new Set(COUNTRY_REFERENCE.flatMap((country) => country.currencyCodes))].sort(),
);

const CURRENCY_CODE_SET = new Set(CURRENCY_CODES);

export function normalizeCurrencyCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export function isKnownCurrencyCode(value) {
  const code = normalizeCurrencyCode(value);
  return code ? CURRENCY_CODE_SET.has(code) : false;
}

export function getCurrencyDisplayName(currencyCode, locale = DEFAULT_UI_LOCALE) {
  const code = normalizeCurrencyCode(currencyCode);
  if (!code) return null;

  try {
    return new Intl.DisplayNames([normalizeLocale(locale)], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function getCurrencyMetadata(currencyCode, locale = DEFAULT_UI_LOCALE) {
  const code = normalizeCurrencyCode(currencyCode);
  if (!code) return null;

  try {
    const formatter = new Intl.NumberFormat(normalizeLocale(locale), {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    });
    const parts = formatter.formatToParts(0);
    const symbol = parts.find((part) => part.type === 'currency')?.value ?? code;
    const options = formatter.resolvedOptions();

    return {
      code,
      name: getCurrencyDisplayName(code, locale),
      symbol,
      decimalDigits: options.maximumFractionDigits,
    };
  } catch {
    return { code, name: code, symbol: code, decimalDigits: 2 };
  }
}
