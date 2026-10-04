import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '../../src/app/robots.js';
import sitemap from '../../src/app/sitemap.js';
import { resolvePublicSiteUrl } from '../../src/lib/public-site-url.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('public site URL', () => {
  it('prefers the documented NEXT_PUBLIC_SITE_URL over compatibility fallbacks', () => {
    expect(
      resolvePublicSiteUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://www.attravoya.app',
        NEXT_PUBLIC_WEB_URL: 'https://legacy-public.attravoya.app',
        WEB_URL: 'https://legacy-server.attravoya.app',
      }),
    ).toBe('https://www.attravoya.app');
  });

  it('keeps the localhost fallback outside production', () => {
    expect(resolvePublicSiteUrl({ NODE_ENV: 'test' })).toBe('http://localhost:3000');
  });

  it('fails closed when production has no configured public site URL', () => {
    expect(() => resolvePublicSiteUrl({ NODE_ENV: 'production' })).toThrow(
      'NEXT_PUBLIC_SITE_URL is required in production.',
    );
  });

  it('rejects insecure and local production origins', () => {
    expect(() =>
      resolvePublicSiteUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'http://attravoya.app',
      }),
    ).toThrow('Public site URL must use HTTPS in production.');

    expect(() =>
      resolvePublicSiteUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://localhost',
      }),
    ).toThrow('Public site URL must not use a local hostname in production.');
  });

  it(
    'rejects reserved placeholder production hostnames outside the explicit CI exception',
    () => {
      for (const value of [
        'https://attravoya.example',
        'https://attravoya.test',
        'https://attravoya.invalid',
        'https://example.com',
      ]) {
        expect(() =>
          resolvePublicSiteUrl({
            NODE_ENV: 'production',
            NEXT_PUBLIC_SITE_URL: value,
          }),
        ).toThrow(
          'Public site URL must not use a reserved placeholder hostname in production.',
        );
      }
    },
  );

  it(
    'allows only the reserved .invalid CI metadata origin behind the explicit CI flag',
    () => {
      expect(
      resolvePublicSiteUrl({
        NODE_ENV: 'production',
        CI: 'true',
        ATTRAVOYA_CI_ALLOW_RESERVED_SITE_URL: 'true',
        NEXT_PUBLIC_SITE_URL: 'https://web.ci.attravoya.invalid',
      }),
    ).toBe('https://web.ci.attravoya.invalid');

    expect(() =>
      resolvePublicSiteUrl({
        NODE_ENV: 'production',
        CI: 'true',
        ATTRAVOYA_CI_ALLOW_RESERVED_SITE_URL: 'true',
        NEXT_PUBLIC_SITE_URL: 'https://attravoya.example',
      }),
      ).toThrow(
        'Public site URL must not use a reserved placeholder hostname in production.',
      );
    },
  );

  it('rejects credentials, paths, query strings, and fragments', () => {
    for (const value of [
      'https://user:password@attravoya.app',
      'https://attravoya.app/app',
      'https://attravoya.app?source=test',
      'https://attravoya.app#privacy',
    ]) {
      expect(() =>
        resolvePublicSiteUrl({
          NODE_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: value,
        }),
      ).toThrow();
    }
  });

  it('uses the canonical production origin for sitemap and robots metadata', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.attravoya.app');
    vi.stubEnv('NEXT_PUBLIC_WEB_URL', 'https://legacy-public.attravoya.app');
    vi.stubEnv('WEB_URL', 'https://legacy-server.attravoya.app');

    expect(sitemap().find(({ url }) => url.endsWith('/privacy'))?.url).toBe(
      'https://www.attravoya.app/privacy',
    );
    expect(robots().sitemap).toBe('https://www.attravoya.app/sitemap.xml');
  });
});
