import { beforeEach, describe, expect, it } from 'vitest';

import {
  acceptAllOptionalCookies,
  readCookieConsent,
  rejectNonEssentialCookies,
} from '../../src/lib/cookie-consent.js';
import { readPreferences, savePreferences } from '../../src/lib/preferences.js';
import {
  clearRecentSearches,
  getRecentSearches,
  rememberRecentSearch,
} from '../../src/lib/recent-searches.js';

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = 'attravoya_locale=; Max-Age=0; Path=/';
});

describe('browser preferences', () => {
  it('normalizes country, language, currency and theme values', () => {
    savePreferences({ language: 'sv-SE', country: 'se', currency: 'sek', theme: 'dark' });

    expect(readPreferences()).toEqual({
      language: 'sv',
      country: 'SE',
      currency: 'SEK',
      theme: 'dark',
    });
    expect(document.cookie).toContain('attravoya_locale=sv');
  });

  it('rejects unknown country/currency values instead of persisting arbitrary text', () => {
    savePreferences({ country: 'XX', currency: 'ZZZ', theme: 'neon' });

    expect(readPreferences()).toMatchObject({
      country: null,
      currency: null,
      theme: 'system',
    });
  });
});

describe('cookie consent and quick searches', () => {
  it('keeps optional storage off until the user chooses it', () => {
    expect(readCookieConsent()).toMatchObject({ preferences: false, analytics: false });
    expect(
      rememberRecentSearch({
        type: 'DESTINATION',
        label: 'Barcelona',
        criteria: { query: 'Barcelona' },
      }),
    ).toEqual([]);
  });

  it('stores only allowlisted recent-search criteria after preference consent', () => {
    acceptAllOptionalCookies();

    rememberRecentSearch({
      type: 'BUDGET_TRIP',
      label: 'Family trip from Stockholm',
      criteria: {
        originLabel: 'Stockholm',
        totalBudget: 20000,
        currencyCode: 'SEK',
        adultCount: 2,
        childAges: [5, 9],
        email: 'must-not-be-stored@example.com',
        accessToken: 'must-not-be-stored',
      },
    });

    const [search] = getRecentSearches();
    expect(search.criteria).toMatchObject({
      originLabel: 'Stockholm',
      totalBudget: 20000,
      currencyCode: 'SEK',
      adultCount: 2,
      childAges: [5, 9],
    });
    expect(search.criteria).not.toHaveProperty('email');
    expect(search.criteria).not.toHaveProperty('accessToken');

    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });

  it('stops optional storage when non-essential cookies are rejected', () => {
    acceptAllOptionalCookies();
    rejectNonEssentialCookies();
    expect(readCookieConsent()).toMatchObject({ preferences: false, analytics: false });
  });
});
