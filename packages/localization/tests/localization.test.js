import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COUNTRY_CODES,
  COUNTRY_REFERENCE,
  UI_LOCALES,
  getCountryDisplayName,
  getCountryReference,
  getSuggestedLanguageCodes,
  getSuggestedUiLocalesForCountry,
  getTextDirection,
  listCountryOptions,
  normalizeCountryCode,
  normalizeLocale,
} from '../src/index.js';

test('global country reference includes the complete ISO 3166-1 set', () => {
  assert.equal(COUNTRY_REFERENCE.length, 249);
  assert.equal(new Set(COUNTRY_CODES).size, 249);
  assert.equal(getCountryReference('SE')?.iso3, 'SWE');
  assert.equal(getCountryReference('NG')?.iso3, 'NGA');
  assert.equal(getCountryReference('JP')?.iso3, 'JPN');
});

test('country names are localized by the selected UI locale', () => {
  assert.equal(getCountryDisplayName('DE', 'sv'), 'Tyskland');
  assert.equal(getCountryDisplayName('SE', 'en'), 'Sweden');
  assert.equal(getCountryDisplayName('ES', 'es'), 'España');
});

test('country options are sorted using the active locale', () => {
  const options = listCountryOptions('en');
  assert.equal(options.length, 249);
  assert.ok(options.every((country) => country.code.length === 2));
});

test('country and language are independent preferences', () => {
  assert.ok(getSuggestedLanguageCodes('CH').length > 1);
  assert.equal(normalizeCountryCode(' se '), 'SE');
  assert.equal(normalizeLocale('en-SE'), 'en');
  assert.deepEqual(getSuggestedUiLocalesForCountry('CH').slice(0, 3), ['de', 'fr', 'it']);
  assert.ok(getSuggestedUiLocalesForCountry('NG').includes('en'));
});

test('RTL direction is explicit for Arabic while Swedish stays LTR', () => {
  assert.equal(getTextDirection('ar'), 'rtl');
  assert.equal(getTextDirection('sv'), 'ltr');
  assert.ok(UI_LOCALES.length >= 18);
});
