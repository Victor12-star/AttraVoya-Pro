import { UI_LOCALES } from '@attravoya/localization';
import { describe, expect, it } from 'vitest';

import { getSubscriptionStatusCopy } from '../../src/features/subscriptions/subscription-status-copy.js';

describe('subscription status copy', () => {
  it('keeps complete localized copy for every maintained UI locale', () => {
    const englishKeys = Object.keys(getSubscriptionStatusCopy('en')).sort();

    expect(UI_LOCALES).toHaveLength(18);

    for (const locale of UI_LOCALES) {
      const copy = getSubscriptionStatusCopy(locale.code);
      expect(Object.keys(copy).sort()).toEqual(englishKeys);
      for (const value of Object.values(copy)) {
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('normalizes regional locale variants and unknown locales safely', () => {
    expect(getSubscriptionStatusCopy('sv-SE')).toEqual(getSubscriptionStatusCopy('sv'));
    expect(getSubscriptionStatusCopy('unknown')).toEqual(getSubscriptionStatusCopy('en'));
  });
});
