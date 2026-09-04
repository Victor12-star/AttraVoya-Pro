import { describe, expect, it } from 'vitest';
import { UI_LOCALES } from '@attravoya/localization';

import { getAuthRecoveryMessageMap } from '../../src/i18n/auth-recovery-messages.js';

describe('authentication recovery translations', () => {
  it('covers every supported UI locale with the same non-empty message keys', () => {
    const map = getAuthRecoveryMessageMap();
    const sourceKeys = Object.keys(map.en).sort();

    expect(Object.keys(map).sort()).toEqual(UI_LOCALES.map(({ code }) => code).sort());

    for (const { code } of UI_LOCALES) {
      expect(Object.keys(map[code]).sort()).toEqual(sourceKeys);
      for (const key of sourceKeys) {
        expect(String(map[code][key]).trim().length).toBeGreaterThan(0);
      }
    }
  });
});
