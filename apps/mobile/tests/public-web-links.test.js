import { describe, expect, it } from '@jest/globals';

import {
  buildConfiguredPublicWebPageUrl,
  normalizePublicWebBaseUrl,
} from '../src/services/public-web-links.js';

describe('mobile public web links', () => {
  it('normalizes a secure public web base URL', () => {
    expect(normalizePublicWebBaseUrl('https://attravoya.example/')).toBe(
      'https://attravoya.example',
    );
  });

  it('rejects insecure production-style public web configuration', () => {
    for (const value of [
      '',
      'not-a-url',
      'ftp://attravoya.example',
      'http://attravoya.example',
      'https://user:password@attravoya.example',
      'https://attravoya.example?source=mobile',
      'https://attravoya.example#privacy',
    ]) {
      expect(() => normalizePublicWebBaseUrl(value, { allowInsecure: false })).toThrow(
        'mobile public web configuration',
      );
    }
  });

  it('allows localhost only when insecure development links are explicitly allowed', () => {
    expect(
      normalizePublicWebBaseUrl('http://localhost:3000', { allowInsecure: true }),
    ).toBe('http://localhost:3000');
  });

  it('builds only the approved public legal pages', () => {
    const expoConfig = { extra: { webBaseUrl: 'https://attravoya.example' } };

    expect(
      buildConfiguredPublicWebPageUrl('/privacy', expoConfig, { allowInsecure: false }),
    ).toBe('https://attravoya.example/privacy');
    expect(
      buildConfiguredPublicWebPageUrl('/terms', expoConfig, { allowInsecure: false }),
    ).toBe('https://attravoya.example/terms');
    expect(() =>
      buildConfiguredPublicWebPageUrl('/admin', expoConfig, { allowInsecure: false }),
    ).toThrow('mobile public web configuration');
  });
});
