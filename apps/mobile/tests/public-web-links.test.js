import { describe, expect, it } from '@jest/globals';

import {
  buildConfiguredPublicWebPageUrl,
  normalizePublicWebBaseUrl,
} from '../src/services/public-web-links.js';

const PUBLIC_BASE_URL = 'https://attravoya.example';
const PRODUCTION_OPTIONS = { allowInsecure: false };

describe('mobile public web links', () => {
  it('normalizes a secure public web base URL', () => {
    const normalized = normalizePublicWebBaseUrl(`${PUBLIC_BASE_URL}/`);

    expect(normalized).toBe(PUBLIC_BASE_URL);
  });

  it('rejects insecure production-style public web configuration', () => {
    const invalidValues = [
      '',
      'not-a-url',
      'ftp://attravoya.example',
      'http://attravoya.example',
      'https://user:password@attravoya.example',
      'https://attravoya.example?source=mobile',
      'https://attravoya.example#privacy',
    ];

    for (const value of invalidValues) {
      expect(() => normalizePublicWebBaseUrl(value, PRODUCTION_OPTIONS)).toThrow(
        'mobile public web configuration',
      );
    }
  });

  it('allows localhost only when insecure development links are explicitly allowed', () => {
    const normalized = normalizePublicWebBaseUrl('http://localhost:3000', {
      allowInsecure: true,
    });

    expect(normalized).toBe('http://localhost:3000');
  });

  it('builds only the approved public legal pages', () => {
    const expoConfig = { extra: { webBaseUrl: PUBLIC_BASE_URL } };
    const privacyUrl = buildConfiguredPublicWebPageUrl(
      '/privacy',
      expoConfig,
      PRODUCTION_OPTIONS,
    );
    const termsUrl = buildConfiguredPublicWebPageUrl('/terms', expoConfig, PRODUCTION_OPTIONS);

    expect(privacyUrl).toBe(`${PUBLIC_BASE_URL}/privacy`);
    expect(termsUrl).toBe(`${PUBLIC_BASE_URL}/terms`);
    expect(() =>
      buildConfiguredPublicWebPageUrl('/admin', expoConfig, PRODUCTION_OPTIONS),
    ).toThrow('mobile public web configuration');
  });
});
