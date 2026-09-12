import { UI_LOCALES } from '@attravoya/localization';
import { describe, expect, it } from 'vitest';

import {
  getSessionSecurityCopy,
  SESSION_SECURITY_COPY_LOCALES,
} from '../../src/features/profile/session-security-copy.js';

const REQUIRED_KEYS = [
  'eyebrow',
  'title',
  'intro',
  'metadataNote',
  'loadError',
  'signInPrompt',
  'empty',
  'browserSession',
  'created',
  'lastUsed',
  'expires',
  'revoke',
  'revoking',
  'revokeSuccess',
  'revokeFailed',
  'revokeHint',
  'signOutAll',
  'signOutAllHint',
  'confirmAll',
  'confirmAllAction',
  'signingOut',
  'allFailed',
];

describe('session security copy', () => {
  it('provides complete dedicated copy for every supported UI locale', () => {
    expect([...SESSION_SECURITY_COPY_LOCALES].sort()).toEqual(
      UI_LOCALES.map((locale) => locale.code).sort(),
    );

    for (const { code } of UI_LOCALES) {
      const copy = getSessionSecurityCopy(code);
      for (const key of REQUIRED_KEYS) {
        expect(copy[key], `${code}.${key}`).toEqual(expect.any(String));
        expect(copy[key].trim().length, `${code}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('normalizes regional locale tags and falls back safely', () => {
    expect(getSessionSecurityCopy('sv-SE').title).toBe('Sessioner och enheter');
    expect(getSessionSecurityCopy('unsupported').title).toBe('Sessions & devices');
  });
});
