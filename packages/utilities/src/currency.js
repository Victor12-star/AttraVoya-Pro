/**
 * Currency utilities (environment-neutral — no network access).
 * Uses Intl.NumberFormat for locale-correct formatting; safe in Node and React Native.
 */

/** @type {Intl.NumberFormat | null} */
let sharedFormat = null;

/**
 * Format a monetary amount.
 * @param {number} amount Amount in minor units is NOT assumed — pass the decimal value.
 * @param {string} currency ISO 4217 currency code (e.g. "USD", "EUR", "SEK").
 * @param {string} [locale] BCP-47 locale (defaults to "en-US").
 * @returns {string} Locale-formatted currency string, or a plain fallback on failure.
 */
export function formatCurrency(amount, currency, locale = 'en-US') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to a plain decimal representation.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Parse a decimal string into a number, tolerating commas and currency symbols.
 * @param {string} input e.g. "1,234.56" or "$99.99".
 * @returns {number | null} Parsed number or null when unparseable.
 */
export function parseAmount(input) {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/,/g, '') : cleaned;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Convert an amount between currencies using a provided rate.
 * @param {number} amount Amount in the source currency.
 * @param {number} rate Units of target currency per 1 unit of source.
 * @returns {number} Converted amount, rounded to 2 decimals.
 */
export function convertAmount(amount, rate) {
  if (typeof amount !== 'number' || typeof rate !== 'number') return 0;
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0;
  return Math.round(amount * rate * 100) / 100;
}

/** Cache a single NumberFormat for a given currency+locale pair. */
export function getCurrencyFormatter(currency, locale = 'en-US') {
  sharedFormat = new Intl.NumberFormat(locale, { style: 'currency', currency });
  return sharedFormat;
}
