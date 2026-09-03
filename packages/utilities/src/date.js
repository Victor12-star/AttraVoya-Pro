/**
 * Date utilities (environment-neutral).
 */

/**
 * Format a Date as an ISO-8601 date string (yyyy-mm-dd) in local time.
 * @param {Date | string | number} input Date, ISO string, or timestamp.
 * @returns {string} yyyy-mm-dd, or '' on invalid input.
 */
export function toISODate(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add a number of days to a date.
 * @param {Date | string} input Base date.
 * @param {number} days Days to add (can be negative).
 * @returns {Date} New date.
 */
export function addDays(input, days) {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Number of whole days between two dates (end - start).
 * @param {Date | string} start Start date.
 * @param {Date | string} end End date.
 * @returns {number} Whole days between, or 0 when invalid.
 */
export function daysBetween(start, end) {
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}
